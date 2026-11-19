// Applies db/migrations/*.sql in order, once each. Usage: npm run db:migrate (needs DATABASE_URL).
// Applied files are recorded in the schema_migrations table; each file runs in one transaction.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local or export it, then run again.");
  process.exit(1);
}

const dir = join(import.meta.dirname, "..", "db", "migrations");
const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done = new Set((await sql`SELECT name FROM schema_migrations`).map((row) => row.name));

  for (const name of files) {
    if (done.has(name)) {
      console.log(`skip   ${name}`);
      continue;
    }
    const content = await readFile(join(dir, name), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO schema_migrations (name) VALUES (${name})`;
    });
    console.log(`apply  ${name}`);
  }
  console.log("Database is up to date.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
