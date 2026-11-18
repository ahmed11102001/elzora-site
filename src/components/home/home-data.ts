import type { Review, Trip } from "@/content/schema";

// Small, pure helpers shared by the home page sections. No fetching happens here: the page reads
// the content once and passes the result down.

/** How many trips the "Featured trips" section shows (the first ones in content order). */
export const FEATURED_TRIPS_LIMIT = 3;

/** An average rating is only shown once at least this many real reviews back it up. */
export const MIN_REVIEWS_FOR_RATING = 3;

export const featuredTrips = (trips: Trip[]) => trips.slice(0, FEATURED_TRIPS_LIMIT);

/**
 * Only real, confirmed travelers on the public site. This is stricter than the content layer: with
 * SHOW_DRAFT_CONTENT=true the layer also returns drafts, but a review that is not published and
 * verified is never shown.
 */
export const publicReviews = (reviews: Review[]) =>
  reviews.filter((review) => review.verified && review.status === "published");

export function ratingSummary(reviews: Review[]) {
  const list = publicReviews(reviews);
  if (list.length < MIN_REVIEWS_FOR_RATING) return null;
  const average = list.reduce((sum, review) => sum + review.rating, 0) / list.length;
  return { average, count: list.length };
}
