import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONSENT_MAX_AGE_MS,
  CONSENT_VERSION,
  GRANTED,
  cookieDomains,
  createConsent,
  isWithdrawn,
  parseConsent,
  toGoogleConsent,
  trackingCookieNames,
} from "./consent";

const NOW = Date.UTC(2026, 10, 23, 12);
const save = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    analytics: true,
    marketing: false,
    version: CONSENT_VERSION,
    savedAt: NOW - 1000,
    ...over,
  });

describe("parseConsent", () => {
  it("reads a valid saved decision", () => {
    const c = parseConsent(save(), NOW);
    assert.deepEqual(c && { a: c.analytics, m: c.marketing }, { a: true, m: false });
  });
  it("treats missing, damaged and wrongly typed data as no decision", () => {
    assert.equal(parseConsent(null, NOW), null);
    assert.equal(parseConsent("", NOW), null);
    assert.equal(parseConsent("{not json", NOW), null);
    assert.equal(parseConsent("42", NOW), null);
    assert.equal(parseConsent(save({ analytics: "yes" }), NOW), null);
    assert.equal(parseConsent(save({ marketing: 1 }), NOW), null);
    assert.equal(parseConsent(save({ savedAt: "now" }), NOW), null);
  });
  it("asks again after a new version, after six months and for dates in the future", () => {
    assert.equal(parseConsent(save({ version: CONSENT_VERSION + 1 }), NOW), null);
    assert.equal(parseConsent(save({ savedAt: NOW - CONSENT_MAX_AGE_MS - 1 }), NOW), null);
    assert.notEqual(parseConsent(save({ savedAt: NOW - CONSENT_MAX_AGE_MS + 1000 }), NOW), null);
    assert.equal(parseConsent(save({ savedAt: NOW + 3_600_000 }), NOW), null);
  });
  it("round-trips what createConsent writes", () => {
    const stored = createConsent({ analytics: false, marketing: true }, NOW);
    assert.deepEqual(parseConsent(JSON.stringify(stored), NOW), stored);
  });
});

describe("toGoogleConsent (Consent Mode v2)", () => {
  it("denies everything optional until the visitor decides", () => {
    const s = toGoogleConsent(null);
    assert.equal(s.ad_storage, "denied");
    assert.equal(s.ad_user_data, "denied");
    assert.equal(s.ad_personalization, "denied");
    assert.equal(s.analytics_storage, "denied");
  });
  it("maps analytics and marketing independently", () => {
    const a = toGoogleConsent({ analytics: true, marketing: false });
    assert.equal(a.analytics_storage, "granted");
    assert.equal(a.ad_storage, "denied");
    const m = toGoogleConsent({ analytics: false, marketing: true });
    assert.equal(m.analytics_storage, "denied");
    assert.equal(m.ad_storage, "granted");
    assert.equal(m.ad_user_data, "granted");
    assert.equal(m.ad_personalization, "granted");
    assert.equal(toGoogleConsent(GRANTED).analytics_storage, "granted");
  });
});

describe("isWithdrawn", () => {
  it("is true only when an allowed category is now refused", () => {
    assert.equal(isWithdrawn(null, null), false);
    assert.equal(isWithdrawn(null, GRANTED), false);
    assert.equal(isWithdrawn({ analytics: false, marketing: false }, GRANTED), false);
    assert.equal(isWithdrawn(GRANTED, GRANTED), false);
    assert.equal(isWithdrawn(GRANTED, { analytics: true, marketing: false }), true);
    assert.equal(isWithdrawn(GRANTED, null), true);
  });
});

describe("cookie cleanup helpers", () => {
  it("finds analytics and advertising cookies and leaves the rest", () => {
    const header =
      "_ga=GA1.1.1; _ga_ABC123=x; _gcl_au=1; _fbp=fb.1; theme=dark; cf_clearance=abc; sessionid=1";
    assert.deepEqual(trackingCookieNames(header), ["_ga", "_ga_ABC123", "_gcl_au", "_fbp"]);
    assert.deepEqual(trackingCookieNames(""), []);
  });
  it("lists the host and its parent domains, never a bare top-level domain", () => {
    assert.deepEqual(cookieDomains("www.example.com"), [
      "www.example.com",
      ".example.com",
      ".www.example.com",
    ]);
    assert.deepEqual(cookieDomains("localhost"), ["localhost"]);
    assert.deepEqual(cookieDomains("127.0.0.1"), ["127.0.0.1"]);
  });
});
