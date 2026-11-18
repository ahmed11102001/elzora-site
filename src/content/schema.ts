import { z } from "zod";
import type { Locale } from "@/i18n/config";
import manifest from "./images.generated.json";

/**
 * Content model. Everything the site shows from a CMS is described here, validated with zod and
 * read through the functions in ./index.ts. The seed data lives in ./seed. When a CMS is chosen
 * (Phase 0), only ./index.ts changes: it fetches from the CMS and parses with these same schemas.
 */

// Text that exists in several languages. English is required, other languages fall back to it.
export const LocalizedText = z.object({ en: z.string().min(1), de: z.string().min(1).optional() });
export type LocalizedText = z.infer<typeof LocalizedText>;

export const L = (en: string, de?: string): LocalizedText => (de ? { en, de } : { en });
export const localize = (text: LocalizedText, lang: Locale): string => text[lang] ?? text.en;

const Slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase letters, digits and hyphens");

// draft: placeholder, never shown in production · review: written, waiting for approval · published: live
export const Status = z.enum(["draft", "review", "published"]);
export type Status = z.infer<typeof Status>;

const photoIds = Object.keys(manifest) as [keyof typeof manifest, ...(keyof typeof manifest)[]];
export const PhotoIdSchema = z.enum(photoIds);

export const TripStyle = z.object({
  id: Slug,
  title: LocalizedText,
  summary: LocalizedText,
  image: PhotoIdSchema.optional(),
  status: Status,
});

export const Fact = z.object({ label: LocalizedText, value: LocalizedText });

export const Destination = z.object({
  id: Slug,
  name: LocalizedText,
  tagline: LocalizedText,
  summary: LocalizedText,
  facts: z.array(Fact).default([]),
  image: PhotoIdSchema.optional(),
  status: Status,
});

export const ItineraryDay = z.object({
  day: z.number().int().positive(),
  title: LocalizedText,
  description: LocalizedText,
  destinationId: Slug.optional(),
});

export const Trip = z.object({
  id: Slug, // also the URL slug
  title: LocalizedText,
  summary: LocalizedText,
  styleIds: z.array(Slug).min(1),
  destinationIds: z.array(Slug).min(1),
  durationDays: z.number().int().positive(),
  priceFromEUR: z.number().positive().optional(), // leave empty until a partner confirms a price
  highlights: z.array(LocalizedText).default([]),
  itinerary: z.array(ItineraryDay).default([]),
  inclusions: z.array(LocalizedText).default([]),
  exclusions: z.array(LocalizedText).default([]),
  image: PhotoIdSchema.optional(),
  partnerId: Slug.optional(), // internal only, never rendered
  status: Status,
});

export const Review = z.object({
  id: Slug,
  author: z.string().min(1), // first name and initial, with the traveler's consent
  country: z.string().length(2), // ISO 3166-1 alpha-2, e.g. "DE"
  rating: z.number().int().min(1).max(5),
  text: LocalizedText,
  tripId: Slug.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verified: z.boolean(), // true only for real, confirmed travelers
  status: Status,
});

export const FaqCategory = z.enum([
  "safety",
  "visa",
  "timing",
  "payments",
  "cancellation",
  "practical",
]);

export const Faq = z.object({
  id: Slug,
  category: FaqCategory,
  question: LocalizedText,
  answer: LocalizedText,
  status: Status,
});

// INTERNAL registry of partner companies. Never rendered or sent to the browser: the site does not
// name specific companies.
export const Partner = z.object({
  id: Slug,
  internalName: z.string().min(1),
  licenseVerified: z.boolean(),
  commissionNote: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export type TripStyle = z.infer<typeof TripStyle>;
export type Destination = z.infer<typeof Destination>;
export type Trip = z.infer<typeof Trip>;
export type Review = z.infer<typeof Review>;
export type Faq = z.infer<typeof Faq>;
export type Partner = z.infer<typeof Partner>;

// Input types (before defaults are applied) for writing seed data.
export type TripStyleInput = z.input<typeof TripStyle>;
export type DestinationInput = z.input<typeof Destination>;
export type TripInput = z.input<typeof Trip>;
export type ReviewInput = z.input<typeof Review>;
export type FaqInput = z.input<typeof Faq>;
export type PartnerInput = z.input<typeof Partner>;
