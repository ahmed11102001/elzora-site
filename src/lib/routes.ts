import { defaultLocale, locales, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/**
 * The single route map. It lists the public path of every page in each language (without the locale
 * prefix). The English path is also the INTERNAL file path under src/app/[lang]; the proxy rewrites a
 * localized public path to it (see src/lib/proxy-logic.ts). No localized route text may live anywhere
 * else: build links with routePath() / the helpers below.
 */
export const routeMap = {
  planner: { en: "/plan-your-trip", de: "/reise-planen" },
  plannerConfirmation: { en: "/plan-your-trip/confirmation", de: "/reise-planen/bestaetigung" },
  about: { en: "/about", de: "/ueber-uns" },
  contact: { en: "/contact", de: "/kontakt" },
  privacy: { en: "/privacy", de: "/datenschutz" },
  terms: { en: "/terms", de: "/agb" },
  cookies: { en: "/cookies", de: "/cookies" },
  imprint: { en: "/imprint", de: "/impressum" },
  trips: { en: "/trips", de: "/reisen" },
  destinations: { en: "/destinations", de: "/reiseziele" },
  journal: { en: "/journal", de: "/reisemagazin" },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routeMap;

/** Public URL path of a page, with the locale prefix. `rest` is an optional trailing path (a slug). */
export const routePath = (lang: Locale, key: RouteKey, rest = "") =>
  `/${lang}${routeMap[key][lang]}${rest}`;

/** Routes whose page exists and belong in the sitemap. The home page is added separately. */
export const sitemapRoutes: RouteKey[] = [
  "trips",
  "destinations",
  "planner",
  "about",
  "contact",
  "privacy",
  "terms",
  "cookies",
];

/** Header navigation: only routes that exist. */
export const navRoutes: { key: keyof Dictionary["nav"]; route: RouteKey }[] = [
  { key: "trips", route: "trips" },
  { key: "destinations", route: "destinations" },
  { key: "about", route: "about" },
  { key: "contact", route: "contact" },
];

/** Trip planner (Phase 6) and the pages around it. Always build these links with the helpers. */
export const plannerPath = (lang: Locale) => routePath(lang, "planner");
export const plannerConfirmationPath = (lang: Locale) => routePath(lang, "plannerConfirmation");
export const privacyPath = (lang: Locale) => routePath(lang, "privacy");

// ---------------------------------------------------------------------------------------------
// Matching. Pure functions, no framework imports, so they are unit tested (routes.test.ts).
// ---------------------------------------------------------------------------------------------

const segmentsOf = (path: string) => path.split("/").filter(Boolean);

// Longest paths first, so "/plan-your-trip/confirmation" wins over "/plan-your-trip".
const entries = (Object.keys(routeMap) as RouteKey[])
  .map((key) => ({ key, segments: segmentsOf(routeMap[key].en).length }))
  .sort((a, b) => b.segments - a.segments);

const startsWith = (tail: string[], prefix: string[]) =>
  prefix.length > 0 && prefix.every((segment, i) => tail[i] === segment);

export type ResolvedRoute = {
  key: RouteKey;
  /** "localized": matched the public path of the language. "internal": matched the English path. */
  kind: "localized" | "internal";
  /** What follows the matched segments, "" or "/something" (for example a trip slug). */
  rest: string;
};

/**
 * Finds the route for the part of a URL after the locale prefix. The public (localized) path is
 * tried first; if it is not a match, the internal English path is tried. Returns null for anything
 * that is not a known route (the home page included).
 */
export function resolveTail(lang: Locale, tail: string): ResolvedRoute | null {
  const parts = segmentsOf(tail);
  for (const kind of ["localized", "internal"] as const) {
    for (const { key } of entries) {
      const prefix = segmentsOf(routeMap[key][kind === "localized" ? lang : defaultLocale]);
      if (startsWith(parts, prefix)) {
        const rest = parts.slice(prefix.length);
        return { key, kind, rest: rest.length ? `/${rest.join("/")}` : "" };
      }
    }
  }
  return null;
}

/** The path of the same page in another language (used by the language switcher). */
export function switchLocalePath(pathname: string, to: Locale): string {
  const [first, ...others] = segmentsOf(pathname);
  const from = locales.find((l) => l === first);
  if (!from) return `/${to}`;
  const tail = others.length ? `/${others.join("/")}` : "";
  const resolved = resolveTail(from, tail);
  if (!resolved) return `/${to}${tail}`;
  return routePath(to, resolved.key, resolved.rest);
}
