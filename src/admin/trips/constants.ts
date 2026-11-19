// Client-safe constants and empty-value factories for the trip editor. No zod, no content imports:
// the editor (a client component) imports this file, and model.ts re-exports it for server code.
import type { DayDraft, TranslationDraft } from "./model";

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Hard limits for every free-text field. The editor shows counters; the server enforces them. */
export const LIMITS = {
  slug: 80,
  title: 120,
  subtitle: 160,
  summary: 400,
  description: 8000,
  priceNote: 160,
  metaTitle: 120,
  metaDescription: 320,
  listItem: 240,
  listItems: 30,
  dayTitle: 120,
  dayDescription: 1200,
  dayHighlights: 8,
  days: 60,
  gallery: 12,
  alt: 200,
  canonical: 300,
} as const;

/** Editorial guidance (not rules): search results usually cut text beyond these lengths. */
export const SEO_GUIDE = {
  title: { min: 30, max: 60 },
  description: { min: 120, max: 160 },
} as const;

export const emptyDay = (dayNumber: number): DayDraft => ({
  dayNumber,
  title: "",
  description: "",
  destinationId: "",
  highlights: [],
});

export const emptyTranslation = (): TranslationDraft => ({
  slug: "",
  title: "",
  subtitle: "",
  summary: "",
  description: "",
  highlights: [],
  itinerary: [],
  inclusions: [],
  exclusions: [],
  priceNote: "",
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
  canonicalOverride: "",
  noindex: false,
});
