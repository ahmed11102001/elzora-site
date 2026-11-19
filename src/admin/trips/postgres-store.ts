import "server-only";
// Postgres implementation of TripStore (7.4C). Tables: db/migrations/0020_dashboard_trips.sql.
// Each write is one transaction, so a trip, its translations, its media and its redirects never disagree.
import type { Sql, TransactionSql } from "postgres";
import { adminSql } from "../db/sql";
import { locales, type TripRecord } from "./model";
import {
  mediaRows,
  recordFromRows,
  redirectRows,
  type MediaRow,
  type TranslationRow,
  type TripRow,
} from "./rows";
import type { TripStore } from "./store";

type Tx = TransactionSql;

// postgres.js types json() narrowly; our values are already validated plain JSON.
const json = (tx: Tx, value: unknown) => tx.json(value as never);

async function writeChildren(tx: Tx, record: TripRecord): Promise<void> {
  // Translations: upsert the ones that exist, drop the ones that no longer do (a German draft was removed).
  for (const locale of locales) {
    const t = record.translations[locale];
    if (!t) {
      await tx`DELETE FROM trip_translations WHERE trip_id = ${record.id} AND locale = ${locale}`;
      continue;
    }
    await tx`
      INSERT INTO trip_translations (
        trip_id, locale, slug, title, subtitle, summary, description, highlights, itinerary,
        inclusions, exclusions, price_note, meta_title, meta_description, og_image,
        canonical_override, noindex, status, published_at, slug_history
      ) VALUES (
        ${record.id}, ${locale}, ${t.slug}, ${t.title}, ${t.subtitle}, ${t.summary}, ${t.description},
        ${json(tx, t.highlights)}, ${json(tx, t.itinerary)}, ${json(tx, t.inclusions)},
        ${json(tx, t.exclusions)}, ${t.priceNote}, ${t.metaTitle}, ${t.metaDescription}, ${t.ogImage},
        ${t.canonicalOverride}, ${t.noindex}, ${t.status}, ${t.publishedAt}, ${tx.array(t.slugHistory)}
      )
      ON CONFLICT (trip_id, locale) DO UPDATE SET
        slug = EXCLUDED.slug, title = EXCLUDED.title, subtitle = EXCLUDED.subtitle,
        summary = EXCLUDED.summary, description = EXCLUDED.description,
        highlights = EXCLUDED.highlights, itinerary = EXCLUDED.itinerary,
        inclusions = EXCLUDED.inclusions, exclusions = EXCLUDED.exclusions,
        price_note = EXCLUDED.price_note, meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description, og_image = EXCLUDED.og_image,
        canonical_override = EXCLUDED.canonical_override, noindex = EXCLUDED.noindex,
        status = EXCLUDED.status, published_at = EXCLUDED.published_at,
        slug_history = EXCLUDED.slug_history`;
  }

  // Media is small (main image + at most 12 gallery images): replace it as a whole.
  await tx`DELETE FROM trip_media WHERE trip_id = ${record.id}`;
  for (const row of mediaRows(record)) {
    await tx`
      INSERT INTO trip_media (trip_id, position, is_main, photo_id, alt_en, alt_de)
      VALUES (${row.trip_id}, ${row.position}, ${row.is_main}, ${row.photo_id}, ${row.alt_en}, ${row.alt_de})`;
  }

  // Redirects: a slug that is live again is no longer an "old" slug.
  for (const locale of locales) {
    const slug = record.translations[locale]?.slug;
    if (slug)
      await tx`DELETE FROM redirects WHERE trip_id = ${record.id} AND locale = ${locale} AND old_slug = ${slug}`;
  }
  for (const { locale, oldSlug } of redirectRows(record)) {
    await tx`
      INSERT INTO redirects (locale, old_slug, trip_id) VALUES (${locale}, ${oldSlug}, ${record.id})
      ON CONFLICT (locale, old_slug) DO NOTHING`;
  }
}

async function loadMany(sql: Sql, ids: string[] | null): Promise<TripRecord[]> {
  const trips = await sql<TripRow[]>`
    SELECT * FROM trips ${ids ? sql`WHERE id = ANY(${ids})` : sql``} ORDER BY sort_order, created_at`;
  if (trips.length === 0) return [];
  const tripIds = trips.map((t) => t.id);
  const [translations, media] = await Promise.all([
    sql<TranslationRow[]>`SELECT * FROM trip_translations WHERE trip_id = ANY(${tripIds})`,
    sql<MediaRow[]>`SELECT * FROM trip_media WHERE trip_id = ANY(${tripIds})`,
  ]);
  return trips.map((trip) =>
    recordFromRows(
      trip,
      translations.filter((row) => row.trip_id === trip.id),
      media.filter((row) => row.trip_id === trip.id),
    ),
  );
}

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";

export const postgresTripStore: TripStore = {
  persistent: true,

  async list() {
    return loadMany(adminSql(), null);
  },

  async get(id) {
    const [record] = await loadMany(adminSql(), [id]);
    return record ?? null;
  },

  async insert(record) {
    const sql = adminSql();
    try {
      await sql.begin(async (tx) => {
        await tx`
          INSERT INTO trips (
            id, featured, sort_order, duration_days, flexible_duration, price_from_eur,
            budget_category, style_ids, destination_ids, partner_id, archived_at,
            created_at, created_by, updated_at, updated_by
          ) VALUES (
            ${record.id}, ${record.featured}, ${record.sortOrder}, ${record.durationDays},
            ${record.flexibleDuration}, ${record.priceFromEUR},
            ${record.budgetCategory === "" ? null : record.budgetCategory},
            ${tx.array(record.styleIds)}, ${tx.array(record.destinationIds)}, ${record.partnerId},
            ${record.archivedAt}, ${record.createdAt}, ${record.createdBy}, ${record.updatedAt},
            ${record.updatedBy}
          )`;
        await writeChildren(tx, record);
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  },

  async replace(record) {
    const sql = adminSql();
    try {
      return await sql.begin(async (tx) => {
        const updated = await tx`
          UPDATE trips SET
            featured = ${record.featured}, sort_order = ${record.sortOrder},
            duration_days = ${record.durationDays}, flexible_duration = ${record.flexibleDuration},
            price_from_eur = ${record.priceFromEUR},
            budget_category = ${record.budgetCategory === "" ? null : record.budgetCategory},
            style_ids = ${tx.array(record.styleIds)}, destination_ids = ${tx.array(record.destinationIds)},
            partner_id = ${record.partnerId}, archived_at = ${record.archivedAt},
            updated_at = ${record.updatedAt}, updated_by = ${record.updatedBy}
          WHERE id = ${record.id} RETURNING id`;
        if (updated.length === 0) return false;
        await writeChildren(tx, record);
        return true;
      });
    } catch (error) {
      // Two trips racing for the same slug: the unique index decides, the editor shows a normal error.
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  },

  async remove(id) {
    const rows = await adminSql()`DELETE FROM trips WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  },

  async slugTaken(locale, slug, exceptId) {
    const sql = adminSql();
    const except = exceptId ?? "";
    // A slug is taken by another trip's live row, or reserved by another trip's redirect
    // (an old URL is never reused for a different trip: plan section 5).
    const rows = await sql`
      SELECT 1 FROM trip_translations WHERE locale = ${locale} AND slug = ${slug} AND trip_id <> ${except}
      UNION ALL
      SELECT 1 FROM redirects WHERE locale = ${locale} AND old_slug = ${slug} AND trip_id <> ${except}
      LIMIT 1`;
    return rows.length > 0;
  },
};
