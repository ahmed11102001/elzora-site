import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TripDraft,
  displayTitle,
  emptyDay,
  emptyDraft,
  freshState,
  toDraft,
  tripState,
  type Translation,
  type TripRecord,
} from "./model";
import { checkTranslation, itineraryIssues, type ReadinessContext } from "./readiness";
import { seedRecords } from "./seed";

const okContext = (overrides: Partial<ReadinessContext> = {}): ReadinessContext => ({
  slugTaken: () => false,
  imageLicense: () => "ok",
  enforceLicenses: false,
  ...overrides,
});

const days = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    ...emptyDay(i + 1),
    title: `Day ${i + 1}`,
    description: "Text",
  }));

function readyTranslation(slug: string, dayCount: number): Translation {
  return {
    slug,
    title: "A trip",
    subtitle: "",
    summary: "Short summary",
    description: "",
    highlights: [],
    itinerary: days(dayCount),
    inclusions: [],
    exclusions: [],
    priceNote: "",
    metaTitle: "A trip title for search results page",
    metaDescription: "x".repeat(140),
    ogImage: "",
    canonicalOverride: "",
    noindex: false,
    ...freshState(),
  };
}

function readyTrip(): TripRecord {
  return {
    ...emptyDraft(),
    id: "t1",
    durationDays: 3,
    styleIds: ["classic"],
    destinationIds: ["giza"],
    mainImage: { photoId: "giza-pyramids", alt: { en: "Pyramids", de: "Pyramiden" } },
    partnerId: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: null,
    translations: { en: readyTranslation("a-trip", 3), de: readyTranslation("eine-reise", 3) },
  };
}

describe("TripDraft schema", () => {
  it("accepts the empty draft and strips blank list rows", () => {
    const draft = emptyDraft();
    draft.translations.en.highlights = ["One", "  ", ""];
    const parsed = TripDraft.parse(draft);
    assert.deepEqual(parsed.translations.en.highlights, ["One"]);
  });
  it("rejects bad slugs, unknown photos and out-of-range numbers", () => {
    const bad = emptyDraft();
    bad.translations.en.slug = "Not A Slug";
    assert.equal(TripDraft.safeParse(bad).success, false);

    const photo = { ...emptyDraft(), mainImage: { photoId: "nope", alt: { en: "", de: "" } } };
    assert.equal(TripDraft.safeParse(photo).success, false);

    assert.equal(TripDraft.safeParse({ ...emptyDraft(), durationDays: 0 }).success, false);
    assert.equal(TripDraft.safeParse({ ...emptyDraft(), priceFromEUR: -5 }).success, false);
  });
  it("never lets the form set status, publish data or ids", () => {
    const parsed = TripDraft.parse({
      ...emptyDraft(),
      id: "evil",
      translations: { en: { ...emptyDraft().translations.en, status: "published" }, de: null },
    }) as Record<string, unknown>;
    assert.equal("id" in parsed, false);
    assert.equal("status" in (parsed.translations as { en: object }).en, false);
  });
  it("requires an https canonical override", () => {
    const bad = emptyDraft();
    bad.translations.en.canonicalOverride = "http://example.com";
    assert.equal(TripDraft.safeParse(bad).success, false);
    bad.translations.en.canonicalOverride = "https://example.com/x";
    assert.equal(TripDraft.safeParse(bad).success, true);
  });
});

describe("toDraft", () => {
  it("returns exactly what the schema accepts, without server-controlled state", () => {
    const record = readyTrip();
    const draft = toDraft(record);
    assert.equal(TripDraft.safeParse(draft).success, true);
    assert.equal("status" in draft.translations.en, false);
    assert.equal("slugHistory" in draft.translations.en, false);
  });
});

describe("readiness", () => {
  it("passes a complete trip", () => {
    const trip = readyTrip();
    assert.deepEqual(checkTranslation(trip, "en", "publish", okContext()).blockers, []);
    assert.deepEqual(checkTranslation(trip, "de", "publish", okContext()).blockers, []);
  });
  it("review level only needs title, slug and summary", () => {
    const trip = readyTrip();
    trip.translations.en.metaTitle = "";
    trip.mainImage = null;
    assert.deepEqual(checkTranslation(trip, "en", "review", okContext()).blockers, []);
    trip.translations.en.summary = "";
    assert.equal(
      checkTranslation(trip, "en", "review", okContext()).blockers[0].code,
      "summary.missing",
    );
  });
  it("blocks publishing on missing SEO fields, duplicate slug and missing alt text", () => {
    const trip = readyTrip();
    trip.translations.en.metaDescription = "";
    trip.mainImage = { photoId: "giza-pyramids", alt: { en: "", de: "x" } };
    const result = checkTranslation(trip, "en", "publish", okContext({ slugTaken: () => true }));
    const codes = result.blockers.map((b) => b.code);
    assert.ok(codes.includes("metaDescription.missing"));
    assert.ok(codes.includes("slug.duplicate"));
    assert.ok(codes.includes("image.alt"));
  });
  it("checks the itinerary against the duration unless it is flexible", () => {
    const trip = readyTrip();
    trip.translations.en.itinerary = days(2);
    assert.ok(
      checkTranslation(trip, "en", "publish", okContext()).blockers.some(
        (b) => b.code === "itinerary.length",
      ),
    );
    trip.flexibleDuration = true;
    assert.ok(
      !checkTranslation(trip, "en", "publish", okContext()).blockers.some(
        (b) => b.code === "itinerary.length",
      ),
    );
  });
  it("requires the same day numbers in both languages", () => {
    const trip = readyTrip();
    trip.flexibleDuration = true;
    trip.translations.de = readyTranslation("eine-reise", 2);
    const codes = checkTranslation(trip, "en", "publish", okContext()).blockers.map((b) => b.code);
    assert.ok(codes.includes("itinerary.mismatch"));
  });
  it("flags out-of-order days and empty day text", () => {
    const issues = itineraryIssues(
      { itinerary: [{ ...emptyDay(2), title: "x", description: "y" }, emptyDay(2)] },
      "en",
    );
    assert.ok(issues.some((i) => i.code === "itinerary.order"));
    assert.ok(issues.some((i) => i.code === "itinerary.text"));
  });
  it("treats unconfirmed licences as a warning, then as a blocker when enforced", () => {
    const trip = readyTrip();
    const unconfirmed = { imageLicense: () => "unconfirmed" as const };
    const soft = checkTranslation(trip, "en", "publish", okContext(unconfirmed));
    assert.equal(soft.blockers.length, 0);
    assert.ok(soft.warnings.some((w) => w.code === "image.licence"));
    const hard = checkTranslation(
      trip,
      "en",
      "publish",
      okContext({ ...unconfirmed, enforceLicenses: true }),
    );
    assert.ok(hard.blockers.some((b) => b.code === "image.licence"));
  });
  it("SEO length guidance warns but never blocks", () => {
    const trip = readyTrip();
    trip.translations.en.metaTitle = "Short";
    const result = checkTranslation(trip, "en", "publish", okContext());
    assert.equal(result.blockers.length, 0);
    assert.ok(result.warnings.some((w) => w.code === "metaTitle.length"));
  });
  it("reports a missing translation", () => {
    const trip = readyTrip();
    trip.translations.de = null;
    assert.equal(
      checkTranslation(trip, "de", "review", okContext()).blockers[0].code,
      "translation.missing",
    );
  });
});

describe("trip state and titles", () => {
  it("summarises languages and archiving", () => {
    const trip = readyTrip();
    assert.equal(tripState(trip), "draft");
    trip.translations.de = { ...trip.translations.de!, status: "review" };
    assert.equal(tripState(trip), "review");
    trip.translations.en = { ...trip.translations.en, status: "published" };
    assert.equal(tripState(trip), "published");
    trip.archivedAt = "2026-02-01T00:00:00.000Z";
    assert.equal(tripState(trip), "archived");
  });
  it("falls back from English to German to a placeholder", () => {
    const trip = readyTrip();
    trip.translations.en.title = "";
    assert.equal(displayTitle(trip), "A trip");
    trip.translations.de = null;
    assert.equal(displayTitle(trip), "Untitled trip");
  });
});

describe("seed conversion", () => {
  it("turns the site's seed trips into valid dashboard records", () => {
    const records = seedRecords();
    assert.ok(records.length >= 3);
    for (const record of records) {
      assert.equal(TripDraft.safeParse(toDraft(record)).success, true, record.id);
      assert.equal(record.translations.en.slug, record.id);
      assert.equal(record.translations.en.itinerary.length, record.durationDays);
      // German exists only where the seed has German text, and starts as a draft without a slug.
      if (record.translations.de) {
        assert.equal(record.translations.de.status, "draft");
        assert.equal(record.translations.de.slug, "");
      }
    }
  });
});
