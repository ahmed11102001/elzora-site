import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafePreviewPath, signPreviewToken, verifyPreviewToken } from "./preview-token";

const secret = "a-test-secret-with-enough-length";
const input = { t: "trip-1", l: "en" as const, p: "/en/trips/nile-classic" };
const t0 = 1_800_000_000_000;

describe("preview token", () => {
  it("verifies a fresh token", () => {
    const token = signPreviewToken(input, secret, t0);
    const payload = verifyPreviewToken(token, secret, t0 + 60_000);
    assert.equal(payload?.t, "trip-1");
    assert.equal(payload?.p, "/en/trips/nile-classic");
  });
  it("expires after 15 minutes", () => {
    const token = signPreviewToken(input, secret, t0);
    assert.equal(verifyPreviewToken(token, secret, t0 + 16 * 60_000), null);
  });
  it("rejects a different secret, tampering and junk", () => {
    const token = signPreviewToken(input, secret, t0);
    assert.equal(verifyPreviewToken(token, "another-secret-of-length-16", t0), null);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...input, t: "other", e: 9_999_999_999 })).toString(
      "base64url",
    );
    assert.equal(verifyPreviewToken(`${forged}.${sig}`, secret, t0), null);
    assert.equal(verifyPreviewToken(`${body}.`, secret, t0), null);
    assert.equal(verifyPreviewToken("junk", secret, t0), null);
    assert.equal(verifyPreviewToken(null, secret, t0), null);
    assert.equal(verifyPreviewToken(`${token}.x`, secret, t0), null);
  });
  it("refuses a short secret on both sides", () => {
    assert.throws(() => signPreviewToken(input, "short", t0));
    const token = signPreviewToken(input, secret, t0);
    assert.equal(verifyPreviewToken(token, "short", t0), null);
  });
  it("never redirects off-site or out of a locale", () => {
    assert.equal(isSafePreviewPath("/en/trips/x"), true);
    assert.equal(isSafePreviewPath("/de/reisen/x"), true);
    for (const bad of [
      "//evil.com",
      "https://evil.com",
      "/admin",
      "/en/../admin",
      "/fr/x",
      "/en//x",
      "",
    ])
      assert.equal(isSafePreviewPath(bad), false, bad);
    const token = signPreviewToken({ ...input, p: "//evil.com" }, secret, t0);
    assert.equal(verifyPreviewToken(token, secret, t0), null);
  });
});
