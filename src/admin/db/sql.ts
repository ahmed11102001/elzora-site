import "server-only";
import postgres, { type Sql } from "postgres";

// Connection used by the dashboard only. ADMIN_DATABASE_URL (the privileged "admin" role from plan D2) is
// preferred; DATABASE_URL is the fallback so a single-role setup keeps working. Server-side only.
const globalForSql = globalThis as unknown as { __elzoraAdminSql?: Sql };

export const adminDatabaseUrl = (env: Record<string, string | undefined> = process.env) =>
  env.ADMIN_DATABASE_URL?.trim() || env.DATABASE_URL?.trim() || "";

export const adminDatabaseConfigured = () => adminDatabaseUrl() !== "";

export function adminSql(): Sql {
  const url = adminDatabaseUrl();
  if (!url) throw new Error("ADMIN_DATABASE_URL / DATABASE_URL is not set");
  globalForSql.__elzoraAdminSql ??= postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required by transaction poolers (Supabase port 6543)
  });
  return globalForSql.__elzoraAdminSql;
}
