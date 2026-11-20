import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { routePath, sitemapRoutes } from "@/lib/routes";
import { siteUrl } from "@/lib/site";

// Every URL lists the localized URL of each language as its alternate.
export default function sitemap(): MetadataRoute.Sitemap {
  const home = locales.map((locale) => ({
    url: `${siteUrl}/${locale}`,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}`])),
    },
  }));
  const pages = sitemapRoutes.flatMap((key) =>
    locales.map((locale) => ({
      url: `${siteUrl}${routePath(locale, key)}`,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}${routePath(l, key)}`])),
      },
    })),
  );
  return [...home, ...pages];
}
