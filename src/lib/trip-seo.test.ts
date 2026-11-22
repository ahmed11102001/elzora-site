import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TripView } from "@/content/trips-public";
import { tripMetadata } from "./trip-seo";

const view = (over: Partial<TripView> = {}): TripView => ({
  id: "t1",
  lang: "de",
  featured: false,
  slug: "nilkreuzfahrt",
  title: "Nilkreuzfahrt",
  subtitle: "",
  summary: "Kurz",
  description: "",
  highlights: [],
  itinerary: [],
  inclusions: [],
  exclusions: [],
  priceNote: "",
  metaTitle: "",
  metaDescription: "",
  canonicalOverride: "",
  noindex: false,
  status: "published",
  publishedAt: null,
  durationDays: 5,
  priceFromEUR: null,
  budgetCategory: "",
  styleIds: [],
  destinationIds: [],
  image: null,
  gallery: [],
  ogImage: null,
  updatedAt: null,
  slugs: { en: "nile-cruise", de: "nilkreuzfahrt" },
  ...over,
});

describe("tripMetadata", () => {
  it("uses the trip's own text and lists only visible languages in hreflang", () => {
    const m = tripMetadata(view());
    assert.equal(m.title, "Nilkreuzfahrt");
    assert.equal(m.description, "Kurz");
    assert.deepEqual(m.alternates?.languages, {
      en: "/en/trips/nile-cruise",
      de: "/de/reisen/nilkreuzfahrt",
      "x-default": "/en/trips/nile-cruise",
    });
    assert.equal(m.alternates?.canonical, "/de/reisen/nilkreuzfahrt");
  });
  it("omits a language that is not visible", () => {
    const m = tripMetadata(view({ slugs: { de: "nilkreuzfahrt" } }));
    assert.deepEqual(m.alternates?.languages, {
      de: "/de/reisen/nilkreuzfahrt",
      "x-default": "/de/reisen/nilkreuzfahrt",
    });
  });
  it("prefers the editor's SEO fields, canonical override and noindex", () => {
    const m = tripMetadata(
      view({
        metaTitle: "SEO Titel",
        metaDescription: "SEO Text",
        canonicalOverride: "https://example.com/x",
        noindex: true,
      }),
    );
    assert.equal(m.title, "SEO Titel");
    assert.equal(m.description, "SEO Text");
    assert.equal(m.alternates?.canonical, "https://example.com/x");
    assert.deepEqual(m.robots, { index: false, follow: true });
  });
});
