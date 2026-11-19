import "server-only";
import { z } from "zod";
import { Destination, Faq, Partner, Review, Status, Trip, TripStyle } from "./schema";
import { destinations as destinationSeed } from "./seed/destinations";
import { faqs as faqSeed } from "./seed/faqs";
import { partners as partnerSeed } from "./seed/partners";
import { reviews as reviewSeed } from "./seed/reviews";
import { tripStyles as tripStyleSeed } from "./seed/trip-styles";
import { trips as tripSeed } from "./seed/trips";

/**
 * Data access for CMS content. Right now it reads the seed files; every function is async and
 * returns validated data, so swapping in a CMS later only changes this file.
 *
 * Visibility rules (pre-launch): "published" and "review" content is served in every environment, so
 * all sections and pages can be reviewed on the live site. Before the public launch, change
 * `visibleStatuses` back to ["published"]. "draft" is shown only in development with SHOW_DRAFT_CONTENT=true.
 */

/** True in `next dev` only. Used for review previews and development-only placeholders. */
export const isDevPreview = process.env.NODE_ENV !== "production";

const showDrafts = isDevPreview && process.env.SHOW_DRAFT_CONTENT === "true";
// Pre-launch: "published" and "review" content is served everywhere, production included, so every
// section and page that exists is visible for review. Revisit this line before the public launch
// (back to ["published"] only) once the copy is approved. "draft" stays development-only.
const visibleStatuses: Status[] = ["published", "review"];
const visible = <T extends { status: Status }>(items: T[]) =>
  items.filter((item) => showDrafts || visibleStatuses.includes(item.status));

// Validated once at startup/build: a typo in the seed data fails fast with a clear message.
const tripStyles = z.array(TripStyle).parse(tripStyleSeed);
const destinations = z.array(Destination).parse(destinationSeed);
const trips = z.array(Trip).parse(tripSeed);
const reviews = z.array(Review).parse(reviewSeed);
const faqs = z.array(Faq).parse(faqSeed);
const partners = z.array(Partner).parse(partnerSeed);

function assertReferences() {
  const styleIds = new Set(tripStyles.map((s) => s.id));
  const destinationIds = new Set(destinations.map((d) => d.id));
  const tripIds = new Set(trips.map((t) => t.id));
  const partnerIds = new Set(partners.map((p) => p.id));
  const fail = (message: string): never => {
    throw new Error(`Content error: ${message}`);
  };

  for (const trip of trips) {
    trip.styleIds.forEach(
      (id) => styleIds.has(id) || fail(`trip "${trip.id}" uses unknown style "${id}"`),
    );
    trip.destinationIds.forEach(
      (id) => destinationIds.has(id) || fail(`trip "${trip.id}" uses unknown destination "${id}"`),
    );
    if (trip.partnerId && !partnerIds.has(trip.partnerId))
      fail(`trip "${trip.id}" uses unknown partner`);
    if (trip.itinerary.length > 0 && trip.itinerary.length !== trip.durationDays) {
      fail(
        `trip "${trip.id}" has ${trip.itinerary.length} itinerary days but durationDays is ${trip.durationDays}`,
      );
    }
    trip.itinerary.forEach((d, i) => {
      if (d.day !== i + 1) fail(`trip "${trip.id}" itinerary day numbers must be 1, 2, 3…`);
      if (d.destinationId && !destinationIds.has(d.destinationId)) {
        fail(`trip "${trip.id}" day ${d.day} uses unknown destination "${d.destinationId}"`);
      }
    });
  }
  for (const review of reviews) {
    if (review.tripId && !tripIds.has(review.tripId))
      fail(`review "${review.id}" uses unknown trip`);
  }
}
assertReferences();

export async function getTripStyles() {
  return visible(tripStyles);
}

export async function getDestinations() {
  return visible(destinations);
}

export async function getDestination(id: string) {
  return visible(destinations).find((d) => d.id === id) ?? null;
}

export async function getTrips(filter?: { styleId?: string; destinationId?: string }) {
  return visible(trips).filter(
    (t) =>
      (!filter?.styleId || t.styleIds.includes(filter.styleId)) &&
      (!filter?.destinationId || t.destinationIds.includes(filter.destinationId)),
  );
}

export async function getTrip(id: string) {
  return visible(trips).find((t) => t.id === id) ?? null;
}

export async function getFaqs(category?: Faq["category"]) {
  return visible(faqs).filter((f) => !category || f.category === category);
}

export async function getReviews() {
  return visible(reviews);
}

/**
 * Aggregate partner facts for trust claims. Only booleans leave this module: the partner records
 * themselves stay internal and must never reach a page.
 */
export async function getPartnerStatus() {
  return {
    allLicensesVerified: partners.length > 0 && partners.every((p) => p.licenseVerified),
  };
}
// Partners are intentionally not exported: they are internal and must never reach a page.
