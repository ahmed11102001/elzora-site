import type { Locale } from "@/i18n/config";

export type PageSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  /** Paragraphs shown after the list. */
  after?: string[];
};

export type PageDocument = {
  /** Page heading and browser title. */
  title: string;
  /** Meta description. */
  description: string;
  intro: string;
  /** ISO date of the last change. Shown on legal pages. */
  updated?: string;
  sections: PageSection[];
};

export type LocalizedPage = Record<Locale, PageDocument>;
