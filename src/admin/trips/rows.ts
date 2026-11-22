// Pure mapping between the 7.2 database rows (db/migrations/0002 + 0003) and the dashboard's TripRecord.
// No database access here, so it is unit tested without a database. Every row read from Postgres is
// validated again before the dashboard trusts it.
import { z } from "zod";
import { PhotoIdSchema } from "@/content/schema";
import { redirectPath, slugFromRedirectPath } from "../publishing/paths";
import {
  BUDGET_CATEGORIES,
  DayDraft,
  TranslationDraft,
  TripStatus,
  locales,
  type Locale,
  type MediaRef,
  type Translation,
  type TripRecord,
} from "./model";

type Time = Date | string;

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
  archived_at: Time | null;
  created_at: Time;
  created_by: string | null;
  updated_at: Time;
  updated_by: string | null;
  main_photo_id: string | null;
  main_alt_en: string | null;
  main_alt_de: string | null;
};

export type TranslationRow = {
  trip_id: string;
  locale: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string;
  description: string | null;
  highlights: unknown;
  itinerary: unknown;
  inclusions: unknown;
  exclusions: unknown;
  price_note: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_override: string | null;
  noindex: boolean;
  status: string;
  published_at: Time | null;
  og_photo_id: string | null;
};

export type GalleryRow = {
  trip_id: string;
  sort_order: number;
  photo_id: string;
  alt_en: string | null;
  alt_de: string | null;
};

export type RedirectRow = { trip_id: string; old_path: string };

const iso = (value: Time): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();
const isoOrNull = (value: Time | null) => (value === null ? null : iso(value));

const Strings = z.array(z.string());
/** One itinerary day as stored in jsonb: { day, title, description, destinationId?, highlights? }. */
const StoredDay = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  destinationId: z.string().optional(),
  highlights: Strings.optional(),
});

export const storedItinerary = (days: DayDraft[]) =>
  days.map((d) => ({
    day: d.dayNumber,
    title: d.title,
    description: d.description,
    ...(d.destinationId ? { destinationId: d.destinationId } : {}),
    ...(d.highlights.length > 0 ? { highlights: d.highlights } : {}),
  }));

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && uuidRe.test(value);

export function translationFromRow(row: TranslationRow, slugHistory: string[]): Translation {
  const days = z.array(StoredDay).parse(row.itinerary);
  const draft = TranslationDraft.parse({
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    summary: row.summary,
    description: row.description ?? "",
    highlights: Strings.parse(row.highlights),
    itinerary: days.map((d) => ({
      dayNumber: d.day,
      title: d.title,
      description: d.description,
      destinationId: d.destinationId ?? "",
      highlights: d.highlights ?? [],
    })),
    inclusions: Strings.parse(row.inclusions),
    exclusions: Strings.parse(row.exclusions),
    priceNote: row.price_note ?? "",
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    ogImage: row.og_photo_id ?? "",
    canonicalOverride: row.canonical_override ?? "",
    noindex: row.noindex,
  });
  return {
    ...draft,
    status: TripStatus.parse(row.status),
    publishedAt: isoOrNull(row.published_at),
    slugHistory,
  };
}

export function recordFromRows(
  trip: TripRow,
  translations: TranslationRow[],
  gallery: GalleryRow[],
  redirects: RedirectRow[],
): TripRecord {
  const byLocale = new Map<Locale, Translation>();
  for (const row of translations) {
    if (!(locales as readonly string[]).includes(row.locale)) continue;
    const locale = row.locale as Locale;
    const history = redirects
      .map((r) => slugFromRedirectPath(locale, r.old_path))
      .filter((slug): slug is string => slug !== null);
    byLocale.set(locale, translationFromRow(row, history));
  }
  const en = byLocale.get("en");
  if (!en) throw new Error(`Trip ${trip.id} has no English translation`);

  const ref = (photoId: string, en: string | null, de: string | null): MediaRef => ({
    photoId: PhotoIdSchema.parse(photoId),
    alt: { en: en ?? "", de: de ?? "" },
  });
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
    mainImage: trip.main_photo_id
      ? ref(trip.main_photo_id, trip.main_alt_en, trip.main_alt_de)
      : null,
    gallery: [...gallery]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => ref(row.photo_id, row.alt_en, row.alt_de)),
    partnerId: null, // partners arrive in 7.6
    archivedAt: isoOrNull(trip.archived_at),
    createdAt: iso(trip.created_at),
    createdBy: trip.created_by,
    updatedAt: iso(trip.updated_at),
    updatedBy: trip.updated_by,
    translations: { en, de: byLocale.get("de") ?? null },
  };
}

/** Gallery images to store: unique by photo (the table's key is trip + image), in order. */
export function galleryPhotos(record: TripRecord): MediaRef[] {
  const seen = new Set<string>();
  return record.gallery.filter((ref) => !seen.has(ref.photoId) && seen.add(ref.photoId));
}

/** Old slugs that must become 301 rows: each slug in a translation's history except its current one. */
export function redirectRows(
  record: TripRecord,
): { locale: Locale; oldPath: string; newPath: string }[] {
  const out: { locale: Locale; oldPath: string; newPath: string }[] = [];
  for (const locale of locales) {
    const translation = record.translations[locale];
    if (!translation || !translation.slug) continue;
    for (const oldSlug of new Set(translation.slugHistory)) {
      if (oldSlug && oldSlug !== translation.slug)
        out.push({
          locale,
          oldPath: redirectPath(locale, oldSlug),
          newPath: redirectPath(locale, translation.slug),
        });
    }
  }
  return out;
}
