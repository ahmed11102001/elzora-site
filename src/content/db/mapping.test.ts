import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { L, Trip, type Status } from "../schema";
import { trips as tripSeed } from "../seed/trips";
import { assembleTrips, assertUniqueSlugs, slugifyGerman, toTripRecord } from "./mapping";
import type { TranslationRow, TripRow } from "./schema";

const seed = z.array(Trip).parse(tripSeed);
const ALL: Status[] = ["draft", "review", "published"];

/** What the database would return for the records (rows as the queries parse them). */
function toRows(trips: Trip[]) {
  const records = trips.map((trip, index) => toTripRecord(trip, index));
  const tripRows: TripRow[] = records.map((r, i) => ({
    id: `trip-${i}`,
    seed_key: r.seedKey,
    duration_days: r.durationDays,
    price_from_eur: r.priceFromEUR,
    style_ids: r.styleIds,
    destination_ids: r.destinationIds,
    sort_order: r.sortOrder,
    main_photo_id: r.mainPhotoId,
  }));
  const translations: TranslationRow[] = records.flatMap((r, i) =>
    r.translations.map((t) => ({ trip_id: `trip-${i}`, ...t })),
  );
  return { records, tripRows, translations };
}

const trip = (over: Partial<Trip> = {}): Trip =>
  Trip.parse({
    id: "sample-trip",
    title: L("Sample", "Beispiel"),
    summary: L("A sample trip.", "Eine Beispielreise."),
    styleIds: ["classic"],
    destinationIds: ["giza"],
    durationDays: 2,
    highlights: [L("One", "Eins"), L("Two", "Zwei")],
    itinerary: [
      { day: 1, title: L("Day one", "Tag eins"), description: L("Arrive.", "Ankunft.") },
      { day: 2, title: L("Day two", "Tag zwei"), description: L("Leave.", "Abreise.") },
    ],
    status: "review",
    ...over,
  });

describe("slugifyGerman", () => {
  it("transliterates umlauts and strips punctuation", () => {
    assert.equal(
      slugifyGerman("Klassisches Ägypten: Kairo, Luxor & Assuan"),
      "klassisches-aegypten-kairo-luxor-assuan",
    );
    assert.equal(slugifyGerman("Größe & Straße"), "groesse-strasse");
    assert.equal(slugifyGerman("  --Nil/Kreuzfahrt--  "), "nil-kreuzfahrt");
  });
});

describe("seed -> database rows -> site shape", () => {
  it("round-trips every seed trip exactly", () => {
    const { tripRows, translations } = toRows(seed);
    assert.deepStrictEqual(assembleTrips(tripRows, translations, ALL), seed);
  });

  it("gives every seed trip an English and a German translation with valid, unique slugs", () => {
    const { records } = toRows(seed);
    assertUniqueSlugs(records);
    for (const r of records) {
      assert.deepEqual(
        r.translations.map((t) => t.locale),
        ["en", "de"],
        r.seedKey,
      );
      for (const t of r.translations) assert.match(t.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
    assert.equal(records[0].translations[1].slug, "klassisches-aegypten-kairo-luxor-assuan");
  });

  it("keeps the order of the seed", () => {
    const { tripRows, translations } = toRows(seed);
    const shuffled = [...tripRows].reverse();
    assert.deepEqual(
      assembleTrips(shuffled, translations, ALL).map((t) => t.id),
      seed.map((t) => t.id),
    );
  });

  it("keeps a confirmed price and leaves it out when there is none", () => {
    const withPrice = trip({ priceFromEUR: 1490 });
    const { tripRows, translations } = toRows([
      withPrice,
      trip({ id: "other-trip", title: L("Other", "Andere") }),
    ]);
    const [a, b] = assembleTrips(tripRows, translations, ALL);
    assert.equal(a.priceFromEUR, 1490);
    assert.equal("priceFromEUR" in b, false);
  });
});

describe("visibility per translation", () => {
  it("shows nothing for a trip whose English translation is not allowed", () => {
    const { tripRows, translations } = toRows([trip()]);
    assert.deepEqual(assembleTrips(tripRows, translations, ["published"]), []);
    assert.equal(assembleTrips(tripRows, translations, ["published", "review"]).length, 1);
  });

  it("adds German text only when the German translation is visible", () => {
    const { tripRows, translations } = toRows([trip()]);
    const hiddenDe = translations.map((t) =>
      t.locale === "de" ? { ...t, status: "draft" as const } : t,
    );
    const [result] = assembleTrips(tripRows, hiddenDe, ["published", "review"]);
    assert.deepEqual(result.title, { en: "Sample" });
    assert.deepEqual(result.highlights, [{ en: "One" }, { en: "Two" }]);
    const [full] = assembleTrips(tripRows, translations, ["published", "review"]);
    assert.deepEqual(full.title, { en: "Sample", de: "Beispiel" });
  });

  it("treats an untranslated German list as English-only", () => {
    const untranslated = trip({
      itinerary: [
        { day: 1, title: L("Day one"), description: L("Arrive.") },
        { day: 2, title: L("Day two"), description: L("Leave.") },
      ],
    });
    const { records, tripRows, translations } = toRows([untranslated]);
    assert.deepEqual(records[0].translations[1].itinerary, []);
    const [result] = assembleTrips(tripRows, translations, ALL);
    assert.deepEqual(result.itinerary[0].title, { en: "Day one" });
  });
});

describe("guards", () => {
  it("rejects a half-translated list instead of mixing up the items", () => {
    const partial = trip({ highlights: [L("One", "Eins"), L("Two")] });
    assert.throws(() => toTripRecord(partial, 0), /only partly translated/);
    const partialDays = trip({
      itinerary: [
        { day: 1, title: L("Day one", "Tag eins"), description: L("Arrive.", "Ankunft.") },
        { day: 2, title: L("Day two"), description: L("Leave.") },
      ],
    });
    assert.throws(() => toTripRecord(partialDays, 0), /itinerary is only partly translated/);
  });

  it("detects two trips with the same slug in one language", () => {
    const a = toTripRecord(trip({ id: "one" }), 0);
    const b = toTripRecord(trip({ id: "two", title: L("Two", "Beispiel") }), 1);
    assert.throws(() => assertUniqueSlugs([a, b]), /used by/);
  });

  it("creates no German translation without German title and summary", () => {
    const englishOnly = toTripRecord(trip({ title: L("Sample"), summary: L("A sample trip.") }), 0);
    assert.deepEqual(
      englishOnly.translations.map((t) => t.locale),
      ["en"],
    );
  });
});
