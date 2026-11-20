import "server-only";
import { getContentSql } from "@/lib/db";
import type { Status } from "../schema";
import { TranslationRow, TripRow } from "./schema";

/** Reads trips and the translations whose status is allowed. Rows are validated with Zod. */
export async function loadTripRows(statuses: Status[]) {
  const sql = getContentSql();
  const tripRows = await sql`
    SELECT t.id, t.seed_key, t.duration_days, t.price_from_eur, t.style_ids, t.destination_ids,
           t.sort_order, m.photo_id AS main_photo_id
    FROM trips t
    LEFT JOIN media_assets m ON m.id = t.main_media_id
    WHERE t.archived_at IS NULL
    ORDER BY t.sort_order, t.created_at`;
  const trips = tripRows.map((row) => TripRow.parse(row));
  if (trips.length === 0) return { trips, translations: [] };

  const translationRows = await sql`
    SELECT trip_id, locale, slug, title, summary, highlights, itinerary, inclusions, exclusions,
           status
    FROM trip_translations
    WHERE trip_id IN ${sql(trips.map((t) => t.id))} AND status IN ${sql(statuses)}`;
  return { trips, translations: translationRows.map((row) => TranslationRow.parse(row)) };
}
