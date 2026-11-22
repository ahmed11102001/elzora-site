import "server-only";
import postgres, { type Sql } from "postgres";

// Shared server-only connection for CONTENT reads (trips). The leads storage keeps its own connection
// (src/lib/leads/storage.ts) and is not affected.
//
// DATABASE_URL_PUBLIC is the limited read role of decision D2: published (and, before launch, review) content
// only. Apply its grants with `npm run db:grants` before setting it (docs/phase-7/7.7-kpis-and-hardening.md).
// DATABASE_URL_PREVIEW is a second limited role that can also read draft translations. It is used ONLY for the
// signed draft preview, after the preview token was verified, so drafts never go through the public role.

const globalForSql = globalThis as unknown as {
  __elzoraContentSql?: Sql;
  __elzoraPreviewSql?: Sql;
};

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

/** Reads for the signed draft preview. Falls back to the content connection when no preview role is set. */
export function getPreviewSql(): Sql {
  const url = process.env.DATABASE_URL_PREVIEW;
  if (!url) return getContentSql();
  globalForSql.__elzoraPreviewSql ??= postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return globalForSql.__elzoraPreviewSql;
}
