// Dashboard configuration read from the environment. Pure and framework-free (also used by the proxy).
// Nothing here is a secret: the Supabase URL and anon key are public by design (they only allow
// logging in; every authorization decision is made on the server).

type Env = Record<string, string | undefined>;

/**
 * The dashboard is served only on its own host (admin.<domain>), never under the public host.
 * ADMIN_HOST sets the exact host (e.g. "admin.elzora.com"). Without it, any host that starts with
 * "admin." matches, which also covers "admin.localhost:3000" in development.
 */
export function isAdminHost(
  hostHeader: string | null | undefined,
  env: Env = process.env,
): boolean {
  const host = (hostHeader ?? "").toLowerCase();
  if (!host) return false;
  const configured = env.ADMIN_HOST?.trim().toLowerCase();
  return configured ? host === configured : host.startsWith("admin.");
}

/** Public-host paths that must never reach the dashboard routes. */
export const isAdminPath = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/");

/** Internal route for a path requested on the admin host ("/trips" -> "/admin/trips"). */
export const adminInternalPath = (pathname: string) => `/admin${pathname === "/" ? "" : pathname}`;

/** Owner e-mail addresses (comma separated, case-insensitive). Empty means nobody can sign in. */
export function ownerEmails(env: Env = process.env): string[] {
  return (env.DASHBOARD_OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function supabaseConfig(env: Env = process.env): { url: string; anonKey: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}
