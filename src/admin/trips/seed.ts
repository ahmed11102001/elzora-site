// Turns the site's seed trips (src/content/seed) into dashboard records, so the list is not empty
// before 7.4C stores real rows. German text exists only where the seed has it; a German translation
// is created (as a draft, with no slug yet) only when the seed has at least a German title.
import { trips as seedTrips } from "@/content/seed/trips";
import type { Trip } from "@/content/schema";
import { z } from "zod";
import { Trip as TripSchema } from "@/content/schema";
import {
  emptyTranslation,
  freshState,
  type DayDraft,
  type Locale,
  type Translation,
  type TripRecord,
} from "./model";

const SEEDED_AT = "2026-01-01T00:00:00.000Z";

function translationFrom(trip: Trip, locale: Locale): Translation | null {
  if (locale === "de" && !trip.title.de) return null;
  const pick = (value: { en: string; de?: string }) => (value[locale] ?? "") as string;
  const itinerary: DayDraft[] = trip.itinerary.map((day) => ({
    dayNumber: day.day,
    title: pick(day.title),
    description: pick(day.description),
    destinationId: day.destinationId ?? "",
    highlights: [],
  }));
  return {
    ...emptyTranslation(),
    // The English slug is the old Trip.id. German slugs are chosen in the editor.
    slug: locale === "en" ? trip.id : "",
    title: pick(trip.title),
    summary: pick(trip.summary),
    highlights: trip.highlights.map(pick).filter(Boolean),
    itinerary,
    inclusions: trip.inclusions.map(pick).filter(Boolean),
    exclusions: trip.exclusions.map(pick).filter(Boolean),
    ...freshState(),
    // Seed copy was written for review; keep that status for English only.
    status: locale === "en" ? trip.status : "draft",
  };
}

export function seedRecords(): TripRecord[] {
  const parsed = z.array(TripSchema).parse(seedTrips);
  return parsed.map((trip, index): TripRecord => {
    const en = translationFrom(trip, "en") as Translation;
    const de = translationFrom(trip, "de");
    return {
      id: trip.id,
      featured: index === 0,
      sortOrder: (index + 1) * 10,
      durationDays: trip.durationDays,
      flexibleDuration: false,
      priceFromEUR: trip.priceFromEUR ?? null,
      budgetCategory: "",
      styleIds: trip.styleIds,
      destinationIds: trip.destinationIds,
      mainImage: trip.image ? { photoId: trip.image, alt: { en: "", de: "" } } : null,
      gallery: [],
      partnerId: trip.partnerId ?? null,
      archivedAt: null,
      createdAt: SEEDED_AT,
      createdBy: null,
      updatedAt: SEEDED_AT,
      updatedBy: null,
      translations: { en, de },
    };
  });
}
