import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/** Paths (without locale) that exist and should appear in the sitemap. "" is the home page. */
export const sitemapPaths: string[] = ["", "/plan-your-trip"];

/** Header navigation. Empty until the inner pages exist (Phase 7). */
export const navRoutes: { key: keyof Dictionary["nav"]; path: string }[] = [];

/** Trip planner (Phase 6) and the pages around it. Always build these links with the helpers. */
export const plannerPath = (lang: Locale) => `/${lang}/plan-your-trip`;
export const plannerConfirmationPath = (lang: Locale) => `/${lang}/plan-your-trip/confirmation`;
/** Privacy Policy. The page itself is Phase 7 (legal pages); until then this link 404s. */
export const privacyPath = (lang: Locale) => `/${lang}/privacy`;
