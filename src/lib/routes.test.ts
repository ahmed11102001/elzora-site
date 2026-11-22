import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { locales } from "@/i18n/config";
import { decideRoute, negotiateLocale, previewRewrite } from "./proxy-logic";
import { resolveTail, routeMap, routePath, switchLocalePath, type RouteKey } from "./routes";

const keys = Object.keys(routeMap) as RouteKey[];

describe("route map", () => {
  it("has the same number of segments in every language, and unique paths per language", () => {
    for (const key of keys) {
      const counts = locales.map((l) => routeMap[key][l].split("/").filter(Boolean).length);
      assert.equal(new Set(counts).size, 1, key);
    }
    for (const l of locales) {
      const paths = keys.map((key) => routeMap[key][l]);
      assert.equal(new Set(paths).size, paths.length, `duplicate path in ${l}`);
    }
  });

  it("never lets a German path equal the English path of a different route", () => {
    for (const a of keys)
      for (const b of keys)
        if (a !== b) assert.notEqual(routeMap[a].de, routeMap[b].en, `${a} vs ${b}`);
  });

  it("builds localized links", () => {
    assert.equal(routePath("en", "privacy"), "/en/privacy");
    assert.equal(routePath("de", "privacy"), "/de/datenschutz");
    assert.equal(routePath("de", "trips", "/abc"), "/de/reisen/abc");
    assert.equal(routePath("de", "plannerConfirmation"), "/de/reise-planen/bestaetigung");
  });
});

describe("resolveTail", () => {
  it("matches the localized path first, then the internal one", () => {
    assert.deepEqual(resolveTail("de", "/datenschutz"), {
      key: "privacy",
      kind: "localized",
      rest: "",
    });
    assert.deepEqual(resolveTail("de", "/privacy"), { key: "privacy", kind: "internal", rest: "" });
    assert.deepEqual(resolveTail("en", "/privacy"), {
      key: "privacy",
      kind: "localized",
      rest: "",
    });
  });

  it("prefers the longest route and keeps a trailing slug", () => {
    assert.equal(resolveTail("de", "/reise-planen/bestaetigung")?.key, "plannerConfirmation");
    assert.equal(resolveTail("de", "/reise-planen")?.key, "planner");
    assert.deepEqual(resolveTail("de", "/reisen/mein-trip"), {
      key: "trips",
      kind: "localized",
      rest: "/mein-trip",
    });
  });

  it("returns null for the home page and unknown paths", () => {
    assert.equal(resolveTail("de", ""), null);
    assert.equal(resolveTail("de", "/gibt-es-nicht"), null);
    assert.equal(resolveTail("en", "/datenschutz"), null);
  });
});

describe("decideRoute", () => {
  it("rewrites a localized German path to the internal page", () => {
    assert.deepEqual(decideRoute("/de/datenschutz", null), {
      type: "rewrite",
      pathname: "/de/privacy",
    });
    assert.deepEqual(decideRoute("/de/reise-planen/bestaetigung", null), {
      type: "rewrite",
      pathname: "/de/plan-your-trip/confirmation",
    });
    assert.deepEqual(decideRoute("/de/reisen/abc", null), {
      type: "rewrite",
      pathname: "/de/trips/abc",
    });
  });

  it("redirects the internal English path under /de permanently to the localized one", () => {
    assert.deepEqual(decideRoute("/de/privacy", null), {
      type: "redirect",
      pathname: "/de/datenschutz",
      permanent: true,
    });
    assert.deepEqual(decideRoute("/de/plan-your-trip", null), {
      type: "redirect",
      pathname: "/de/reise-planen",
      permanent: true,
    });
  });

  it("leaves English pages, equal segments, the home page and unknown paths alone", () => {
    for (const path of ["/en", "/de", "/en/privacy", "/de/cookies", "/en/unknown", "/de/unbekannt"])
      assert.deepEqual(decideRoute(path, null), { type: "next" }, path);
  });

  it("does not create an alias across languages", () => {
    assert.deepEqual(decideRoute("/en/datenschutz", null), { type: "next" });
  });

  it("handles paths without a locale in one hop", () => {
    assert.deepEqual(decideRoute("/", "de-DE,de;q=0.9"), {
      type: "redirect",
      pathname: "/de",
      permanent: false,
    });
    assert.deepEqual(decideRoute("/privacy", "de"), {
      type: "redirect",
      pathname: "/de/datenschutz",
      permanent: false,
    });
    assert.deepEqual(decideRoute("/privacy", "en"), {
      type: "redirect",
      pathname: "/en/privacy",
      permanent: false,
    });
    assert.deepEqual(decideRoute("/datenschutz", "en"), {
      type: "redirect",
      pathname: "/de/datenschutz",
      permanent: false,
    });
    assert.deepEqual(decideRoute("/whatever", "de"), {
      type: "redirect",
      pathname: "/de/whatever",
      permanent: false,
    });
  });

  it("is idempotent: following a decision never produces another redirect", () => {
    const starts = [
      "/de/privacy",
      "/de/plan-your-trip/confirmation",
      "/privacy",
      "/datenschutz",
      "/de/trips/x",
    ];
    for (const start of starts) {
      let path = start;
      for (let hop = 0; hop < 3; hop++) {
        const d = decideRoute(path, "de");
        if (d.type === "redirect") path = d.pathname;
        else break;
      }
      assert.notEqual(decideRoute(path, "de").type, "redirect", start);
    }
  });
});

describe("switchLocalePath", () => {
  it("maps a page to its equivalent in the other language", () => {
    assert.equal(switchLocalePath("/en/privacy", "de"), "/de/datenschutz");
    assert.equal(switchLocalePath("/de/datenschutz", "en"), "/en/privacy");
    assert.equal(
      switchLocalePath("/de/reise-planen/bestaetigung", "en"),
      "/en/plan-your-trip/confirmation",
    );
    assert.equal(switchLocalePath("/en", "de"), "/de");
    assert.equal(switchLocalePath("/de", "en"), "/en");
    assert.equal(switchLocalePath("/en/cookies", "de"), "/de/cookies");
  });

  it("falls back to the same tail for unknown pages", () => {
    assert.equal(switchLocalePath("/en/design", "de"), "/de/design");
  });
});

describe("negotiateLocale", () => {
  it("picks the best supported language", () => {
    assert.equal(negotiateLocale("fr;q=0.9, de;q=0.8"), "de");
    assert.equal(negotiateLocale("fr"), "en");
    assert.equal(negotiateLocale(null), "en");
  });
});

describe("previewRewrite", () => {
  it("sends a trip address to the preview page, in both languages", () => {
    assert.equal(
      previewRewrite("/de/reisen/nilkreuzfahrt", "de"),
      "/de/trips/nilkreuzfahrt/preview",
    );
    assert.equal(previewRewrite("/en/trips/nile-cruise", "en"), "/en/trips/nile-cruise/preview");
  });
  it("leaves everything else alone", () => {
    assert.equal(previewRewrite("/de/reisen", "de"), null);
    assert.equal(previewRewrite("/de/reisen/a/b", "de"), null);
    assert.equal(previewRewrite("/en/trips/x", "de"), null); // cookie is for another language
    assert.equal(previewRewrite("/de/datenschutz", "de"), null);
    assert.equal(previewRewrite("/de", "de"), null);
  });
});
