// Imports the seed trips into Postgres (Phase 7.2).
//
//   npm run content:seed            insert trips that are not in the database yet (safe to re-run)
//   npm run content:seed -- --update  also overwrite trips that already exist (development only: this
//                                    replaces edits made in the database or the dashboard)
//   npm run content:seed -- --dry-run print what would be written, change nothing
//
// Needs DATABASE_URL and the 0002 migration (npm run db:migrate). Everything runs in one transaction.
import { z } from "zod";
import { Trip } from "../src/content/schema.ts";
import manifest from "../src/content/images.generated.json" with { type: "json" };
import { trips as tripSeed } from "../src/content/seed/trips.ts";
import { assertUniqueSlugs, toTripRecord } from "../src/content/db/mapping.ts";

const update = process.argv.includes("--update");
const dryRun = process.argv.includes("--dry-run");

const trips = z.array(Trip).parse(tripSeed);
const unsupported = trips.filter((trip) => trip.partnerId);
if (unsupported.length > 0) {
  console.error(
    `Trips with a partnerId cannot be imported yet (partners arrive in 7.6): ${unsupported.map((t) => t.id).join(", ")}`,
  );
  process.exit(1);
}
const records = trips.map((trip, index) => toTripRecord(trip, index));
assertUniqueSlugs(records);

const licenseStatus = (status) =>
  status === "ok" ? "confirmed" : status === "blocked" ? "blocked" : "unconfirmed";
const photoIds = [...new Set(records.map((r) => r.mainPhotoId).filter(Boolean))];

console.log(`${records.length} trip(s) from the seed, ${photoIds.length} image(s)`);
for (const r of records) {
  const slugs = r.translations.map((t) => `${t.locale}:${t.slug} (${t.status})`).join("  ");
  console.log(`  ${r.seedKey}  ->  ${slugs}`);
}
if (dryRun) {
  console.log("Dry run: nothing written.");
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local or export it, then run again.");
  process.exit(1);
}
const TEXT_ARRAY = 1009;
const { default: postgres } = await import("postgres"); // not needed for --dry-run
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  await sql.begin(async (tx) => {
    const mediaIds = new Map();
    for (const photoId of photoIds) {
      const info = manifest[photoId];
      const credit = info.credit ?? null;
      const [row] = await tx`
        INSERT INTO media_assets (photo_id, width, height, source, credit, license_status)
        VALUES (${photoId}, ${info.width}, ${info.height}, ${credit ? credit.split(" / ").pop() : null},
                ${credit}, ${licenseStatus(info.status)})
        ON CONFLICT (photo_id) DO UPDATE SET
          width = EXCLUDED.width, height = EXCLUDED.height, source = EXCLUDED.source,
          credit = EXCLUDED.credit, license_status = EXCLUDED.license_status
        RETURNING id`;
      mediaIds.set(photoId, row.id);
    }

    for (const r of records) {
      const mainMediaId = r.mainPhotoId ? mediaIds.get(r.mainPhotoId) : null;
      const existing = await tx`SELECT id FROM trips WHERE seed_key = ${r.seedKey}`;
      if (existing.length > 0 && !update) {
        console.log(`skip    ${r.seedKey} (already in the database)`);
        continue;
      }
      const fields = {
        durationDays: r.durationDays,
        price: r.priceFromEUR,
        styles: tx.array(r.styleIds, TEXT_ARRAY),
        destinations: tx.array(r.destinationIds, TEXT_ARRAY),
      };
      const [trip] =
        existing.length > 0
          ? await tx`
              UPDATE trips SET duration_days = ${fields.durationDays}, price_from_eur = ${fields.price},
                style_ids = ${fields.styles}, destination_ids = ${fields.destinations},
                sort_order = ${r.sortOrder}, main_media_id = ${mainMediaId}
              WHERE seed_key = ${r.seedKey} RETURNING id`
          : await tx`
              INSERT INTO trips (seed_key, duration_days, price_from_eur, style_ids, destination_ids,
                                 sort_order, main_media_id)
              VALUES (${r.seedKey}, ${fields.durationDays}, ${fields.price}, ${fields.styles},
                      ${fields.destinations}, ${r.sortOrder}, ${mainMediaId})
              RETURNING id`;

      for (const t of r.translations) {
        await tx`
          INSERT INTO trip_translations (trip_id, locale, slug, title, summary, highlights, itinerary,
                                         inclusions, exclusions, status, published_at)
          VALUES (${trip.id}, ${t.locale}, ${t.slug}, ${t.title}, ${t.summary},
                  ${tx.json(t.highlights)}, ${tx.json(t.itinerary)}, ${tx.json(t.inclusions)},
                  ${tx.json(t.exclusions)}, ${t.status},
                  ${t.status === "published" ? new Date() : null})
          ON CONFLICT (trip_id, locale) DO UPDATE SET
            slug = EXCLUDED.slug, title = EXCLUDED.title, summary = EXCLUDED.summary,
            highlights = EXCLUDED.highlights, itinerary = EXCLUDED.itinerary,
            inclusions = EXCLUDED.inclusions, exclusions = EXCLUDED.exclusions,
            status = EXCLUDED.status
          WHERE ${update}`;
      }
      console.log(`${existing.length > 0 ? "update  " : "insert  "}${r.seedKey}`);
    }
  });
  console.log("Done. Next: npm run content:verify");
} catch (error) {
  console.error("Seed import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
