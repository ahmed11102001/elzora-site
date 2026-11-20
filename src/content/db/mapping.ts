import type { Status, Trip } from "../schema";
import type { ItineraryDayJson, TranslationRow, TripRow } from "./schema";

// Pure mapping between the seed/site shape (Trip, with LocalizedText) and the database shape (one
// trip row plus one translation row per language). No framework or database imports, so the import
// script, the verify script, the data layer and the tests share exactly the same logic.

export type TranslationRecord = Omit<TranslationRow, "trip_id">;
export type TripRecord = {
  seedKey: string;
  durationDays: number;
  priceFromEUR: number | null;
  styleIds: string[];
  destinationIds: string[];
  sortOrder: number;
  mainPhotoId: string | null;
  translations: TranslationRecord[];
};

/** URL slug from a German title: umlauts become ae/oe/ue, ß becomes ss. */
export function slugifyGerman(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/, "");
}

type Texts = { en: string; de?: string }[];

/**
 * Translating a list is all or nothing: every item has a German text, or none does. A half-translated
 * list cannot be stored per language without losing which item is which, so it is rejected.
 */
function germanList(tripId: string, field: string, items: Texts): string[] {
  const translated = items.filter((item) => item.de !== undefined).length;
  if (translated === 0) return [];
  if (translated !== items.length) {
    throw new Error(`trip "${tripId}": "${field}" is only partly translated into German`);
  }
  return items.map((item) => item.de as string);
}

export function toTripRecord(trip: Trip, sortOrder: number): TripRecord {
  const en: TranslationRecord = {
    locale: "en",
    slug: trip.id,
    title: trip.title.en,
    summary: trip.summary.en,
    highlights: trip.highlights.map((h) => h.en),
    itinerary: trip.itinerary.map((d) => ({
      day: d.day,
      title: d.title.en,
      description: d.description.en,
      ...(d.destinationId ? { destinationId: d.destinationId } : {}),
    })),
    inclusions: trip.inclusions.map((i) => i.en),
    exclusions: trip.exclusions.map((i) => i.en),
    status: trip.status,
  };
  const translations = [en];

  // A German translation exists as soon as the title and summary have German text. Its lists follow
  // the all-or-nothing rule; an empty list means "not translated yet" (it must be filled before the
  // German page is published, which the dashboard checks in 7.4).
  if (trip.title.de && trip.summary.de) {
    const days = trip.itinerary;
    const translatedDays = days.filter((d) => d.title.de && d.description.de).length;
    if (translatedDays !== 0 && translatedDays !== days.length) {
      throw new Error(`trip "${trip.id}": the itinerary is only partly translated into German`);
    }
    translations.push({
      locale: "de",
      slug: slugifyGerman(trip.title.de),
      title: trip.title.de,
      summary: trip.summary.de,
      highlights: germanList(trip.id, "highlights", trip.highlights),
      itinerary:
        translatedDays === 0
          ? []
          : days.map((d) => ({
              day: d.day,
              title: d.title.de as string,
              description: d.description.de as string,
              ...(d.destinationId ? { destinationId: d.destinationId } : {}),
            })),
      inclusions: germanList(trip.id, "inclusions", trip.inclusions),
      exclusions: germanList(trip.id, "exclusions", trip.exclusions),
      status: trip.status,
    });
  }

  return {
    seedKey: trip.id,
    durationDays: trip.durationDays,
    priceFromEUR: trip.priceFromEUR ?? null,
    styleIds: trip.styleIds,
    destinationIds: trip.destinationIds,
    sortOrder,
    mainPhotoId: trip.image ?? null,
    translations,
  };
}

/** Throws when two trips would end up with the same slug in one language. */
export function assertUniqueSlugs(records: TripRecord[]) {
  for (const locale of ["en", "de"] as const) {
    const seen = new Map<string, string>();
    for (const record of records) {
      const translation = record.translations.find((t) => t.locale === locale);
      if (!translation) continue;
      const other = seen.get(translation.slug);
      if (other) {
        throw new Error(
          `slug "${translation.slug}" (${locale}) is used by "${other}" and "${record.seedKey}"`,
        );
      }
      seen.set(translation.slug, record.seedKey);
    }
  }
}

const isVisible = (status: Status, allowed: Status[]) => allowed.includes(status);

/**
 * Builds the shape the website already uses (Trip) from database rows. A trip needs a visible English
 * translation. German text is added only when the German translation is visible too and has the same
 * number of items as the English one (a language that is not translated stays English-only).
 */
export function assembleTrip(
  row: TripRow,
  translations: TranslationRow[],
  allowed: Status[],
): Trip | null {
  const en = translations.find((t) => t.locale === "en" && isVisible(t.status, allowed));
  if (!en) return null;
  const de = translations.find((t) => t.locale === "de" && isVisible(t.status, allowed));

  const text = (english: string, german?: string) =>
    german ? { en: english, de: german } : { en: english };
  const list = (english: string[], german?: string[]) =>
    english.map((item, i) =>
      text(item, german && german.length === english.length ? german[i] : undefined),
    );

  const deDays = de && de.itinerary.length === en.itinerary.length ? de.itinerary : undefined;
  const sortedDays = (days: ItineraryDayJson[]) => [...days].sort((a, b) => a.day - b.day);
  const enDays = sortedDays(en.itinerary);
  const deSorted = deDays ? sortedDays(deDays) : undefined;

  return {
    id: en.slug,
    title: text(en.title, de?.title),
    summary: text(en.summary, de?.summary),
    styleIds: row.style_ids,
    destinationIds: row.destination_ids,
    durationDays: row.duration_days,
    ...(row.price_from_eur !== null ? { priceFromEUR: row.price_from_eur } : {}),
    highlights: list(en.highlights, de?.highlights),
    itinerary: enDays.map((day, i) => ({
      day: day.day,
      title: text(day.title, deSorted?.[i]?.title),
      description: text(day.description, deSorted?.[i]?.description),
      ...(day.destinationId ? { destinationId: day.destinationId } : {}),
    })),
    inclusions: list(en.inclusions, de?.inclusions),
    exclusions: list(en.exclusions, de?.exclusions),
    ...(row.main_photo_id ? { image: row.main_photo_id as Trip["image"] } : {}),
    status: en.status,
  };
}

export function assembleTrips(rows: TripRow[], translations: TranslationRow[], allowed: Status[]) {
  const byTrip = new Map<string, TranslationRow[]>();
  for (const t of translations) byTrip.set(t.trip_id, [...(byTrip.get(t.trip_id) ?? []), t]);
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((row) => assembleTrip(row, byTrip.get(row.id) ?? [], allowed) ?? []);
}
