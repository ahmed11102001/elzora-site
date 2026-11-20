import "server-only";
import postgres, { type Sql } from "postgres";

// Shared server-only connection for CONTENT reads (trips). The leads storage keeps its own connection
// (src/lib/leads/storage.ts) and is not affected.
//
// DATABASE_URL_PUBLIC is for the limited read role of decision D2 (docs/phase-7/7.0-design.md). Do not
// set it until that role has its grants (7.7): until then reads use DATABASE_URL.

const globalForSql = globalThis as unknown as { __elzoraContentSql?: Sql };

export function getContentSql(): Sql {
  const url = process.env.DATABASE_URL_PUBLIC || process.env.DATABASE_URL;
  if (!url) throw new Error("CONTENT_SOURCE=database needs DATABASE_URL");
  globalForSql.__elzoraContentSql ??= postgres(url, {
    max: 1, // one connection per serverless instance; the pooler does the multiplexing
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required by transaction poolers (Supabase port 6543)
  });
  return globalForSql.__elzoraContentSql;
}
