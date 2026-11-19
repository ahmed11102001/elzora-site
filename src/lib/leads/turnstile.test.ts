import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyTurnstile } from "./turnstile";

const res = (body: unknown, ok = true) =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe("Turnstile verification", () => {
  it("fails without a token when a secret is configured", async () => {
    assert.equal(
      await verifyTurnstile(undefined, "1.1.1.1", { env: { TURNSTILE_SECRET_KEY: "s" } }),
      "failed",
    );
  });
  it("accepts a token Cloudflare approves and sends the secret server-side", async () => {
    let sent = "";
    const fetchImpl = (async (_url: string, init: { body: URLSearchParams }) => {
      sent = init.body.toString();
      return { ok: true, json: async () => ({ success: true }) };
    }) as unknown as typeof fetch;
    assert.equal(
      await verifyTurnstile("tok", "1.1.1.1", { env: { TURNSTILE_SECRET_KEY: "sec" }, fetchImpl }),
      "ok",
    );
    assert.ok(
      sent.includes("secret=sec") &&
        sent.includes("response=tok") &&
        sent.includes("remoteip=1.1.1.1"),
    );
  });
  it("fails on a rejected token", async () => {
    const env = { TURNSTILE_SECRET_KEY: "s" };
    assert.equal(
      await verifyTurnstile("bad", undefined, { env, fetchImpl: res({ success: false }) }),
      "failed",
    );
  });
  it("is unavailable when Cloudflare cannot be reached", async () => {
    const env = { TURNSTILE_SECRET_KEY: "s" };
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    assert.equal(await verifyTurnstile("t", undefined, { env, fetchImpl: down }), "unavailable");
    assert.equal(
      await verifyTurnstile("t", undefined, { env, fetchImpl: res({}, false) }),
      "unavailable",
    );
  });
  it("never silently bypasses verification in production", async () => {
    assert.equal(
      await verifyTurnstile("t", undefined, { env: { NODE_ENV: "production" } }),
      "unavailable",
    );
    assert.equal(
      await verifyTurnstile("t", undefined, {
        env: { NODE_ENV: "production", TURNSTILE_DISABLED: "true" },
      }),
      "skipped",
    );
  });
  it("skips only in development without a secret", async () => {
    assert.equal(
      await verifyTurnstile(undefined, undefined, { env: { NODE_ENV: "development" } }),
      "skipped",
    );
  });
});
