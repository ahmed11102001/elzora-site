import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mediaRows, recordFromRows, redirectRows, type TranslationRow, type TripRow } from "./rows";
import { seedRecords } from "./seed";
import { TripDraft, toDraft } from "./model";

const tripRow = (over: Partial<TripRow> = {}): TripRow => ({
  id: "t1",
  featured: true,
  sort_order: 10,
  duration_days: 3,
  flexible_duration: false,
  price_from_eur: "1250.00",
  budget_category: "1500-2500",
  style_ids: ["classic"],
  destination_ids: ["giza"],
  partner_id: null,
  archived_at: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  created_by: "u1",
  updated_at: "2026-02-01T00:00:00.000Z",
  updated_by: "u1",
  ...over,
});

const translationRow = (locale: string, over: Partial<TranslationRow> = {}): TranslationRow => ({
  trip_id: "t1",
  locale,
  slug: locale === "en" ? "a-trip" : "eine-reise",
  title: "A trip",
  subtitle: "",
  summary: "Short",
  description: "",
  highlights: ["One"],
  itinerary: [{ dayNumber: 1, title: "D1", description: "x", destinationId: "", highlights: [] }],
  inclusions: [],
  exclusions: [],
  price_note: "",
  meta_title: "",
  meta_description: "",
  og_image: "",
  canonical_override: "",
  noindex: false,
  status: "draft",
  published_at: null,
  slug_history: [],
  ...over,
});

describe("recordFromRows", () => {
  it("builds a record, converting numerics and dates", () => {
    const record = recordFromRows(tripRow(), [translationRow("en")], []);
    assert.equal(record.priceFromEUR, 1250);
    assert.equal(record.createdAt, "2026-01-01T00:00:00.000Z");
    assert.equal(record.translations.de, null);
    assert.equal(record.mainImage, null);
  });
  it("rejects a trip without an English translation", () => {
    assert.throws(() => recordFromRows(tripRow(), [translationRow("de")], []));
  });
  it("rejects corrupt jsonb instead of trusting it", () => {
    assert.throws(() =>
      recordFromRows(tripRow(), [translationRow("en", { itinerary: [{ dayNumber: "x" }] })], []),
    );
    assert.throws(() => recordFromRows(tripRow(), [translationRow("en", { status: "live" })], []));
  });
  it("treats an unknown budget category as empty", () => {
    assert.equal(
      recordFromRows(tripRow({ budget_category: null }), [translationRow("en")], []).budgetCategory,
      "",
    );
  });
  it("splits media into the main image and the ordered gallery", () => {
    const media = [
      {
        trip_id: "t1",
        position: 2,
        is_main: false,
        photo_id: "aswan-nile",
        alt_en: "B",
        alt_de: "B-de",
      },
      {
        trip_id: "t1",
        position: 0,
        is_main: true,
        photo_id: "giza-pyramids",
        alt_en: "M",
        alt_de: "M-de",
      },
      {
        trip_id: "t1",
        position: 1,
        is_main: false,
        photo_id: "sphinx",
        alt_en: "A",
        alt_de: "A-de",
      },
    ];
    const record = recordFromRows(tripRow(), [translationRow("en")], media);
    assert.equal(record.mainImage?.photoId, "giza-pyramids");
    assert.deepEqual(
      record.gallery.map((g) => g.photoId),
      ["sphinx", "aswan-nile"],
    );
  });
});

describe("rows round trip", () => {
  it("media rows put the main image first and keep gallery order", () => {
    const record = seedRecords()[0];
    record.mainImage = { photoId: "giza-pyramids", alt: { en: "M", de: "M" } };
    record.gallery = [
      { photoId: "sphinx", alt: { en: "A", de: "A" } },
      { photoId: "aswan-nile", alt: { en: "B", de: "B" } },
    ];
    const rows = mediaRows(record);
    assert.deepEqual(
      rows.map((r) => [r.position, r.is_main, r.photo_id]),
      [
        [0, true, "giza-pyramids"],
        [1, false, "sphinx"],
        [2, false, "aswan-nile"],
      ],
    );
  });
  it("redirects come only from slug history, never the current slug", () => {
    const record = seedRecords()[0];
    record.translations.en.slug = "new";
    record.translations.en.slugHistory = ["old", "new", ""];
    assert.deepEqual(redirectRows(record), [{ locale: "en", oldSlug: "old" }]);
  });
  it("every seed record survives a rows -> record trip", () => {
    for (const record of seedRecords()) {
      const back = recordFromRows(
        tripRow({ id: record.id, duration_days: record.durationDays }),
        [translationRow("en", { slug: record.translations.en.slug })],
        [],
      );
      assert.equal(TripDraft.safeParse(toDraft(back)).success, true);
    }
  });
});
