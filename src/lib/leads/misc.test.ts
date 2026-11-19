import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { captureAttribution, mergeAttribution, readAttribution } from "./attribution";
import { renderTeamEmail, renderTravelerEmail, type TravelerEmailCopy } from "./emails";
import { fakeStorage, NOW, toNew, validInput } from "./fixtures";
import { notifyLead } from "./notifications";
import { createLeadSchema } from "./schema";
import { REFERENCE_PATTERN, generateReferenceCode } from "./reference";
import { rateLimitKey } from "./request-meta";
import { buildWhatsAppUrl } from "./whatsapp";
import { budgetLabel } from "./format";

const dict = (lang: string) =>
  JSON.parse(readFileSync(new URL(`../../i18n/${lang}.json`, import.meta.url), "utf8"));
const paths = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([k, v]) => paths(v, `${prefix}${k}.`))
    : [prefix];

describe("localization", () => {
  it("German planner copy is complete (same keys as English, nothing left in English)", () => {
    const en = dict("en").planner;
    const de = dict("de").planner;
    assert.deepEqual(paths(de).sort(), paths(en).sort());
    assert.notEqual(de.confirmation.title, en.confirmation.title);
    assert.notEqual(de.review.submit, en.review.submit);
    assert.deepEqual(Object.keys(de.errors).sort(), Object.keys(en.errors).sort());
  });
  it("formats budgets with the locale's currency style", () => {
    const t = dict("de").planner.budget.templates;
    assert.match(budgetLabel("1000-1500", "de", t), /1\.000\s?€.*1\.500\s?€/);
    assert.match(
      budgetLabel("1000-1500", "en", dict("en").planner.budget.templates),
      /€1,000.*€1,500/,
    );
  });
});

describe("WhatsApp link", () => {
  it("encodes a prefilled message with only the reference code", () => {
    const url = buildWhatsAppUrl("+20 100 000 0000", "Hello ELZORA, ref EZ-ABCD-2345 & more")!;
    assert.ok(url.startsWith("https://wa.me/201000000000?text="));
    assert.ok(url.includes("EZ-ABCD-2345"));
    assert.ok(!url.includes(" ") && !url.includes("&more"));
  });
  it("is hidden without a number", () => {
    assert.equal(buildWhatsAppUrl("", "x"), null);
    assert.equal(buildWhatsAppUrl(undefined, "x"), null);
  });
});

describe("attribution", () => {
  const page = {
    search: "?utm_source=google&utm_medium=cpc&utm_campaign=winter",
    pathname: "/de",
    referrer: "https://www.google.com/search?q=secret",
    ownHost: "elzora.test",
  };
  it("reads UTM and an external referrer without its query string", () => {
    const a = readAttribution(page);
    assert.equal(a.utmSource, "google");
    assert.equal(a.utmCampaign, "winter");
    assert.equal(a.referrer, "https://www.google.com/search");
    assert.equal(a.landingPage, "/de");
  });
  it("ignores same-site referrers and falls back to direct", () => {
    const a = readAttribution({ ...page, search: "", referrer: "https://elzora.test/en" });
    assert.equal(a.referrer, undefined);
    assert.equal(a.source, "direct");
  });
  it("keeps the first touch through the visit", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    captureAttribution(storage, readAttribution(page));
    const later = captureAttribution(
      storage,
      readAttribution({
        search: "",
        pathname: "/en/plan-your-trip",
        referrer: "",
        ownHost: "elzora.test",
      }),
    );
    assert.equal(later.utmSource, "google");
    assert.equal(later.landingPage, "/de");
  });
  it("upgrades an organic first touch when a campaign link follows", () => {
    const organic = readAttribution({ ...page, search: "" });
    assert.equal(mergeAttribution(organic, readAttribution(page)).utmCampaign, "winter");
  });
});

describe("references and keys", () => {
  it("generates readable, non-repeating references", () => {
    const set = new Set(Array.from({ length: 500 }, generateReferenceCode));
    assert.equal(set.size, 500);
    for (const code of set) assert.match(code, REFERENCE_PATTERN);
  });
  it("never puts a raw IP in the rate-limit key", () => {
    assert.ok(!rateLimitKey("leads", "203.0.113.9", "salt").includes("203.0.113.9"));
  });
});

describe("emails", () => {
  const copy = dict("de").planner.email as TravelerEmailCopy;
  const lead = () => {
    const parsed = createLeadSchema(() => NOW).parse(
      validInput({ fullName: "<script>alert(1)</script> Anna", notes: "<img src=x onerror=1>" }),
    );
    return {
      ...toNew(parsed),
      id: "id-1",
      referenceCode: "EZ-ABCD-2345",
      status: "new" as const,
      teamNotifiedAt: null,
      travelerNotifiedAt: null,
      notificationAttempts: 0,
      createdAt: NOW,
      updatedAt: NOW,
    };
  };
  it("renders a localized traveler confirmation with the reference and no raw HTML from input", () => {
    const mail = renderTravelerEmail(lead(), copy, "https://wa.me/1?text=x");
    assert.ok(mail.subject.includes("EZ-ABCD-2345") && mail.subject.startsWith("Wir haben"));
    assert.ok(mail.html.includes('lang="de"') && mail.html.includes("EZ-ABCD-2345"));
    assert.ok(!mail.html.includes("<script>"));
    assert.ok(mail.text.includes("Guten Tag"));
  });
  it("renders a team email with attribution and escapes everything", () => {
    const mail = renderTeamEmail(lead());
    assert.ok(mail.subject.startsWith("New inquiry EZ-ABCD-2345"));
    assert.ok(
      mail.html.includes("New inquiry") &&
        mail.html.includes("google") &&
        mail.html.includes("de-winter"),
    );
    assert.ok(!mail.html.includes("<img src=x") && !mail.html.includes("<script>"));
    assert.ok(mail.html.includes("&lt;img"));
  });
  it("email failure never throws and is recorded for retry", async () => {
    const records: unknown[] = [];
    const { storage } = fakeStorage({
      recordNotification: async (id, kind, outcome) => void records.push([kind, outcome]),
    });
    await notifyLead(lead(), {
      storage,
      send: async () => ({ ok: false, reason: "http_500" }),
      teamInbox: "team@example.com",
      copyFor: async () => copy,
      log: () => {},
    });
    assert.deepEqual(records, [
      ["team", { ok: false, reason: "http_500" }],
      ["traveler", { ok: false, reason: "http_500" }],
    ]);
  });
  it("records not_configured when Resend is missing, and survives a throwing sender", async () => {
    const records: unknown[] = [];
    const { storage } = fakeStorage({
      recordNotification: async (id, kind, outcome) => void records.push(outcome),
    });
    await notifyLead(lead(), { storage, send: null, copyFor: async () => copy, log: () => {} });
    assert.deepEqual(records, [
      { ok: false, reason: "not_configured" },
      { ok: false, reason: "not_configured" },
    ]);
    await notifyLead(lead(), {
      storage,
      send: async () => {
        throw new Error("boom");
      },
      teamInbox: "t@e.com",
      copyFor: async () => copy,
      log: () => {},
    });
  });
  it("sends both emails and marks them delivered", async () => {
    const sent: { to: string[]; idempotencyKey: string }[] = [];
    const records: unknown[] = [];
    const { storage } = fakeStorage({
      recordNotification: async (id, kind, outcome) => void records.push([kind, outcome.ok]),
    });
    await notifyLead(lead(), {
      storage,
      send: async (mail) => (sent.push(mail), { ok: true }),
      teamInbox: "a@x.com, b@x.com",
      copyFor: async () => copy,
      log: () => {},
    });
    assert.deepEqual(sent[0].to, ["a@x.com", "b@x.com"]);
    assert.deepEqual(sent[1].to, ["anna@example.de"]);
    assert.notEqual(sent[0].idempotencyKey, sent[1].idempotencyKey);
    assert.deepEqual(records, [
      ["team", true],
      ["traveler", true],
    ]);
  });
});
