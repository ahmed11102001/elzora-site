import "server-only";
// Postgres implementation of TripStore (7.4C), on the 7.2 tables (db/migrations/0002) plus 0003.
// Each write is one transaction, so a trip, its translations, its images and its redirects never disagree.
// Images live in media_assets (one row per pipeline photo, alt text per language); a trip points at them.
import type { Sql, TransactionSql } from "postgres";
import { adminSql } from "../db/sql";
import { redirectPath } from "../publishing/paths";
import { locales, type MediaRef, type TripRecord } from "./model";
import {
  galleryPhotos,
  isUuid,
  recordFromRows,
  redirectRows,
  storedItinerary,
  type GalleryRow,
  type RedirectRow,
  type TranslationRow,
  type TripRow,
} from "./rows";
import type { TripStore } from "./store";

type Tx = TransactionSql;

// postgres.js types json() narrowly; our values are already validated plain JSON.
const json = (tx: Tx, value: unknown) => tx.json(value as never);

/** Finds or creates the media_assets row of a pipeline photo. `alt` updates its alt text (images shown on a trip). */
async function assetId(tx: Tx, photoId: string, alt?: MediaRef["alt"]): Promise<string> {
  const [row] = alt
    ? await tx<{ id: string }[]>`
        INSERT INTO media_assets (photo_id, alt_en, alt_de)
        VALUES (${photoId}, ${alt.en || null}, ${alt.de || null})
        ON CONFLICT (photo_id) DO UPDATE SET alt_en = EXCLUDED.alt_en, alt_de = EXCLUDED.alt_de
        RETURNING id`
    : await tx<{ id: string }[]>`
        INSERT INTO media_assets (photo_id) VALUES (${photoId})
        ON CONFLICT (photo_id) DO UPDATE SET photo_id = EXCLUDED.photo_id
        RETURNING id`;
  return row.id;
}

const orNull = (value: string) => (value === "" ? null : value);
const uuidOrNull = (value: string | null) => (isUuid(value) ? value : null);

async function writeTrip(tx: Tx, record: TripRecord, creating: boolean): Promise<boolean> {
  const mainId = record.mainImage
    ? await assetId(tx, record.mainImage.photoId, record.mainImage.alt)
    : null;
  const budget = record.budgetCategory === "" ? null : record.budgetCategory;

  if (creating) {
    await tx`
      INSERT INTO trips (
        id, featured, sort_order, duration_days, flexible_duration, price_from_eur, budget_category,
        style_ids, destination_ids, main_media_id, archived_at, created_by, created_at,
        updated_by, updated_at
      ) VALUES (
        ${record.id}, ${record.featured}, ${record.sortOrder}, ${record.durationDays},
        ${record.flexibleDuration}, ${record.priceFromEUR}, ${budget},
        ${tx.array(record.styleIds)}, ${tx.array(record.destinationIds)}, ${mainId},
        ${record.archivedAt}, ${uuidOrNull(record.createdBy)}, ${record.createdAt},
        ${uuidOrNull(record.updatedBy)}, ${record.updatedAt}
      )`;
  } else {
    const updated = await tx`
      UPDATE trips SET
        featured = ${record.featured}, sort_order = ${record.sortOrder},
        duration_days = ${record.durationDays}, flexible_duration = ${record.flexibleDuration},
        price_from_eur = ${record.priceFromEUR}, budget_category = ${budget},
        style_ids = ${tx.array(record.styleIds)}, destination_ids = ${tx.array(record.destinationIds)},
        main_media_id = ${mainId}, archived_at = ${record.archivedAt},
        updated_by = ${uuidOrNull(record.updatedBy)}, updated_at = ${record.updatedAt}
      WHERE id = ${record.id} RETURNING id`;
    if (updated.length === 0) return false;
  }

  for (const locale of locales) {
    const t = record.translations[locale];
    if (!t) {
      await tx`DELETE FROM trip_translations WHERE trip_id = ${record.id} AND locale = ${locale}`;
      continue;
    }
    const og = t.ogImage ? await assetId(tx, t.ogImage) : null;
    await tx`
      INSERT INTO trip_translations (
        trip_id, locale, slug, title, subtitle, summary, description, highlights, itinerary,
        inclusions, exclusions, price_note, meta_title, meta_description, og_image_id,
        canonical_override, noindex, status, published_at
      ) VALUES (
        ${record.id}, ${locale}, ${t.slug}, ${t.title}, ${orNull(t.subtitle)}, ${t.summary},
        ${orNull(t.description)}, ${json(tx, t.highlights)}, ${json(tx, storedItinerary(t.itinerary))},
        ${json(tx, t.inclusions)}, ${json(tx, t.exclusions)}, ${orNull(t.priceNote)},
        ${orNull(t.metaTitle)}, ${orNull(t.metaDescription)}, ${og},
        ${orNull(t.canonicalOverride)}, ${t.noindex}, ${t.status}::content_status, ${t.publishedAt}
      )
      ON CONFLICT (trip_id, locale) DO UPDATE SET
        slug = EXCLUDED.slug, title = EXCLUDED.title, subtitle = EXCLUDED.subtitle,
        summary = EXCLUDED.summary, description = EXCLUDED.description,
        highlights = EXCLUDED.highlights, itinerary = EXCLUDED.itinerary,
        inclusions = EXCLUDED.inclusions, exclusions = EXCLUDED.exclusions,
        price_note = EXCLUDED.price_note, meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description, og_image_id = EXCLUDED.og_image_id,
        canonical_override = EXCLUDED.canonical_override, noindex = EXCLUDED.noindex,
        status = EXCLUDED.status, published_at = EXCLUDED.published_at`;
  }

  // Gallery: small (at most a dozen images), replaced as a whole.
  await tx`DELETE FROM trip_media WHERE trip_id = ${record.id}`;
  let position = 0;
  for (const ref of galleryPhotos(record)) {
    const media = await assetId(tx, ref.photoId, ref.alt);
    await tx`
      INSERT INTO trip_media (trip_id, media_id, sort_order) VALUES (${record.id}, ${media}, ${position})
      ON CONFLICT DO NOTHING`;
    position += 1;
  }

  // Redirects: a slug that is live again is no longer an "old" slug; every old slug points at the current one.
  for (const locale of locales) {
    const slug = record.translations[locale]?.slug;
    if (slug) await tx`DELETE FROM redirects WHERE old_path = ${redirectPath(locale, slug)}`;
  }
  for (const { oldPath, newPath } of redirectRows(record)) {
    await tx`
      INSERT INTO redirects (old_path, new_path, trip_id) VALUES (${oldPath}, ${newPath}, ${record.id})
      ON CONFLICT (old_path) DO UPDATE SET new_path = EXCLUDED.new_path, trip_id = EXCLUDED.trip_id`;
  }
  return true;
}

async function loadMany(sql: Sql, ids: string[] | null): Promise<TripRecord[]> {
  const trips = await sql<TripRow[]>`
    SELECT t.id, t.featured, t.sort_order, t.duration_days, t.flexible_duration, t.price_from_eur,
           t.budget_category, t.style_ids, t.destination_ids, t.archived_at, t.created_at,
           t.created_by, t.updated_at, t.updated_by,
           m.photo_id AS main_photo_id, m.alt_en AS main_alt_en, m.alt_de AS main_alt_de
    FROM trips t
    LEFT JOIN media_assets m ON m.id = t.main_media_id
    ${ids ? sql`WHERE t.id IN ${sql(ids)}` : sql``}
    ORDER BY t.sort_order, t.created_at`;
  if (trips.length === 0) return [];
  const tripIds = trips.map((t) => t.id);
  const [translations, gallery, redirects] = await Promise.all([
    sql<TranslationRow[]>`
      SELECT tt.trip_id, tt.locale, tt.slug, tt.title, tt.subtitle, tt.summary, tt.description,
             tt.highlights, tt.itinerary, tt.inclusions, tt.exclusions, tt.price_note, tt.meta_title,
             tt.meta_description, tt.canonical_override, tt.noindex, tt.status, tt.published_at,
             og.photo_id AS og_photo_id
      FROM trip_translations tt
      LEFT JOIN media_assets og ON og.id = tt.og_image_id
      WHERE tt.trip_id IN ${sql(tripIds)}`,
    sql<GalleryRow[]>`
      SELECT tm.trip_id, tm.sort_order, a.photo_id, a.alt_en, a.alt_de
      FROM trip_media tm JOIN media_assets a ON a.id = tm.media_id
      WHERE tm.trip_id IN ${sql(tripIds)}`,
    sql<RedirectRow[]>`SELECT trip_id, old_path FROM redirects WHERE trip_id IN ${sql(tripIds)}`,
  ]);
  return trips.map((trip) =>
    recordFromRows(
      trip,
      translations.filter((row) => row.trip_id === trip.id),
      gallery.filter((row) => row.trip_id === trip.id),
      redirects.filter((row) => row.trip_id === trip.id),
    ),
  );
}

// 23505 unique violation (two trips racing for a slug, or an existing id). 23514 check violation.
const isConflict = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";

export const postgresTripStore: TripStore = {
  persistent: true,

  async list() {
    return loadMany(adminSql(), null);
  },

  async get(id) {
    if (!isUuid(id)) return null;
    const [record] = await loadMany(adminSql(), [id]);
    return record ?? null;
  },

  async insert(record) {
    if (!isUuid(record.id)) throw new Error("Trip ids must be UUIDs when the database is used");
    try {
      await adminSql().begin((tx) => writeTrip(tx, record, true));
      return true;
    } catch (error) {
      if (isConflict(error)) return false;
      throw error;
    }
  },

  async replace(record) {
    if (!isUuid(record.id)) return false;
    try {
      return await adminSql().begin((tx) => writeTrip(tx, record, false));
    } catch (error) {
      // Two trips racing for the same slug: the unique index decides, the editor shows a normal error.
      if (isConflict(error)) return false;
      throw error;
    }
  },

  async remove(id) {
    if (!isUuid(id)) return false;
    const rows = await adminSql()`DELETE FROM trips WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  },

  async slugTaken(locale, slug, exceptId) {
    const except = uuidOrNull(exceptId ?? null);
    // Taken by another trip's translation, or reserved by another trip's redirect: an old URL is never
    // reused for a different trip (plan section 5).
    const rows = await adminSql()`
      SELECT 1 FROM trip_translations
        WHERE locale = ${locale} AND slug = ${slug} AND trip_id IS DISTINCT FROM ${except}::uuid
      UNION ALL
      SELECT 1 FROM redirects
        WHERE old_path = ${redirectPath(locale, slug)} AND trip_id IS DISTINCT FROM ${except}::uuid
      LIMIT 1`;
    return rows.length > 0;
  },
};
