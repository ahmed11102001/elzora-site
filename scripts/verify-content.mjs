// Checks that the database holds exactly what the seed files hold (Phase 7.2).
//
//   npm run content:verify
//
// Reads the trips from Postgres through the same mapping the website uses and compares them with the
// validated seed, field by field. Also checks the 0002 migration (lead status model, tables).
import { deepStrictEqual } from "node:assert/strict";
import postgres from "postgres";
import { z } from "zod";
import { Trip } from "../src/content/schema.ts";
import { trips as tripSeed } from "../src/content/seed/trips.ts";
import { assembleTrips } from "../src/content/db/mapping.ts";
import { TranslationRow, TripRow } from "../src/content/db/schema.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local or export it, then run again.");
  process.exit(2);
}
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
let failures = 0;
const check = (ok, label, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN
      ('trips','trip_translations','media_assets','trip_media','redirects','lead_activity')`;
  check(tables.length === 6, "content tables exist (migration 0002 applied)", `${tables.length}/6`);

  const statuses = (
    await sql`
    SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lead_status' ORDER BY e.enumsortorder`
  ).map((r) => r.enumlabel);
  check(
    JSON.stringify(statuses) ===
      JSON.stringify(["new", "contacted", "qualified", "proposal_sent", "converted", "lost"]),
    "lead statuses are new, contacted, qualified, proposal_sent, converted, lost",
    statuses.join(", "),
  );

  const tripRows = (
    await sql`
      SELECT t.id, t.seed_key, t.duration_days, t.price_from_eur, t.style_ids, t.destination_ids,
             t.sort_order, m.photo_id AS main_photo_id
      FROM trips t LEFT JOIN media_assets m ON m.id = t.main_media_id
      WHERE t.archived_at IS NULL`
  ).map((r) => TripRow.parse(r));
  const translationRows = (
    await sql`
      SELECT trip_id, locale, slug, title, summary, highlights, itinerary, inclusions, exclusions, status
      FROM trip_translations`
  ).map((r) => TranslationRow.parse(r));

  const expected = z.array(Trip).parse(tripSeed);
  const actual = assembleTrips(tripRows, translationRows, ["draft", "review", "published"]);
  check(
    actual.length === expected.length,
    "same number of trips",
    `${actual.length} in the database, ${expected.length} in the seed`,
  );

  for (const trip of expected) {
    const found = actual.find((t) => t.id === trip.id);
    if (!found) {
      check(false, `trip "${trip.id}" is in the database`);
      continue;
    }
    try {
      deepStrictEqual(found, z.array(Trip).parse([trip])[0]);
      check(true, `trip "${trip.id}" matches the seed field by field`);
    } catch (error) {
      check(
        false,
        `trip "${trip.id}" matches the seed`,
        String(error.message).split("\n").slice(0, 6).join(" | "),
      );
    }
  }

  const missingDe = tripRows.filter(
    (t) => !translationRows.some((x) => x.trip_id === t.id && x.locale === "de"),
  );
  check(
    missingDe.length === 0,
    "every trip has a German translation",
    missingDe.map((t) => t.seed_key).join(", "),
  );
  const untranslated = translationRows.filter((x) => x.locale === "de" && x.itinerary.length === 0);
  if (untranslated.length > 0) {
    console.log(
      `NOTE  ${untranslated.length} German itinerary(ies) are not translated yet (needed before the German pages are published)`,
    );
  }
} catch (error) {
  failures += 1;
  console.error("Verification could not run:", error instanceof Error ? error.message : error);
} finally {
  await sql.end();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
