import type { Metadata } from "next";
import type { TripView } from "@/content/trips-public";
import { defaultLocale, locales } from "@/i18n/config";
import { tripPublicPath } from "./trip-paths";

/**
 * Metadata of a public trip page: unique title and description (the editor's SEO fields, else the trip's
 * own), canonical, hreflang for the languages where the trip is visible, Open Graph and robots.
 */
export function tripMetadata(trip: TripView): Metadata {
  const title = trip.metaTitle || trip.title;
  const description = trip.metaDescription || trip.summary;
  const languages: Record<string, string> = {};
  for (const l of locales) {
    const slug = trip.slugs[l];
    if (slug) languages[l] = tripPublicPath(l, slug);
  }
  const fallback = trip.slugs[defaultLocale] ? defaultLocale : locales.find((l) => trip.slugs[l]);
  if (fallback) languages["x-default"] = languages[fallback];

  const image = trip.ogImage ?? trip.image?.photoId;
  return {
    title,
    description,
    alternates: {
      canonical: trip.canonicalOverride || tripPublicPath(trip.lang, trip.slug),
      languages,
    },
    robots: trip.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title,
      description,
      locale: trip.lang === "de" ? "de_DE" : "en_GB",
      url: tripPublicPath(trip.lang, trip.slug),
      ...(image
        ? { images: [{ url: `/images/${image}-1280.webp`, alt: trip.image?.alt || title }] }
        : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}
