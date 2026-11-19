import "server-only";
import { locales, type TripRecord } from "./model";
import { photoLicensed } from "./taxonomy";
import type { ReadinessContext } from "./readiness";
import type { TripStore } from "./store";

/** Collects the answers the pure readiness rules need (duplicate slugs, image licences, the launch switch). */
export async function readinessContext(
  store: TripStore,
  trip: TripRecord,
): Promise<ReadinessContext> {
  const taken = new Set<string>();
  for (const locale of locales) {
    const slug = trip.translations[locale]?.slug;
    if (slug && (await store.slugTaken(locale, slug, trip.id))) taken.add(`${locale}:${slug}`);
  }
  return {
    slugTaken: (locale, slug) => taken.has(`${locale}:${slug}`),
    imageLicense: photoLicensed,
    enforceLicenses: process.env.ENFORCE_IMAGE_LICENSES === "true",
  };
}
