import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { routePath, type RouteKey } from "@/lib/routes";

/** Canonical + hreflang alternates for the home page. */
export function localizedAlternates(lang: Locale) {
  const languages: Record<string, string> = Object.fromEntries(locales.map((l) => [l, `/${l}`]));
  languages["x-default"] = `/${defaultLocale}`;
  return { canonical: `/${lang}`, languages };
}

/** Canonical + hreflang alternates for a page of the route map, with each language's own URL. */
export function routeAlternates(lang: Locale, key: RouteKey, rest = "") {
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((l) => [l, routePath(l, key, rest)]),
  );
  languages["x-default"] = routePath(defaultLocale, key, rest);
  return { canonical: routePath(lang, key, rest), languages };
}
