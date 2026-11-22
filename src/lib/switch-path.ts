import { destinationIdFromSlug, destinationSlugs } from "@/content/destination-slugs";
import { locales, type Locale } from "@/i18n/config";
import { resolveTail, routePath, switchLocalePath } from "./routes";

/** For each language: slug of a trip -> slug of the same trip in the languages where it is visible. */
export type TripSlugMap = Record<Locale, Record<string, Partial<Record<Locale, string>>>>;

/**
 * The address of the same page in another language (language switcher). A trip or destination page maps
 * to the translated page with ITS slug, not the same slug; when the other language has none, the switcher
 * goes to that language's list instead of a 404.
 */
export function switchPath(pathname: string, to: Locale, tripSlugs: TripSlugMap): string {
  const [first, ...others] = pathname.split("/").filter(Boolean);
  const from = locales.find((l) => l === first);
  if (from) {
    const resolved = resolveTail(from, others.length ? `/${others.join("/")}` : "");
    const slug = resolved?.rest.split("/").filter(Boolean)[0];
    if (resolved?.key === "trips" && slug && resolved.rest === `/${slug}`) {
      const target = tripSlugs[from][slug]?.[to];
      return routePath(to, "trips", target ? `/${target}` : "");
    }
    if (resolved?.key === "destinations" && slug && resolved.rest === `/${slug}`) {
      const id = destinationIdFromSlug(slug, from);
      return routePath(to, "destinations", id ? `/${destinationSlugs[id][to]}` : "");
    }
  }
  return switchLocalePath(pathname, to);
}
