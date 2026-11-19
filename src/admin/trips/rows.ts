// Pure mapping between database rows and TripRecord (7.4C). No database access here, so it is unit tested
// without a database. Every row read from Postgres is validated again before the dashboard trusts it.
import { z } from "zod";
import { PhotoIdSchema } from "@/content/schema";
import {
  DayDraft,
  TranslationDraft,
  TripStatus,
  locales,
  type Locale,
  type MediaRef,
  type Translation,
  type TripRecord,
} from "./model";
import { BUDGET_CATEGORIES } from "./model";

export type TripRow = {
  id: string;
  featured: boolean;
  sort_order: number;
  duration_days: number;
  flexible_duration: boolean;
  price_from_eur: string | number | null; // numeric comes back as a string
  budget_category: string | null;
  style_ids: string[];
  destination_ids: string[];
  partner_id: string | null;
  archived_at: Date | string | null;
  created_at: Date | string;
  created_by: string | null;
  updated_at: Date | string;
  updated_by: string | null;
};

export type TranslationRow = {
  trip_id: string;
  locale: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  highlights: unknown;
  itinerary: unknown;
  inclusions: unknown;
  exclusions: unknown;
  price_note: string;
  meta_title: string;
  meta_description: string;
  og_image: string;
  canonical_override: string;
  noindex: boolean;
  status: string;
  published_at: Date | string | null;
  slug_history: string[];
};

export type MediaRow = {
  trip_id: string;
  position: number;
  is_main: boolean;
  photo_id: string;
  alt_en: string;
  alt_de: string;
};

const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();
const isoOrNull = (value: Date | string | null) => (value === null ? null : iso(value));

const Strings = z.array(z.string());
const Days = z.array(DayDraft);

export function translationFromRow(row: TranslationRow): Translation {
  const draft = TranslationDraft.parse({
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    description: row.description,
    highlights: Strings.parse(row.highlights),
    itinerary: Days.parse(row.itinerary),
    inclusions: Strings.parse(row.inclusions),
    exclusions: Strings.parse(row.exclusions),
    priceNote: row.price_note,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    ogImage: row.og_image,
    canonicalOverride: row.canonical_override,
    noindex: row.noindex,
  });
  return {
    ...draft,
    status: TripStatus.parse(row.status),
    publishedAt: isoOrNull(row.published_at),
    slugHistory: row.slug_history,
  };
}

export function recordFromRows(
  trip: TripRow,
  translations: TranslationRow[],
  media: MediaRow[],
): TripRecord {
  const byLocale = new Map<Locale, Translation>();
  for (const row of translations) {
    if ((locales as readonly string[]).includes(row.locale))
      byLocale.set(row.locale as Locale, translationFromRow(row));
  }
  const en = byLocale.get("en");
  if (!en) throw new Error(`Trip ${trip.id} has no English translation`);

  const sorted = [...media].sort((a, b) => a.position - b.position);
  const toRef = (row: MediaRow): MediaRef => ({
    photoId: PhotoIdSchema.parse(row.photo_id),
    alt: { en: row.alt_en, de: row.alt_de },
  });
  const main = sorted.find((row) => row.is_main);

  const budget = trip.budget_category ?? "";
  return {
    id: trip.id,
    featured: trip.featured,
    sortOrder: trip.sort_order,
    durationDays: trip.duration_days,
    flexibleDuration: trip.flexible_duration,
    priceFromEUR: trip.price_from_eur === null ? null : Number(trip.price_from_eur),
    budgetCategory: (BUDGET_CATEGORIES as readonly string[]).includes(budget)
      ? (budget as TripRecord["budgetCategory"])
      : "",
    styleIds: trip.style_ids,
    destinationIds: trip.destination_ids,
    mainImage: main ? toRef(main) : null,
    gallery: sorted.filter((row) => !row.is_main).map(toRef),
    partnerId: trip.partner_id,
    archivedAt: isoOrNull(trip.archived_at),
    createdAt: iso(trip.created_at),
    createdBy: trip.created_by,
    updatedAt: iso(trip.updated_at),
    updatedBy: trip.updated_by,
    translations: { en, de: byLocale.get("de") ?? null },
  };
}

/** Rows to store for the media of one trip: main image first (position 0), then the gallery in order. */
export function mediaRows(record: TripRecord): MediaRow[] {
  const rows: MediaRow[] = [];
  const add = (ref: MediaRef, isMain: boolean) =>
    rows.push({
      trip_id: record.id,
      position: rows.length,
      is_main: isMain,
      photo_id: ref.photoId,
      alt_en: ref.alt.en,
      alt_de: ref.alt.de,
    });
  if (record.mainImage) add(record.mainImage, true);
  for (const ref of record.gallery) add(ref, false);
  return rows;
}

/** Old slugs that must become 301 rows: every slug in a live translation's history except its current one. */
export function redirectRows(record: TripRecord): { locale: Locale; oldSlug: string }[] {
  const out: { locale: Locale; oldSlug: string }[] = [];
  for (const locale of locales) {
    const translation = record.translations[locale];
    if (!translation) continue;
    for (const oldSlug of translation.slugHistory) {
      if (oldSlug && oldSlug !== translation.slug) out.push({ locale, oldSlug });
    }
  }
  return out;
}
