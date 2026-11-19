// Copies the site's seed trips into the dashboard database. Safe to re-run: trips that already exist
// are skipped, nothing is overwritten. Usage: npm run db:seed-trips (needs ADMIN_DATABASE_URL or DATABASE_URL).
import { adminSql } from "../src/admin/db/sql";
import { postgresTripStore } from "../src/admin/trips/postgres-store";
import { seedRecords } from "../src/admin/trips/seed";

let created = 0;
let skipped = 0;
try {
  for (const record of seedRecords()) {
    if (await postgresTripStore.insert(record)) {
      created += 1;
      console.log(`insert ${record.id}`);
    } else {
      skipped += 1;
      console.log(`skip   ${record.id} (already there, or its slug is taken)`);
    }
  }
  console.log(`Done: ${created} added, ${skipped} skipped.`);
} finally {
  await adminSql().end();
}
