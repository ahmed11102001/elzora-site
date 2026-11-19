// What stands between a translation and "review" or "published" (plan 7.2) plus SEO guidance.
// Pure: duplicate-slug and image-license lookups are passed in, so this is easy to test and the
// 7.4C database layer can supply real answers without touching the rules.
import {
  LIMITS,
  SEO_GUIDE,
  SLUG_RE,
  type Locale,
  type Translation,
  type TripRecord,
} from "./model";

export type Issue = { code: string; field: string; message: string };
export type Readiness = { blockers: Issue[]; warnings: Issue[] };

export type ReadinessContext = {
  /** True when another trip already uses this slug in this language. */
  slugTaken: (locale: Locale, slug: string) => boolean;
  imageLicense: (photoId: string) => "ok" | "unconfirmed" | "unknown";
  /** ENFORCE_IMAGE_LICENSES: warning before launch, blocker at launch (plan D7). */
  enforceLicenses: boolean;
};

export type Level = "review" | "publish";

const LANGUAGE: Record<Locale, string> = { en: "English", de: "German" };

/** Checks the day list on its own: sequential numbers, filled text. */
export function itineraryIssues(
  translation: Pick<Translation, "itinerary">,
  locale: Locale,
): Issue[] {
  const issues: Issue[] = [];
  const days = translation.itinerary;
  days.forEach((day, index) => {
    if (day.dayNumber !== index + 1) {
      issues.push({
        code: "itinerary.order",
        field: "itinerary",
        message: `${LANGUAGE[locale]} itinerary: day numbers must be 1, 2, 3… in order (found ${day.dayNumber} at position ${index + 1}).`,
      });
    }
    if (!day.title || !day.description) {
      issues.push({
        code: "itinerary.text",
        field: "itinerary",
        message: `${LANGUAGE[locale]} itinerary: day ${index + 1} needs a title and a description.`,
      });
    }
  });
  return issues;
}

export function checkTranslation(
  trip: TripRecord,
  locale: Locale,
  level: Level,
  ctx: ReadinessContext,
): Readiness {
  const translation = trip.translations[locale];
  const blockers: Issue[] = [];
  const warnings: Issue[] = [];
  const language = LANGUAGE[locale];
  if (!translation) {
    return {
      blockers: [
        {
          code: "translation.missing",
          field: "translation",
          message: `No ${language} translation yet.`,
        },
      ],
      warnings,
    };
  }
  const block = (code: string, field: string, message: string) =>
    blockers.push({ code, field, message: `${language}: ${message}` });
  const warn = (code: string, field: string, message: string) =>
    warnings.push({ code, field, message: `${language}: ${message}` });

  // Needed to leave "draft" at all.
  if (!translation.title) block("title.missing", "title", "add a title.");
  if (!translation.slug) block("slug.missing", "slug", "add a URL slug.");
  else if (!SLUG_RE.test(translation.slug))
    block("slug.invalid", "slug", "the URL slug is not valid.");
  else if (ctx.slugTaken(locale, translation.slug))
    block("slug.duplicate", "slug", `another trip already uses the slug "${translation.slug}".`);
  if (!translation.summary) block("summary.missing", "summary", "add a short summary.");

  if (level === "publish") {
    if (!translation.metaTitle) block("metaTitle.missing", "metaTitle", "add an SEO title.");
    if (!translation.metaDescription)
      block("metaDescription.missing", "metaDescription", "add an SEO description.");

    // Shared commercial and media data
    if (!(trip.durationDays > 0))
      block("duration.missing", "durationDays", "set the duration in days.");
    if (trip.styleIds.length === 0)
      block("styles.missing", "styleIds", "pick at least one trip style.");
    if (trip.destinationIds.length === 0)
      block("destinations.missing", "destinationIds", "pick at least one destination.");
    if (!trip.mainImage) block("image.missing", "mainImage", "choose a main image.");
    else if (!trip.mainImage.alt[locale].trim())
      block("image.alt", "mainImage", `write the main image's ${language} alt text.`);

    // Itinerary
    for (const issue of itineraryIssues(translation, locale))
      blockers.push({ ...issue, message: issue.message });
    if (translation.itinerary.length === 0) {
      block("itinerary.empty", "itinerary", "add the day-by-day itinerary.");
    } else if (!trip.flexibleDuration && translation.itinerary.length !== trip.durationDays) {
      block(
        "itinerary.length",
        "itinerary",
        `the itinerary has ${translation.itinerary.length} days but the duration is ${trip.durationDays}. Match them, or mark the duration as flexible.`,
      );
    }
    // Both languages must describe the same days before both go live.
    const other = trip.translations[locale === "en" ? "de" : "en"];
    if (other && other.itinerary.length > 0 && translation.itinerary.length > 0) {
      const mine = translation.itinerary.map((d) => d.dayNumber).join(",");
      const theirs = other.itinerary.map((d) => d.dayNumber).join(",");
      if (mine !== theirs)
        block(
          "itinerary.mismatch",
          "itinerary",
          "the English and German itineraries must have the same day numbers.",
        );
    }

    // Images and licences
    const used = new Set<string>();
    if (trip.mainImage) used.add(trip.mainImage.photoId);
    trip.gallery.forEach((g) => used.add(g.photoId));
    if (translation.ogImage) used.add(translation.ogImage);
    for (const id of used) {
      const licence = ctx.imageLicense(id);
      if (licence === "ok") continue;
      const message = `the licence of image "${id}" is not confirmed.`;
      if (ctx.enforceLicenses) block("image.licence", "mainImage", message);
      else warn("image.licence", "mainImage", `${message} This will block publishing at launch.`);
    }
    trip.gallery.forEach((g, i) => {
      if (!g.alt[locale].trim())
        warn("gallery.alt", "gallery", `gallery image ${i + 1} has no ${language} alt text.`);
    });
  }

  // Guidance only: never blocks.
  const titleLength = translation.metaTitle.length;
  if (titleLength > 0 && (titleLength < SEO_GUIDE.title.min || titleLength > SEO_GUIDE.title.max))
    warn(
      "metaTitle.length",
      "metaTitle",
      `SEO title is ${titleLength} characters; about ${SEO_GUIDE.title.min}–${SEO_GUIDE.title.max} reads best in search results.`,
    );
  const descLength = translation.metaDescription.length;
  if (
    descLength > 0 &&
    (descLength < SEO_GUIDE.description.min || descLength > SEO_GUIDE.description.max)
  )
    warn(
      "metaDescription.length",
      "metaDescription",
      `SEO description is ${descLength} characters; about ${SEO_GUIDE.description.min}–${SEO_GUIDE.description.max} reads best.`,
    );
  if (translation.noindex)
    warn("noindex", "noindex", "this page is set to noindex: search engines will skip it.");
  if (translation.metaTitle.length > LIMITS.metaTitle)
    block("metaTitle.long", "metaTitle", "the SEO title is too long.");

  return { blockers, warnings };
}

/** The same checks for every translation that exists, for the readiness panel. */
export function checkTrip(trip: TripRecord, level: Level, ctx: ReadinessContext) {
  const result: Partial<Record<Locale, Readiness>> = {};
  (["en", "de"] as const).forEach((locale) => {
    if (trip.translations[locale]) result[locale] = checkTranslation(trip, locale, level, ctx);
  });
  return result;
}
