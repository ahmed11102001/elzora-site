import type { MetadataRoute } from "next";
import { getDestinationViews, getTripSitemapEntries } from "@/content/public";
import { destinationSlug } from "@/content/destination-slugs";
import { locales, type Locale } from "@/i18n/config";
import { routePath, sitemapRoutes } from "@/lib/routes";
import { siteUrl } from "@/lib/site";
import { tripPublicPath } from "@/lib/trip-paths";

type Entry = MetadataRoute.Sitemap[number];

// One entry per URL, each listing the alternates that really exist. Trips: only visible (published)
// translations. Drafts and previews never appear. lastModified comes from the trip's last edit.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const alt = (paths: Partial<Record<Locale, string>>) =>
    Object.fromEntries(Object.entries(paths).map(([l, p]) => [l, `${siteUrl}${p}`])) as Record<
      string,
      string
    >;

  const home: Entry[] = locales.map((lang) => ({
    url: `${siteUrl}/${lang}`,
    alternates: { languages: alt(Object.fromEntries(locales.map((l) => [l, `/${l}`]))) },
  }));

  const pages: Entry[] = sitemapRoutes.flatMap((key) =>
    locales.map((lang) => ({
      url: `${siteUrl}${routePath(lang, key)}`,
      alternates: {
        languages: alt(Object.fromEntries(locales.map((l) => [l, routePath(l, key)]))),
      },
    })),
  );

  const destinations: Entry[] = (
    await Promise.all(
      locales.map(async (lang) =>
        (await getDestinationViews(lang)).map((place) => ({
          url: `${siteUrl}${routePath(lang, "destinations", `/${place.slug}`)}`,
          alternates: {
            languages: alt(
              Object.fromEntries(
                Object.keys(place.slugs).map((l) => [
                  l,
                  routePath(
                    l as Locale,
                    "destinations",
                    `/${destinationSlug(place.id, l as Locale)}`,
                  ),
                ]),
              ),
            ),
          },
        })),
      ),
    )
  ).flat();

  const trips: Entry[] = (await getTripSitemapEntries()).flatMap((trip) => {
    if (trip.noindex) return [];
    const paths = Object.fromEntries(
      Object.entries(trip.slugs).map(([l, slug]) => [
        l,
        tripPublicPath(l as Locale, slug as string),
      ]),
    ) as Partial<Record<Locale, string>>;
    return Object.values(paths).map((path) => ({
      url: `${siteUrl}${path}`,
      ...(trip.lastModified ? { lastModified: trip.lastModified } : {}),
      alternates: { languages: alt(paths) },
    }));
  });

  return [...home, ...pages, ...destinations, ...trips];
}
