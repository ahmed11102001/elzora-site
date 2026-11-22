import "server-only";
import { z } from "zod";
import { locales, type Locale } from "@/i18n/config";
import { allowedStatuses, contentSource, getDestinations } from "./index";
import { loadPublicTrips, loadTripForPreview, loadTripRedirect } from "./db/public-trips";
import { destinationSlug } from "./destination-slugs";
import { Trip } from "./schema";
import { trips as tripSeed } from "./seed/trips";
import {
  filterViews,
  publicTripsFromSeed,
  toView,
  viewsFor,
  type PublicTrip,
  type TripFilter,
  type TripView,
} from "./trips-public";
import { redirectPath, slugFromRedirectPath } from "@/lib/trip-paths";

/**
 * The public, language-aware read of trips (7.3). Pages use only this module for trips: it returns
 * published content (plus "review" while SHOW_REVIEW_CONTENT allows it), per language, with no English
 * fallback. Drafts never come through here; they reach a page only through the signed preview.
 */

async function allTrips(): Promise<PublicTrip[]> {
  if (contentSource === "seed") return publicTripsFromSeed(z.array(Trip).parse(tripSeed));
  return loadPublicTrips(allowedStatuses());
}

export async function getPublicTrips(lang: Locale, filter: TripFilter = {}): Promise<TripView[]> {
  return filterViews(viewsFor(await allTrips(), lang, allowedStatuses()), filter);
}

export async function getPublicTrip(lang: Locale, slug: string): Promise<TripView | null> {
  const allowed = allowedStatuses();
  for (const trip of await allTrips()) {
    const view = toView(trip, lang, allowed);
    if (view && view.slug === slug) return view;
  }
  return null;
}

export async function getFeaturedTrips(lang: Locale, limit = 3): Promise<TripView[]> {
  return (await getPublicTrips(lang)).slice(0, limit);
}

/**
 * Where an old address of a trip moved to (a stored 301), or null. The target must be visible, so a
 * redirect never points at a page that would answer 404.
 */
export async function getTripRedirect(lang: Locale, oldSlug: string): Promise<string | null> {
  if (contentSource !== "database") return null;
  const target = await loadTripRedirect(redirectPath(lang, oldSlug));
  const slug = target ? slugFromRedirectPath(lang, target) : null;
  return slug && (await getPublicTrip(lang, slug)) ? target : null;
}

/** For the language switcher: for each language, slug -> slug of the same trip in the other languages. */
export async function getTripSlugMap(): Promise<
  Record<Locale, Record<string, Partial<Record<Locale, string>>>>
> {
  const map: Record<Locale, Record<string, Partial<Record<Locale, string>>>> = { en: {}, de: {} };
  const allowed = allowedStatuses();
  for (const trip of await allTrips()) {
    for (const lang of locales) {
      const view = toView(trip, lang, allowed);
      if (view) map[lang][view.slug] = view.slugs;
    }
  }
  return map;
}

/** Sitemap entries: one per trip, with the URL slug of every visible language. */
export async function getTripSitemapEntries() {
  const allowed = allowedStatuses();
  const entries: {
    slugs: Partial<Record<Locale, string>>;
    lastModified: string | null;
    noindex: boolean;
  }[] = [];
  for (const trip of await allTrips()) {
    const en = toView(trip, "en", allowed);
    const view = en ?? toView(trip, "de", allowed);
    if (!view) continue;
    const noindexAll = locales.every((l) => !trip.translations[l] || trip.translations[l]?.noindex);
    entries.push({ slugs: view.slugs, lastModified: view.updatedAt, noindex: noindexAll });
  }
  return entries;
}

// ------------------------------------------------------------------------------------ destinations

export type DestinationView = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  facts: { label: string; value: string }[];
  image: Awaited<ReturnType<typeof getDestinations>>[number]["image"];
  slugs: Partial<Record<Locale, string>>;
};

/** A destination exists in a language only when that language has its name, tagline and summary. */
export async function getDestinationViews(lang: Locale): Promise<DestinationView[]> {
  const all = await getDestinations();
  return all.flatMap((d) => {
    const name = d.name[lang];
    const tagline = d.tagline[lang];
    const summary = d.summary[lang];
    if (!name || !tagline || !summary) return [];
    const slugs: Partial<Record<Locale, string>> = {};
    for (const l of locales)
      if (d.name[l] && d.tagline[l] && d.summary[l]) slugs[l] = destinationSlug(d.id, l);
    return {
      id: d.id,
      slug: destinationSlug(d.id, lang),
      name,
      tagline,
      summary,
      facts: d.facts.flatMap((f) => {
        const label = f.label[lang];
        const value = f.value[lang];
        return label && value ? [{ label, value }] : [];
      }),
      image: d.image,
      slugs,
    };
  });
}

export async function getDestinationView(
  lang: Locale,
  slug: string,
): Promise<DestinationView | null> {
  return (await getDestinationViews(lang)).find((d) => d.slug === slug) ?? null;
}

// ------------------------------------------------------------------------------------------ preview

const ALL_STATUSES = ["draft", "review", "published"] as const;

/**
 * One trip in one language including drafts, for the signed preview page ONLY. The caller must have
 * checked the preview token first (src/lib/preview-access.ts); this function does not.
 */
export async function getPreviewTrip(tripId: string, lang: Locale): Promise<TripView | null> {
  const trip =
    contentSource === "database"
      ? await loadTripForPreview(tripId)
      : (publicTripsFromSeed(z.array(Trip).parse(tripSeed)).find((t) => t.id === tripId) ?? null);
  return trip ? toView(trip, lang, ALL_STATUSES) : null;
}
