import type { Locale } from "@/i18n/config";

// Destination pages are localized: the page of "giza" lives at /en/destinations/giza and
// /de/reiseziele/gizeh. Destinations are code-managed (plan 2.2); the ids stay the stable references.
export const destinationSlugs: Record<string, Record<Locale, string>> = {
  giza: { en: "giza", de: "gizeh" },
  luxor: { en: "luxor", de: "luxor" },
  alexandria: { en: "alexandria", de: "alexandria" },
  aswan: { en: "aswan", de: "assuan" },
  "abu-simbel": { en: "abu-simbel", de: "abu-simbel" },
};

export const destinationSlug = (id: string, lang: Locale): string =>
  destinationSlugs[id]?.[lang] ?? id;

export const destinationIdFromSlug = (slug: string, lang: Locale): string | null =>
  Object.entries(destinationSlugs).find(([, slugs]) => slugs[lang] === slug)?.[0] ?? null;
