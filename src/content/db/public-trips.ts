import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Sql } from "postgres";
import { getContentSql, getPreviewSql } from "@/lib/db";
import { PhotoIdSchema, Status } from "../schema";
import type { PublicTrip, PublicTranslation } from "../trips-public";

// Public trip pages read from here (7.3): every language of a trip, with the fields the pages need.
// Rows are validated with Zod. A translation that does not validate (for example a half-written review
// copy) is skipped and logged, so one bad row never takes the whole site down; a trip left with no valid
// translation simply does not appear.

const Strings = z.array(z.string());
const Day = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  destinationId: z.string().optional(),
  highlights: Strings.optional(),
});
const Time = z.union([z.date(), z.string()]).transform((v) => new Date(v).toISOString());
const NullableText = z
  .string()
  .nullable()
  .transform((v) => v ?? "");

const TripRow = z.object({
  id: z.string(),
  featured: z.boolean(),
  sort_order: z.coerce.number(),
  duration_days: z.coerce.number().int().positive(),
  price_from_eur: z
    .union([z.string(), z.number()])
    .nullable()
    .transform((v) => (v === null ? null : Number(v))),
  budget_category: NullableText,
  style_ids: Strings,
  destination_ids: Strings,
  updated_at: Time,
  main_photo_id: PhotoIdSchema.nullable(),
  main_alt_en: NullableText,
  main_alt_de: NullableText,
});

const TranslationRow = z.object({
  trip_id: z.string(),
  locale: z.enum(["en", "de"]),
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: NullableText,
  summary: z.string().min(1),
  description: NullableText,
  highlights: Strings,
  itinerary: z.array(Day),
  inclusions: Strings,
  exclusions: Strings,
  price_note: NullableText,
  meta_title: NullableText,
  meta_description: NullableText,
  canonical_override: NullableText,
  noindex: z.boolean(),
  status: Status,
  published_at: Time.nullable(),
  og_photo_id: PhotoIdSchema.nullable(),
});

const GalleryRow = z.object({
  trip_id: z.string(),
  photo_id: PhotoIdSchema,
  alt_en: NullableText,
  alt_de: NullableText,
});

/** Trips whose translations have one of `statuses`; all languages. Optionally a single trip (preview). */
async function query(
  statuses: Status[],
  tripId?: string,
  sql: Sql = getContentSql(),
): Promise<PublicTrip[]> {
  const tripRows = await sql`
    SELECT t.id, t.featured, t.sort_order, t.duration_days, t.price_from_eur, t.budget_category,
           t.style_ids, t.destination_ids, t.updated_at,
           m.photo_id AS main_photo_id, m.alt_en AS main_alt_en, m.alt_de AS main_alt_de
    FROM trips t
    LEFT JOIN media_assets m ON m.id = t.main_media_id
    WHERE t.archived_at IS NULL ${tripId ? sql`AND t.id = ${tripId}` : sql``}
    ORDER BY t.sort_order, t.created_at`;
  if (tripRows.length === 0) return [];
  const ids = tripRows.map((r) => r.id as string);

  const [translationRows, galleryRows] = await Promise.all([
    sql`
      SELECT tt.trip_id, tt.locale, tt.slug, tt.title, tt.subtitle, tt.summary, tt.description,
             tt.highlights, tt.itinerary, tt.inclusions, tt.exclusions, tt.price_note, tt.meta_title,
             tt.meta_description, tt.canonical_override, tt.noindex, tt.status, tt.published_at,
             og.photo_id AS og_photo_id
      FROM trip_translations tt
      LEFT JOIN media_assets og ON og.id = tt.og_image_id
      WHERE tt.trip_id IN ${sql(ids)} AND tt.status::text IN ${sql(statuses)}`,
    sql`
      SELECT tm.trip_id, a.photo_id, a.alt_en, a.alt_de
      FROM trip_media tm JOIN media_assets a ON a.id = tm.media_id
      WHERE tm.trip_id IN ${sql(ids)} AND a.photo_id IS NOT NULL
      ORDER BY tm.sort_order`,
  ]);

  const translations = new Map<string, PublicTrip["translations"]>();
  for (const raw of translationRows) {
    const parsed = TranslationRow.safeParse(raw);
    if (!parsed.success) {
      console.error(
        `trip ${raw.trip_id} (${raw.locale}) skipped: ${parsed.error.issues[0]?.message}`,
      );
      continue;
    }
    const r = parsed.data;
    const t: PublicTranslation = {
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      summary: r.summary,
      description: r.description,
      highlights: r.highlights,
      itinerary: [...r.itinerary]
        .sort((a, b) => a.day - b.day)
        .map((d) => ({ ...d, highlights: d.highlights ?? [] })),
      inclusions: r.inclusions,
      exclusions: r.exclusions,
      priceNote: r.price_note,
      metaTitle: r.meta_title,
      metaDescription: r.meta_description,
      ogImage: r.og_photo_id,
      canonicalOverride: r.canonical_override,
      noindex: r.noindex,
      status: r.status,
      publishedAt: r.published_at,
    };
    const own = translations.get(r.trip_id) ?? {};
    own[r.locale] = t;
    translations.set(r.trip_id, own);
  }

  const galleries = new Map<string, PublicTrip["gallery"]>();
  for (const raw of galleryRows) {
    const parsed = GalleryRow.safeParse(raw);
    if (!parsed.success) continue;
    const g = parsed.data;
    galleries.set(g.trip_id, [
      ...(galleries.get(g.trip_id) ?? []),
      { photoId: g.photo_id, alt: { en: g.alt_en, de: g.alt_de } },
    ]);
  }

  return tripRows.flatMap((raw) => {
    const parsed = TripRow.safeParse(raw);
    const own = translations.get(raw.id as string);
    if (!parsed.success || !own || Object.keys(own).length === 0) return [];
    const r = parsed.data;
    return {
      id: r.id,
      featured: r.featured,
      sortOrder: r.sort_order,
      durationDays: r.duration_days,
      priceFromEUR: r.price_from_eur,
      budgetCategory: r.budget_category,
      styleIds: r.style_ids,
      destinationIds: r.destination_ids,
      image: r.main_photo_id
        ? { photoId: r.main_photo_id, alt: { en: r.main_alt_en, de: r.main_alt_de } }
        : null,
      gallery: galleries.get(r.id) ?? [],
      updatedAt: r.updated_at,
      translations: own,
    };
  });
}

/**
 * Public read. Cached (Cache Components requires uncached data inside a "use cache" function) and tagged
 * "trips" / "sitemap" so the dashboard's publish refreshes it (src/admin/publishing/tags.ts).
 */
export async function loadPublicTrips(statuses: Status[]): Promise<PublicTrip[]> {
  "use cache";
  cacheTag("trips", "sitemap");
  cacheLife("minutes");
  return query(statuses);
}

/** Where an old trip address now lives (a 301 row in `redirects`), or null. Cached per path. */
export async function loadTripRedirect(oldPath: string): Promise<string | null> {
  "use cache";
  cacheTag("trips");
  cacheLife("minutes");
  const rows = await getContentSql()`SELECT new_path FROM redirects WHERE old_path = ${oldPath}`;
  return rows.length > 0 ? (rows[0].new_path as string) : null;
}

/** One trip in every status, for the signed preview only. Never cached, never public. */
export async function loadTripForPreview(tripId: string): Promise<PublicTrip | null> {
  const [trip] = await query(["draft", "review", "published"], tripId, getPreviewSql());
  return trip ?? null;
}
