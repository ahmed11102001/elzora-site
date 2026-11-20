import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Status } from "../schema";
import { assembleTrips } from "./mapping";
import { loadTripRows } from "./queries";

/**
 * Trips from Postgres, in the shape the site uses. Cached (Cache Components requires uncached data
 * to sit in a "use cache" function) and tagged "trips" so publishing can refresh it. Only plain
 * serializable data leaves this function.
 */
export async function loadTripsFromDatabase(statuses: Status[]) {
  "use cache";
  cacheTag("trips");
  cacheLife("minutes");
  const { trips, translations } = await loadTripRows(statuses);
  return assembleTrips(trips, translations, statuses);
}
