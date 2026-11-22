// What the public pages need from a trip, per language (7.3). Pure: no framework, no database. The seed
// files and the database both produce `PublicTrip`; the pages only ever see `TripView`.
import { locales, type Locale } from "@/i18n/config";
import { toTripRecord } from "./db/mapping";
import type { z } from "zod";
import type { PhotoIdSchema, Status, Trip } from "./schema";

type PhotoId = z.infer<typeof PhotoIdSchema>;

export type PublicDay = {
  day: number;
  title: string;
  description: string;
  destinationId?: string;
  highlights: string[];
};

export type PublicTranslation = {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  highlights: string[];
  itinerary: PublicDay[];
  inclusions: string[];
  exclusions: string[];
  priceNote: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: PhotoId | null;
  canonicalOverride: string;
  noindex: boolean;
  status: Status;
  publishedAt: string | null;
};

export type PublicImage = { photoId: PhotoId; alt: { en: string; de: string } };

/** A trip with every language it has. Plain, serializable data (it crosses the "use cache" boundary). */
export type PublicTrip = {
  id: string;
  featured: boolean;
  sortOrder: number;
  durationDays: number;
  priceFromEUR: number | null;
  budgetCategory: string;
  styleIds: string[];
  destinationIds: string[];
  image: PublicImage | null;
  gallery: PublicImage[];
  updatedAt: string | null;
  translations: Partial<Record<Locale, PublicTranslation>>;
};

/** One trip in one language: what a card or a page renders. No English fallback in German. */
export type TripView = Omit<PublicTranslation, "ogImage"> & {
  id: string;
  lang: Locale;
  featured: boolean;
  durationDays: number;
  priceFromEUR: number | null;
  budgetCategory: string;
  styleIds: string[];
  destinationIds: string[];
  image: { photoId: PhotoId; alt: string } | null;
  gallery: { photoId: PhotoId; alt: string }[];
  ogImage: PhotoId | null;
  updatedAt: string | null;
  /** The slug of every language in which this trip is visible, for hreflang and the language switcher. */
  slugs: Partial<Record<Locale, string>>;
};

export function visibleTranslation(
  trip: PublicTrip,
  locale: Locale,
  allowed: readonly Status[],
): PublicTranslation | null {
  const t = trip.translations[locale];
  return t && t.slug !== "" && allowed.includes(t.status) ? t : null;
}

export function toView(
  trip: PublicTrip,
  locale: Locale,
  allowed: readonly Status[],
): TripView | null {
  const t = visibleTranslation(trip, locale, allowed);
  if (!t) return null;
  const slugs: Partial<Record<Locale, string>> = {};
  for (const l of locales) {
    const other = visibleTranslation(trip, l, allowed);
    if (other) slugs[l] = other.slug;
  }
  const withAlt = (img: PublicImage) => ({ photoId: img.photoId, alt: img.alt[locale] });
  return {
    ...t,
    id: trip.id,
    lang: locale,
    featured: trip.featured,
    durationDays: trip.durationDays,
    priceFromEUR: trip.priceFromEUR,
    budgetCategory: trip.budgetCategory,
    styleIds: trip.styleIds,
    destinationIds: trip.destinationIds,
    image: trip.image ? withAlt(trip.image) : null,
    gallery: trip.gallery.map(withAlt),
    updatedAt: trip.updatedAt,
    slugs,
  };
}

/** Visible trips of one language: featured first, then the editor's order. */
export function viewsFor(
  trips: PublicTrip[],
  locale: Locale,
  allowed: readonly Status[],
): TripView[] {
  return trips
    .flatMap((trip) => toView(trip, locale, allowed) ?? [])
    .sort((a, b) => Number(b.featured) - Number(a.featured));
}

// ------------------------------------------------------------------------- filters (listing page)

export const DURATION_FILTERS = ["short", "medium", "long"] as const;
export type DurationFilter = (typeof DURATION_FILTERS)[number];
export const durationBucket = (days: number): DurationFilter =>
  days <= 5 ? "short" : days <= 9 ? "medium" : "long";

export type TripFilter = {
  style?: string;
  duration?: DurationFilter;
  budget?: string;
  destination?: string;
};

export function filterViews(views: TripView[], filter: TripFilter): TripView[] {
  return views.filter(
    (t) =>
      (!filter.style || t.styleIds.includes(filter.style)) &&
      (!filter.destination || t.destinationIds.includes(filter.destination)) &&
      (!filter.duration || durationBucket(t.durationDays) === filter.duration) &&
      (!filter.budget || t.budgetCategory === filter.budget),
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Reads and sanitizes the listing's query string: unknown values are dropped, never trusted. */
export function parseFilter(
  query: Record<string, string | string[] | undefined>,
  known: { styles: string[]; destinations: string[]; budgets: readonly string[] },
): TripFilter {
  const style = first(query.style);
  const destination = first(query.destination);
  const duration = first(query.duration);
  const budget = first(query.budget);
  return {
    style: style && known.styles.includes(style) ? style : undefined,
    destination: destination && known.destinations.includes(destination) ? destination : undefined,
    duration: DURATION_FILTERS.find((d) => d === duration),
    budget: budget && known.budgets.includes(budget) ? budget : undefined,
  };
}

// --------------------------------------------------------------------------------- seed -> PublicTrip

/** The site's seed trips in the same shape the database produces (used while CONTENT_SOURCE=seed). */
export function publicTripsFromSeed(trips: Trip[]): PublicTrip[] {
  return trips.map((trip, index) => {
    const record = toTripRecord(trip, (index + 1) * 10);
    const translations: PublicTrip["translations"] = {};
    for (const t of record.translations) {
      translations[t.locale] = {
        slug: t.slug,
        title: t.title,
        subtitle: "",
        summary: t.summary,
        description: "",
        highlights: t.highlights,
        itinerary: t.itinerary.map((d) => ({ ...d, highlights: [] })),
        inclusions: t.inclusions,
        exclusions: t.exclusions,
        priceNote: "",
        metaTitle: "",
        metaDescription: "",
        ogImage: null,
        canonicalOverride: "",
        noindex: false,
        status: t.status,
        publishedAt: null,
      };
    }
    return {
      id: trip.id,
      featured: index === 0,
      sortOrder: record.sortOrder,
      durationDays: trip.durationDays,
      priceFromEUR: trip.priceFromEUR ?? null,
      budgetCategory: "",
      styleIds: trip.styleIds,
      destinationIds: trip.destinationIds,
      image: trip.image ? { photoId: trip.image, alt: { en: "", de: "" } } : null,
      gallery: [],
      updatedAt: null,
      translations,
    };
  });
}
