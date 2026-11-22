import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  galleryPhotos,
  isUuid,
  recordFromRows,
  redirectRows,
  storedItinerary,
  type TranslationRow,
  type TripRow,
} from "./rows";
import { seedRecords } from "./seed";

const ID = "5b7c1c0e-3b0a-4c0e-9a55-0f6f5f1d2a11";

const tripRow = (over: Partial<TripRow> = {}): TripRow => ({
  id: ID,
  featured: true,
  sort_order: 10,
  duration_days: 3,
  flexible_duration: false,
  price_from_eur: "1250.00",
  budget_category: "1500-2500",
  style_ids: ["classic"],
  destination_ids: ["giza"],
  archived_at: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  created_by: null,
  updated_at: "2026-02-01T00:00:00.000Z",
  updated_by: null,
  main_photo_id: null,
  main_alt_en: null,
  main_alt_de: null,
  ...over,
});

const translationRow = (locale: string, over: Partial<TranslationRow> = {}): TranslationRow => ({
  trip_id: ID,
  locale,
  slug: locale === "en" ? "a-trip" : "eine-reise",
  title: "A trip",
  subtitle: null,
  summary: "Short",
  description: null,
  highlights: ["One"],
  itinerary: [{ day: 1, title: "D1", description: "x" }],
  inclusions: [],
  exclusions: [],
  price_note: null,
  meta_title: null,
  meta_description: null,
  canonical_override: null,
  noindex: false,
  status: "draft",
  published_at: null,
  og_photo_id: null,
  ...over,
});

describe("recordFromRows", () => {
  it("builds a record, converting numerics, dates and nulls", () => {
    const record = recordFromRows(tripRow(), [translationRow("en")], [], []);
    assert.equal(record.priceFromEUR, 1250);
    assert.equal(record.createdAt, "2026-01-01T00:00:00.000Z");
    assert.equal(record.translations.de, null);
    assert.equal(record.mainImage, null);
    assert.equal(record.translations.en.subtitle, "");
    assert.equal(record.translations.en.itinerary[0].dayNumber, 1);
  });
  it("rejects a trip without an English translation", () => {
    assert.throws(() => recordFromRows(tripRow(), [translationRow("de")], [], []));
  });
  it("rejects corrupt jsonb and unknown statuses instead of trusting them", () => {
    assert.throws(() =>
      recordFromRows(tripRow(), [translationRow("en", { itinerary: [{ day: "x" }] })], [], []),
    );
    assert.throws(() =>
      recordFromRows(tripRow(), [translationRow("en", { status: "live" })], [], []),
    );
  });
  it("rebuilds the slug history from redirects, per language", () => {
    const record = recordFromRows(
      tripRow(),
      [translationRow("en"), translationRow("de")],
      [],
      [
        { trip_id: ID, old_path: "/en/trips/old-en" },
        { trip_id: ID, old_path: "/de/reisen/alt-de" },
      ],
    );
    assert.deepEqual(record.translations.en.slugHistory, ["old-en"]);
    assert.deepEqual(record.translations.de?.slugHistory, ["alt-de"]);
  });
  it("splits media into the main image and the ordered gallery", () => {
    const record = recordFromRows(
      tripRow({ main_photo_id: "giza-pyramids", main_alt_en: "M", main_alt_de: null }),
      [translationRow("en")],
      [
        { trip_id: ID, sort_order: 1, photo_id: "aswan-nile", alt_en: "B", alt_de: "B-de" },
        { trip_id: ID, sort_order: 0, photo_id: "sphinx", alt_en: "A", alt_de: "A-de" },
      ],
      [],
    );
    assert.equal(record.mainImage?.photoId, "giza-pyramids");
    assert.equal(record.mainImage?.alt.de, "");
    assert.deepEqual(
      record.gallery.map((g) => g.photoId),
      ["sphinx", "aswan-nile"],
    );
  });
  it("rejects a photo id that is not in the image pipeline", () => {
    assert.throws(() =>
      recordFromRows(tripRow({ main_photo_id: "nope" }), [translationRow("en")], [], []),
    );
  });
});

describe("rows helpers", () => {
  it("stores itinerary days in the shape the public site reads", () => {
    assert.deepEqual(
      storedItinerary([
        { dayNumber: 2, title: "T", description: "D", destinationId: "", highlights: [] },
        { dayNumber: 3, title: "T", description: "D", destinationId: "luxor", highlights: ["h"] },
      ]),
      [
        { day: 2, title: "T", description: "D" },
        { day: 3, title: "T", description: "D", destinationId: "luxor", highlights: ["h"] },
      ],
    );
  });
  it("gallery photos are unique and keep their order", () => {
    const record = seedRecords()[0];
    const a = { photoId: "sphinx" as const, alt: { en: "", de: "" } };
    const b = { photoId: "aswan-nile" as const, alt: { en: "", de: "" } };
    record.gallery = [a, b, a];
    assert.deepEqual(
      galleryPhotos(record).map((g) => g.photoId),
      ["sphinx", "aswan-nile"],
    );
  });
  it("redirects come only from slug history, never the current slug", () => {
    const record = seedRecords()[0];
    record.translations.en.slug = "new";
    record.translations.en.slugHistory = ["old", "new", ""];
    assert.deepEqual(redirectRows(record), [
      { locale: "en", oldPath: "/en/trips/old", newPath: "/en/trips/new" },
    ]);
  });
  it("recognizes uuids", () => {
    assert.equal(isUuid(ID), true);
    assert.equal(isUuid("classic-egypt-8-days"), false);
    assert.equal(isUuid(null), false);
  });
});
