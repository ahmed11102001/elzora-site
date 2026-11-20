import type { Locale } from "../trips/model";

// Public path of a trip (plan section 5). When the 7.0-7.3 route-map helpers land, replace the body of
// tripPublicPath with a call to them; nothing else in the dashboard builds public URLs.
const TRIP_SEGMENT: Record<Locale, string> = { en: "trips", de: "reisen" };

export const tripPublicPath = (locale: Locale, slug: string): string =>
  `/${locale}/${TRIP_SEGMENT[locale]}/${encodeURIComponent(slug)}`;
