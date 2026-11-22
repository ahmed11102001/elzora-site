// Applies db/grants.sql: least-privilege roles for decision D2 (docs/phase-7/7.7-kpis-and-hardening.md).
//
//   npm run db:grants              before launch: public roles may read "review" and "published" translations
//   npm run db:grants -- --launch  at launch: public roles may read "published" translations only
//
// Needs DATABASE_URL of a privileged user (the one that runs the migrations). Safe to run again: the file
// takes every privilege back from the four roles first. Create the roles once with db/spikes/roles.sql.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local or export it, then run again.");
  process.exit(1);
}

const launch = process.argv.includes("--launch");
const statuses = launch ? "'published'" : "'published', 'review'";
const file = join(import.meta.dirname, "..", "db", "grants.sql");
const text = (await readFile(file, "utf8")).replaceAll("{{CONTENT_STATUSES}}", statuses);

const sql = postgres(url, {
  max: 1,
  prepare: false,
  onnotice: (notice) => console.log(`  ${notice.message}`),
});

try {
  const [tables] = await sql`
    SELECT to_regclass('public.trip_translations') IS NOT NULL AS content,
           to_regclass('public.lead_activity') IS NOT NULL AS activity,
           to_regclass('public.audit_logs') IS NOT NULL AS audit`;
  if (!tables?.content || !tables?.activity || !tables?.audit) {
    console.error("Tables are missing. Run `npm run db:migrate` first.");
    process.exitCode = 1;
  } else {
    const [fn] = await sql`SELECT prosecdef FROM pg_proc WHERE proname = 'leads_log_created'`;
    if (!fn?.prosecdef) {
      console.error(
        "Migration 0005 is not applied (the lead triggers are not SECURITY DEFINER). Run `npm run db:migrate` first.",
      );
      process.exitCode = 1;
    } else {
      console.log(
        launch
          ? "Applying grants (LAUNCH: published content only)"
          : "Applying grants (pre-launch)",
      );
      await sql.begin(async (tx) => {
        await tx.unsafe(text);
      });
      console.log("Done. Check it with: npm run db:verify-privileges");
    }
  }
} catch (error) {
  console.error("Applying grants failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
