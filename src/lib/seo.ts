import { defaultLocale, locales, type Locale } from "@/i18n/config";

/** Canonical + hreflang alternates for a page. `path` has no locale, e.g. "" or "/trips". */
export function localizedAlternates(lang: Locale, path = "") {
  const languages: Record<string, string> = Object.fromEntries(
    locales.map((l) => [l, `/${l}${path}`]),
  );
  languages["x-default"] = `/${defaultLocale}${path}`;
  return { canonical: `/${lang}${path}`, languages };
}
