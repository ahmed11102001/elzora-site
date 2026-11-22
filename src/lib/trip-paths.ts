import type { Locale } from "@/i18n/config";
import { routePath } from "./routes";

// Public path of a trip from the shared route map: /en/trips/<slug>, /de/reisen/<slug>. Used by the public
// pages, the sitemap, the preview and the dashboard (which stores redirects with these paths).
export const tripPublicPath = (locale: Locale, slug: string): string =>
  routePath(locale, "trips", `/${slug}`);

/** The path stored in `redirects.old_path` / `new_path` for a trip slug. */
export const redirectPath = tripPublicPath;

/** Reads the slug back out of a stored redirect path of this language, or null if it is not one. */
export function slugFromRedirectPath(locale: Locale, path: string): string | null {
  const prefix = routePath(locale, "trips", "/");
  if (!path.startsWith(prefix)) return null;
  const slug = path.slice(prefix.length);
  return slug !== "" && !slug.includes("/") ? slug : null;
}
