// Cache tags shared by the dashboard (which invalidates them) and the public data layer (which must tag its
// cached reads with them). Pure constants so both sides import the same names.
export const TRIPS_TAG = "trips"; // listings, featured trips, destination pages that list trips
export const SITEMAP_TAG = "sitemap";
export const tripTag = (tripId: string) => `trip:${tripId}`;

/** Everything that can change when one trip is published, edited while live, or unpublished. */
export const tagsForTrip = (tripId: string): string[] => [tripTag(tripId), TRIPS_TAG, SITEMAP_TAG];
