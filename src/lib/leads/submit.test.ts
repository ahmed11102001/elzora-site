import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KEY, fakeStorage, validInput } from "./fixtures";
import { submitLead, type SubmitDeps } from "./submit";
import { StorageUnavailableError, type StoredLead } from "./types";
import type { TurnstileOutcome } from "./turnstile";
import { NOW } from "./fixtures";

function setup(
  opts: { captcha?: TurnstileOutcome; storage?: Parameters<typeof fakeStorage>[0] } = {},
) {
  const { storage, leads, calls } = fakeStorage(opts.storage);
  const notified: StoredLead[] = [];
  const captchaCalls: (string | undefined)[] = [];
  const deps: SubmitDeps = {
    storage,
    verifyTurnstile: async (token) => {
      captchaCalls.push(token);
      return opts.captcha ?? "ok";
    },
    notify: (lead) => notified.push(lead),
    now: () => NOW,
    log: () => {},
  };
  const send = (body: unknown) =>
    submitLead({ body, rateLimitKey: "k", remoteIp: "1.2.3.4" }, deps);
  return { send, leads, calls, notified, captchaCalls };
}

describe("lead submission", () => {
  it("persists a valid lead, returns a reference and notifies once", async () => {
    const t = setup();
    const res = await t.send(validInput());
    assert.equal(res.status, 201);
    assert.ok(res.body.ok && res.body.referenceCode.startsWith("EZ-"));
    assert.equal(t.leads.length, 1);
    assert.equal(t.notified.length, 1);
    assert.equal(t.leads[0].consentVersion.length > 0, true);
    assert.equal(t.leads[0].consentedAt.toISOString(), NOW.toISOString());
  });

  it("stores the trip the traveler came from", async () => {
    const t = setup();
    await t.send(validInput({ tripSlug: "classic-egypt-8-days" }));
    assert.equal(t.leads[0].tripSlug, "classic-egypt-8-days");
    const plain = setup();
    await plain.send(validInput());
    assert.equal(plain.leads[0].tripSlug, undefined);
  });

  it("preserves UTM attribution and locale", async () => {
    const t = setup();
    await t.send(validInput());
    const lead = t.leads[0];
    assert.equal(lead.utmSource, "google");
    assert.equal(lead.utmMedium, "cpc");
    assert.equal(lead.utmCampaign, "de-winter");
    assert.equal(lead.locale, "de");
    assert.equal(lead.budgetType, "per_person");
  });

  it("returns 422 with field errors for invalid data and stores nothing", async () => {
    const t = setup();
    const res = await t.send(validInput({ email: "x", consent: false }));
    assert.equal(res.status, 422);
    assert.ok(!res.body.ok && res.body.error === "validation");
    assert.equal(res.body.fieldErrors.email, "invalid_email");
    assert.equal(res.body.fieldErrors.consent, "consent_required");
    assert.equal(t.leads.length, 0);
  });

  it("rejects non-object bodies", async () => {
    const t = setup();
    for (const body of [null, "x", 5, [1]]) assert.equal((await t.send(body)).status, 400);
  });

  it("rejects honeypot submissions without storing or notifying", async () => {
    const t = setup();
    const res = await t.send({ ...validInput(), website: "http://spam.example" });
    assert.equal(res.status, 400);
    assert.equal(t.leads.length, 0);
    assert.equal(t.notified.length, 0);
    assert.equal(t.captchaCalls.length, 0);
  });

  it("returns 403 when Turnstile fails and 503 when it is unavailable", async () => {
    const failed = setup({ captcha: "failed" });
    assert.equal((await failed.send(validInput())).status, 403);
    assert.equal(failed.leads.length, 0);
    const unavailable = setup({ captcha: "unavailable" });
    assert.equal((await unavailable.send(validInput())).status, 503);
    assert.equal(unavailable.leads.length, 0);
  });

  it("passes the Turnstile token through", async () => {
    const t = setup();
    await t.send(validInput({ turnstileToken: "tok" }));
    assert.deepEqual(t.captchaCalls, ["tok"]);
  });

  it("rate limits with 429 and Retry-After information", async () => {
    const t = setup({ storage: { hit: async () => ({ allowed: false, retryAfterSeconds: 321 }) } });
    const res = await t.send(validInput());
    assert.equal(res.status, 429);
    assert.ok(
      !res.body.ok && res.body.error === "rate_limited" && res.body.retryAfterSeconds === 321,
    );
    assert.equal(t.leads.length, 0);
  });

  it("never reports success when the database fails", async () => {
    const t = setup({
      storage: {
        insert: async () => {
          throw new StorageUnavailableError();
        },
      },
    });
    const res = await t.send(validInput());
    assert.equal(res.status, 503);
    assert.ok(!res.body.ok && res.body.error === "storage_unavailable");
    assert.equal(t.notified.length, 0);
    assert.equal(JSON.stringify(res.body).includes("Postgres"), false);
  });

  it("maps unexpected errors to a safe 500", async () => {
    const t = setup({
      storage: {
        insert: async () => {
          throw new Error("password=secret at db.internal:5432");
        },
      },
    });
    const res = await t.send(validInput());
    assert.equal(res.status, 500);
    assert.equal(JSON.stringify(res.body).includes("secret"), false);
  });

  it("is idempotent: the same key returns the original reference, no new lead, no new email", async () => {
    const t = setup();
    const first = await t.send(validInput());
    const again = await t.send(validInput());
    assert.equal(again.status, 200);
    assert.ok(first.body.ok && again.body.ok);
    assert.equal(again.body.referenceCode, first.body.referenceCode);
    assert.equal(again.body.duplicate, true);
    assert.equal(t.leads.length, 1);
    assert.equal(t.notified.length, 1);
    assert.equal(t.captchaCalls.length, 1); // a retry does not need a second (single-use) token
  });

  it("treats the same inquiry with a new key as a duplicate", async () => {
    const t = setup();
    await t.send(validInput());
    const again = await t.send(
      validInput({ idempotencyKey: "0d9e1c3f-2b4a-4f6e-8a7b-1c2d3e4f5a6b", notes: "changed" }),
    );
    assert.equal(again.status, 200);
    assert.equal(t.leads.length, 1);
  });

  it("creates a new lead when the answers really differ", async () => {
    const t = setup();
    await t.send(validInput());
    await t.send(validInput({ idempotencyKey: "0d9e1c3f-2b4a-4f6e-8a7b-1c2d3e4f5a6b", adults: 3 }));
    assert.equal(t.leads.length, 2);
    assert.equal(KEY.length, 36);
  });
});
