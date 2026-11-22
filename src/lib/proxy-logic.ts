import { defaultLocale, hasLocale, locales, type Locale } from "@/i18n/config";
import { resolveTail, routeMap } from "./routes";

/** Picks the best supported locale from the Accept-Language header. */
export function negotiateLocale(header: string | null): Locale {
  if (!header) return defaultLocale;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((item) => item.tag && !Number.isNaN(item.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    const base = tag.split("-")[0];
    if (hasLocale(base)) return base;
  }
  return defaultLocale;
}

export type RouteDecision =
  | { type: "next" }
  | { type: "rewrite"; pathname: string }
  | { type: "redirect"; pathname: string; permanent: boolean };

const join = (lang: Locale, tail: string) => `/${lang}${tail === "/" ? "" : tail}`;

/**
 * What the proxy does with a request path (query strings are handled by the caller):
 *  - /de/datenschutz        -> rewrite to the internal page /de/privacy (the URL stays German)
 *  - /de/privacy            -> redirect to /de/datenschutz (one public URL per page)
 *  - /en/datenschutz        -> next (not a route in English, so the normal 404)
 *  - /privacy, /datenschutz -> temporary redirect (it depends on Accept-Language) to the localized URL
 *    of the negotiated, or matching, language. Same-language redirects are permanent.
 */
export function decideRoute(pathname: string, acceptLanguage: string | null): RouteDecision {
  const parts = pathname.split("/").filter(Boolean);
  const lang = locales.find((l) => l === parts[0]);

  if (lang) {
    const tail = parts.length > 1 ? `/${parts.slice(1).join("/")}` : "";
    const resolved = resolveTail(lang, tail);
    if (!resolved) return { type: "next" };
    const internal = `${routeMap[resolved.key][defaultLocale]}${resolved.rest}`;
    const localized = `${routeMap[resolved.key][lang]}${resolved.rest}`;
    if (resolved.kind === "localized") {
      return internal === tail
        ? { type: "next" }
        : { type: "rewrite", pathname: join(lang, internal) };
    }
    return localized === tail
      ? { type: "next" }
      : { type: "redirect", pathname: join(lang, localized), permanent: true };
  }

  // No locale prefix: choose the language, and use the localized path of that language when the
  // request names a known route (in English, or in the words of the other language).
  const tail = pathname === "/" ? "" : pathname;
  const preferred = negotiateLocale(acceptLanguage);
  for (const candidate of [preferred, ...locales.filter((l) => l !== preferred)]) {
    const resolved = resolveTail(candidate, tail);
    if (resolved) {
      const target = `${routeMap[resolved.key][candidate]}${resolved.rest}`;
      return { type: "redirect", pathname: join(candidate, target), permanent: false };
    }
  }
  return { type: "redirect", pathname: join(preferred, tail), permanent: false };
}

/**
 * A trip address opened with a valid preview cookie is served by the draft preview page instead of the
 * public one: /de/reisen/<slug> -> /de/trips/<slug>/preview. Returns null for every other path. The preview
 * page checks the cookie again, so this rewrite alone never reveals a draft.
 */
export function previewRewrite(pathname: string, lang: Locale): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== lang) return null;
  const resolved = resolveTail(lang, parts.length > 1 ? `/${parts.slice(1).join("/")}` : "");
  if (resolved?.key !== "trips" || !/^\/[^/]+$/.test(resolved.rest)) return null;
  return `/${lang}${routeMap.trips[defaultLocale]}${resolved.rest}/preview`;
}
