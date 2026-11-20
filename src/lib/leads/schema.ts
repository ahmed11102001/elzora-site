import { z } from "zod";
import { locales } from "@/i18n/config";
import {
  BUDGETS,
  COUNTRY_CODES,
  DATE_MODES,
  DURATIONS,
  INTERESTS,
  LIMITS,
  SEASONS,
  type DateMode,
} from "./options";
import type { Attribution } from "./attribution";
import { cleanLine, cleanMultiline } from "./sanitize";

// One schema for the browser (instant feedback) and the server (the only one that is trusted).
// Error messages are stable codes, not sentences: the UI maps each code to localized text
// (planner.errors in the dictionaries). Keep `ERROR_CODES` and the dictionaries in sync.
export const ERROR_CODES = [
  "required",
  "too_long",
  "invalid",
  "invalid_email",
  "invalid_phone",
  "invalid_option",
  "invalid_date",
  "date_in_past",
  "date_too_far",
  "departure_before_arrival",
  "stay_too_long",
  "age_invalid",
  "too_many_travelers",
  "consent_required",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Parses "YYYY-MM-DD" as a UTC date; null when malformed or not a real calendar day. */
export function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

const line = (max: number, min = 1) =>
  z
    .string("required")
    .max(max * 4, "too_long")
    .transform(cleanLine)
    .pipe(z.string().min(min, "required").max(max, "too_long"));

const optionalLine = (max: number) =>
  z
    .string("invalid")
    .max(max * 4, "too_long")
    .optional()
    .transform((value) => cleanLine(value ?? ""))
    .pipe(z.string().max(max, "too_long"))
    .transform((value) => value || undefined);

const optionalNotes = z
  .string("invalid")
  .max(LIMITS.notesMax * 2, "too_long")
  .optional()
  .transform((value) => cleanMultiline(value ?? ""))
  .pipe(z.string().max(LIMITS.notesMax, "too_long"))
  .transform((value) => value || undefined);

const email = z
  .string("required")
  .max(LIMITS.emailMax * 2, "too_long")
  .transform((value) => cleanLine(value).toLowerCase())
  .pipe(
    z.string().min(1, "required").max(LIMITS.emailMax, "too_long").pipe(z.email("invalid_email")),
  );

const phone = z
  .string("invalid")
  .max(LIMITS.phoneMax * 2, "too_long")
  .optional()
  .transform((value) => cleanLine(value ?? ""))
  .pipe(
    z
      .string()
      .max(LIMITS.phoneMax, "too_long")
      .refine(
        (value) =>
          value === "" ||
          (/^[+\d][\d\s().\-/]*$/.test(value) && (value.match(/\d/g)?.length ?? 0) >= 6),
        "invalid_phone",
      )
      .refine((value) => (value.match(/\d/g)?.length ?? 0) <= 15, "invalid_phone"),
  )
  .transform((value) => value || undefined);

const country = z
  .string("required")
  .transform((value) => cleanLine(value).toUpperCase())
  .pipe(z.string().min(1, "required"))
  .refine((value) => COUNTRY_CODES.includes(value), "invalid_option");

const attribution = z
  .object({
    source: optionalLine(100),
    landingPage: optionalLine(300),
    referrer: optionalLine(300),
    utmSource: optionalLine(100),
    utmMedium: optionalLine(100),
    utmCampaign: optionalLine(150),
    utmContent: optionalLine(150),
    utmTerm: optionalLine(150),
  })
  .optional()
  .transform((value): Attribution => value ?? {});

// Trip context from the planner link (?trip=<slug>). A malformed value is dropped, never an error:
// a bad query string must not stop a real inquiry.
const TRIP_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const tripSlug = z
  .string()
  .optional()
  .transform((value) =>
    value && value.length <= 120 && TRIP_SLUG.test(value) ? value : undefined,
  );

// The date rules need "now". Tests pass a fixed one; production uses the clock at parse time.
export function createLeadSchema(now: () => Date = () => new Date()) {
  return z
    .object({
      locale: z.enum(locales, "invalid_option"),

      dateMode: z.enum(DATE_MODES, "required"),
      arrival: z.string("invalid_date").optional(),
      departure: z.string("invalid_date").optional(),
      flexibleWhen: z.string("invalid_option").max(32, "invalid_option").optional(),

      adults: z
        .number("required")
        .int("required")
        .min(1, "required")
        .max(LIMITS.adultsMax, "too_many_travelers"),
      children: z
        .number("required")
        .int("required")
        .min(0, "required")
        .max(LIMITS.childrenMax, "too_many_travelers"),
      childrenAges: z.array(
        z
          .number("age_invalid")
          .int("age_invalid")
          .min(0, "age_invalid")
          .max(LIMITS.childAgeMax, "age_invalid"),
        "age_invalid",
      ),

      interests: z
        .array(z.enum(INTERESTS, "invalid_option"), "required")
        .min(1, "required")
        .max(INTERESTS.length, "invalid_option"),
      duration: z.enum(DURATIONS, "required"),
      budget: z.enum(BUDGETS, "required"),

      fullName: line(LIMITS.nameMax, LIMITS.nameMin),
      email,
      country,
      phone,
      notes: optionalNotes,

      consent: z.literal(true, "consent_required"),

      attribution,
      tripSlug,
      idempotencyKey: z.uuid("invalid"),
      turnstileToken: z.string().max(2048, "invalid").optional(),
    })
    .superRefine((lead, ctx) => {
      const fail = (path: string, message: ErrorCode) =>
        ctx.addIssue({ code: "custom", path: [path], message });
      const today = parseIsoDate(now().toISOString().slice(0, 10))!;

      if (lead.dateMode === "specific") {
        const arrival = parseIsoDate(lead.arrival);
        const departure = parseIsoDate(lead.departure);
        if (!lead.arrival) fail("arrival", "required");
        else if (!arrival) fail("arrival", "invalid_date");
        else if (arrival < today) fail("arrival", "date_in_past");
        else if (arrival.getTime() - today.getTime() > LIMITS.horizonDays * DAY_MS)
          fail("arrival", "date_too_far");

        if (!lead.departure) fail("departure", "required");
        else if (!departure) fail("departure", "invalid_date");
        else if (arrival && departure <= arrival) fail("departure", "departure_before_arrival");
        else if (arrival && departure.getTime() - arrival.getTime() > LIMITS.stayMaxDays * DAY_MS)
          fail("departure", "stay_too_long");
      }

      if (lead.dateMode === "flexible") {
        const when = lead.flexibleWhen ?? "";
        if (!when) fail("flexibleWhen", "required");
        else if (when === "any" || SEASONS.some((season) => when === `season:${season}`)) {
          // valid
        } else if (when.startsWith("month:") && MONTH.test(when.slice(6))) {
          const month = parseIsoDate(`${when.slice(6)}-01`)!;
          // Tolerate one month of clock/timezone difference between visitor and server.
          const earliest = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
          const latest = today.getTime() + LIMITS.horizonDays * DAY_MS;
          if (month < earliest) fail("flexibleWhen", "date_in_past");
          else if (month.getTime() > latest) fail("flexibleWhen", "date_too_far");
        } else fail("flexibleWhen", "invalid_option");
      }

      if (lead.childrenAges.length !== lead.children) fail("childrenAges", "age_invalid");
      if (lead.adults + lead.children > LIMITS.travelersMax) fail("children", "too_many_travelers");
    })
    .transform((lead) => {
      // Keep only what applies to the chosen date mode, and a stable interest order without duplicates.
      const specific = lead.dateMode === "specific";
      return {
        ...lead,
        arrival: specific ? lead.arrival : undefined,
        departure: specific ? lead.departure : undefined,
        flexibleWhen: lead.dateMode === "flexible" ? lead.flexibleWhen : undefined,
        interests: INTERESTS.filter((interest) => lead.interests.includes(interest)),
        consent: true as const,
      };
    });
}

export type LeadInput = z.input<ReturnType<typeof createLeadSchema>>;
export type ValidLead = z.output<ReturnType<typeof createLeadSchema>>;
export type FieldErrors = Record<string, ErrorCode | "invalid">;

const known = new Set<string>(ERROR_CODES);

/** First error per field, as `{ "childrenAges.1": "age_invalid" }`. Unknown messages become "invalid". */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (key in out) continue;
    out[key] = known.has(issue.message) ? (issue.message as ErrorCode) : "invalid";
  }
  return out;
}

export type { DateMode };
