import { z } from "zod";
import { Status } from "../schema";

// Shapes of the rows read from Postgres, validated with Zod before anything uses them. The same
// building blocks validate dashboard writes later (7.4).

export const ItineraryDayJson = z.object({
  day: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  destinationId: z.string().min(1).optional(),
});
export type ItineraryDayJson = z.infer<typeof ItineraryDayJson>;

export const TextList = z.array(z.string().min(1));

export const TranslationRow = z.object({
  trip_id: z.string(),
  locale: z.enum(["en", "de"]),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  highlights: TextList,
  itinerary: z.array(ItineraryDayJson),
  inclusions: TextList,
  exclusions: TextList,
  status: Status,
});
export type TranslationRow = z.infer<typeof TranslationRow>;

export const TripRow = z.object({
  id: z.string(),
  seed_key: z.string().nullable(),
  duration_days: z.coerce.number().int().positive(),
  // numeric(10,2) arrives as a string
  price_from_eur: z
    .union([z.string(), z.number()])
    .nullable()
    .transform((value) => (value === null ? null : Number(value))),
  style_ids: z.array(z.string()),
  destination_ids: z.array(z.string()),
  sort_order: z.coerce.number().int(),
  main_photo_id: z.string().nullable(),
});
export type TripRow = z.infer<typeof TripRow>;
