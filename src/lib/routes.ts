import type { Dictionary } from "@/i18n/dictionaries";

/** Paths (without locale) that exist and should appear in the sitemap. "" is the home page. */
export const sitemapPaths: string[] = [""];

/** Header navigation. Empty until the inner pages exist (Phase 7). */
export const navRoutes: { key: keyof Dictionary["nav"]; path: string }[] = [];
