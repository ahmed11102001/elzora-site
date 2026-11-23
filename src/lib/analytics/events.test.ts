import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveTrackingConfig, isTrackingConfigured } from "./config";
import { isAnalyticsEvent, sanitizeParams, sendEvent, sendPageView, type Sinks } from "./events";

const config = resolveTrackingConfig({
  ga4: "G-ABCDEF1234",
  ads: "AW-123456789",
  adsLeadLabel: "AbCdEfGhIj",
  meta: "123456789012345",
});

function sinks(consent: Sinks["consent"], over: Partial<Sinks> = {}) {
  const gtag: unknown[][] = [];
  const fbq: unknown[][] = [];
  const s: Sinks = {
    consent,
    config,
    gtag: (...args) => gtag.push(args),
    fbq: (...args) => fbq.push(args),
    ...over,
  };
  return { s, gtag, fbq };
}

describe("resolveTrackingConfig", () => {
  it("accepts well-formed IDs and drops malformed ones", () => {
    assert.equal(config.ga4, "G-ABCDEF1234");
    const bad = resolveTrackingConfig({
      ga4: "UA-1",
      ads: "AW-12",
      adsLeadLabel: "x",
      meta: "abc",
    });
    assert.deepEqual(bad, { ga4: "", ads: "", adsLeadLabel: "", meta: "" });
    assert.equal(isTrackingConfigured(bad), false);
  });
  it("ignores a conversion label that has no Ads ID", () => {
    assert.equal(resolveTrackingConfig({ adsLeadLabel: "AbCdEfGhIj" }).adsLeadLabel, "");
  });
  it("trims whitespace and handles undefined", () => {
    assert.equal(resolveTrackingConfig({ ga4: "  G-ABCDEF1234  " }).ga4, "G-ABCDEF1234");
    assert.equal(isTrackingConfigured(resolveTrackingConfig({})), false);
  });
});

describe("event map", () => {
  it("knows exactly the agreed events", () => {
    for (const name of [
      "view_journey",
      "journey_station_1",
      "journey_station_5",
      "planner_start",
      "planner_step_1",
      "planner_step_7",
      "lead_submit",
      "whatsapp_click",
    ]) {
      assert.equal(isAnalyticsEvent(name), true, name);
    }
    for (const name of [
      "journey_station_0",
      "journey_station_6",
      "planner_step_8",
      "purchase",
      "",
    ]) {
      assert.equal(isAnalyticsEvent(name), false, name);
    }
  });
});

describe("sanitizeParams", () => {
  it("keeps only allowed keys and drops anything that looks personal", () => {
    const out = sanitizeParams({
      locale: "de",
      trip: "nile-cruise",
      location: "x@y.com",
      source: "+49 170 1234567",
      // @ts-expect-error not an allowed key
      email: "anna@example.de",
    });
    assert.deepEqual(out, { locale: "de", trip: "nile-cruise" });
  });
  it("trims and limits values", () => {
    assert.equal(sanitizeParams({ trip: "  a\n b  " }).trip, "a b");
    assert.equal(sanitizeParams({ trip: "x".repeat(500) }).trip?.length, 100);
    assert.deepEqual(sanitizeParams(undefined), {});
  });
});

describe("sendEvent: nothing leaves without consent", () => {
  it("sends nothing at all when nothing is allowed", () => {
    const { s, gtag, fbq } = sinks({ analytics: false, marketing: false });
    sendEvent(s, "lead_submit", { locale: "en" });
    sendEvent(s, "whatsapp_click");
    assert.equal(gtag.length + fbq.length, 0);
  });
  it("analytics only: GA4 gets the event, Ads and Meta get nothing", () => {
    const { s, gtag, fbq } = sinks({ analytics: true, marketing: false });
    sendEvent(s, "lead_submit", { locale: "en" });
    assert.deepEqual(gtag, [["event", "lead_submit", { locale: "en", send_to: "G-ABCDEF1234" }]]);
    assert.equal(fbq.length, 0);
  });
  it("marketing only: Ads conversion and Meta Lead, but no GA4 event", () => {
    const { s, gtag, fbq } = sinks({ analytics: false, marketing: true });
    sendEvent(s, "lead_submit", { locale: "en" });
    assert.deepEqual(gtag, [["event", "conversion", { send_to: "AW-123456789/AbCdEfGhIj" }]]);
    assert.deepEqual(fbq, [["track", "Lead"]]);
  });
  it("everything allowed: all three tools see a lead, WhatsApp is a Meta Contact", () => {
    const { s, gtag, fbq } = sinks({ analytics: true, marketing: true });
    sendEvent(s, "lead_submit");
    assert.equal(gtag.length, 2);
    assert.equal(fbq.length, 1);
    sendEvent(s, "whatsapp_click", { location: "/en/contact" });
    assert.deepEqual(fbq[1], ["track", "Contact"]);
  });
  it("does not count an Ads conversion for other events or without a label", () => {
    const { s, gtag } = sinks({ analytics: false, marketing: true });
    sendEvent(s, "planner_start");
    assert.equal(gtag.length, 0);
    const noLabel = sinks(
      { analytics: false, marketing: true },
      { config: resolveTrackingConfig({ ads: "AW-123456789" }) },
    );
    sendEvent(noLabel.s, "lead_submit");
    assert.equal(noLabel.gtag.length, 0);
  });
  it("is silent while a tool has not been loaded yet", () => {
    const { s } = sinks({ analytics: true, marketing: true }, { gtag: undefined, fbq: undefined });
    assert.doesNotThrow(() => sendEvent(s, "lead_submit"));
  });
  it("ignores unknown event names and never sends personal data", () => {
    const { s, gtag } = sinks({ analytics: true, marketing: true });
    sendEvent(s, "purchase" as never);
    sendEvent(s, "whatsapp_click", { location: "me@example.com" });
    assert.deepEqual(gtag, [["event", "whatsapp_click", { send_to: "G-ABCDEF1234" }]]);
  });
});

describe("sendPageView", () => {
  it("sends once per path and tool, and only to allowed tools", () => {
    const state = { ga: null as string | null, meta: null as string | null };
    const { s, gtag, fbq } = sinks({ analytics: true, marketing: false });
    sendPageView(s, state, "/en");
    sendPageView(s, state, "/en");
    sendPageView(s, state, "/en/trips");
    assert.equal(gtag.length, 2);
    assert.equal(fbq.length, 0);
    // Marketing is allowed later on the same page: Meta sees the current page once.
    const later = sinks({ analytics: true, marketing: true });
    sendPageView(later.s, state, "/en/trips");
    assert.equal(later.gtag.length, 0);
    assert.deepEqual(later.fbq, [["track", "PageView"]]);
  });
});
