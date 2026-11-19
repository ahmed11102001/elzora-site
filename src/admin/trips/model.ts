// Dashboard trip model (7.4B). Pure and framework-free: no React, no server-only imports, so the same
// schemas validate what the editor sends and what the 7.4C database layer reads back.
//
// Shape follows the Phase 7 plan (sections 6 and 9): a trip has shared commercial data, shared media,
// and one translation per language. Publishing state lives on the TRANSLATION, never on the trip.
import { z } from "zod";
import { locales, type Locale } from "@/i18n/config";
import { PhotoIdSchema, Status } from "@/content/schema";
import { BUDGETS } from "@/lib/leads/options";
import { LIMITS, SEO_GUIDE, SLUG_RE, emptyDay, emptyTranslation } from "./constants";

// Re-exported so server code has one import. Client components import ./constants directly, which
// keeps zod and the content schema out of the browser bundle.
export { LIMITS, SEO_GUIDE, SLUG_RE, emptyDay, emptyTranslation };

export { locales };
export type { Locale };

/** The planner's budget buckets, minus "unsure" (a trip always has a real category or none). */
export const BUDGET_CATEGORIES = BUDGETS.filter((b) => b !== "unsure");
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const TripStatus = Status; // draft → review → published, per translation
export type TripStatus = z.infer<typeof TripStatus>;

const text = (max: number) => z.string().trim().max(max);
// Empty rows are dropped on the server, so the editor can keep blank inputs while typing.
const textList = (maxItems: number) =>
  z
    .array(text(LIMITS.listItem))
    .max(maxItems)
    .transform((items) => items.filter((item) => item.length > 0));

const slugText = text(LIMITS.slug).refine(
  (value) => value === "" || SLUG_RE.test(value),
  "Use lowercase letters, digits and single hyphens (for example classic-egypt-8-days).",
);
const taxonomyId = z.string().trim().regex(SLUG_RE);
const photoId = PhotoIdSchema.or(z.literal(""));

export const DayDraft = z.object({
  dayNumber: z.number().int().min(1).max(LIMITS.days),
  title: text(LIMITS.dayTitle),
  description: text(LIMITS.dayDescription),
  destinationId: taxonomyId.or(z.literal("")),
  highlights: textList(LIMITS.dayHighlights),
});
export type DayDraft = z.infer<typeof DayDraft>;

/** Everything the editor may change in one language. Status and publish data are NOT in here. */
export const TranslationDraft = z.object({
  slug: slugText,
  title: text(LIMITS.title),
  subtitle: text(LIMITS.subtitle),
  summary: text(LIMITS.summary),
  description: text(LIMITS.description),
  highlights: textList(LIMITS.listItems),
  itinerary: z.array(DayDraft).max(LIMITS.days),
  inclusions: textList(LIMITS.listItems),
  exclusions: textList(LIMITS.listItems),
  priceNote: text(LIMITS.priceNote),
  metaTitle: text(LIMITS.metaTitle),
  metaDescription: text(LIMITS.metaDescription),
  ogImage: photoId,
  canonicalOverride: text(LIMITS.canonical).refine(
    (value) => value === "" || /^https:\/\/[^\s]+$/.test(value),
    "Use a full https:// address, or leave it empty.",
  ),
  noindex: z.boolean(),
});
export type TranslationDraft = z.infer<typeof TranslationDraft>;

const Alt = z.object({ en: text(LIMITS.alt), de: text(LIMITS.alt) });
export const MediaRef = z.object({ photoId: PhotoIdSchema, alt: Alt });
export type MediaRef = z.infer<typeof MediaRef>;

/** The full editable payload of the trip editor (one JSON document per save). */
export const TripDraft = z.object({
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  durationDays: z.number().int().min(1).max(90),
  flexibleDuration: z.boolean(),
  priceFromEUR: z.number().positive().max(100000).nullable(),
  budgetCategory: z
    .enum(BUDGET_CATEGORIES as [BudgetCategory, ...BudgetCategory[]])
    .or(z.literal("")),
  styleIds: z.array(taxonomyId).max(12),
  destinationIds: z.array(taxonomyId).max(12),
  mainImage: MediaRef.nullable(),
  gallery: z.array(MediaRef).max(LIMITS.gallery),
  translations: z.object({ en: TranslationDraft, de: TranslationDraft.nullable() }),
});
export type TripDraft = z.infer<typeof TripDraft>;

/** Server-controlled state of one translation. Only the workflow actions change it. */
export type TranslationState = {
  status: TripStatus;
  publishedAt: string | null;
  /** Old slugs of a translation that was live. 7.4C/7.4D turn these into 301 rows in `redirects`. */
  slugHistory: string[];
};
export type Translation = TranslationDraft & TranslationState;

export type TripRecord = Omit<TripDraft, "translations"> & {
  id: string; // immutable, independent of every slug
  partnerId: string | null; // internal only; edited in 7.6, preserved here
  archivedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  translations: { en: Translation; de: Translation | null };
};

export const freshState = (): TranslationState => ({
  status: "draft",
  publishedAt: null,
  slugHistory: [],
});

export const emptyDraft = (): TripDraft => ({
  featured: false,
  sortOrder: 100,
  durationDays: 7,
  flexibleDuration: false,
  priceFromEUR: null,
  budgetCategory: "",
  styleIds: [],
  destinationIds: [],
  mainImage: null,
  gallery: [],
  translations: { en: emptyTranslation(), de: null },
});

/** Strips the server-controlled parts of a record, giving back what the editor edits. */
export function toDraft(record: TripRecord): TripDraft {
  const pick = (t: Translation): TranslationDraft => ({
    slug: t.slug,
    title: t.title,
    subtitle: t.subtitle,
    summary: t.summary,
    description: t.description,
    highlights: t.highlights,
    itinerary: t.itinerary,
    inclusions: t.inclusions,
    exclusions: t.exclusions,
    priceNote: t.priceNote,
    metaTitle: t.metaTitle,
    metaDescription: t.metaDescription,
    ogImage: t.ogImage,
    canonicalOverride: t.canonicalOverride,
    noindex: t.noindex,
  });
  return {
    featured: record.featured,
    sortOrder: record.sortOrder,
    durationDays: record.durationDays,
    flexibleDuration: record.flexibleDuration,
    priceFromEUR: record.priceFromEUR,
    budgetCategory: record.budgetCategory,
    styleIds: record.styleIds,
    destinationIds: record.destinationIds,
    mainImage: record.mainImage,
    gallery: record.gallery,
    translations: {
      en: pick(record.translations.en),
      de: record.translations.de ? pick(record.translations.de) : null,
    },
  };
}

export type TripState = "archived" | TripStatus;

/** One word for a trip in lists: archived, else the most advanced language. */
export function tripState(record: Pick<TripRecord, "archivedAt" | "translations">): TripState {
  if (record.archivedAt) return "archived";
  const statuses = [record.translations.en.status, record.translations.de?.status];
  if (statuses.includes("published")) return "published";
  if (statuses.includes("review")) return "review";
  return "draft";
}

/** Best title for lists: English, then German, then a placeholder. */
export function displayTitle(record: Pick<TripRecord, "translations">): string {
  return record.translations.en.title || record.translations.de?.title || "Untitled trip";
}

export const STATE_LABEL: Record<TripState, string> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
  archived: "Archived",
};
