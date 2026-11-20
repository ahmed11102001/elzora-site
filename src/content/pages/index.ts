import type { Locale } from "@/i18n/config";
import { about } from "./about";
import { cookies } from "./cookies";
import { privacy } from "./privacy";
import { terms } from "./terms";
import type { LocalizedPage, PageDocument } from "./types";

export type { PageDocument, PageSection } from "./types";

/**
 * Review state of the legal and about text. While it is not "published" every one of these pages
 * shows a visible notice that the text is a temporary placeholder. The pages themselves always
 * render (the planner's privacy link must resolve), so this flag only controls the notice. Switch it
 * to "published" once the texts have been reviewed (legal review for privacy, terms and cookies).
 */
export const pagesStatus: "draft" | "review" | "published" = "review";

const pages = { about, privacy, terms, cookies } satisfies Record<string, LocalizedPage>;
export type PageKey = keyof typeof pages;

export const getPage = (key: PageKey, lang: Locale): PageDocument => pages[key][lang];
