import {
  createLeadSchema,
  toFieldErrors,
  type FieldErrors,
  type LeadInput,
} from "@/lib/leads/schema";
import type { Attribution } from "@/lib/leads/attribution";
import type { Locale } from "@/i18n/config";
import type { Budget, DateMode, Duration, Interest } from "@/lib/leads/options";

// Planner state, kept in memory only (React state). Answers are never written to localStorage
// or sessionStorage: they contain personal data and the visitor has not agreed to that.

export const STEP_IDS = [
  "when",
  "who",
  "experience",
  "duration",
  "budget",
  "contact",
  "review",
] as const;
export type StepId = (typeof STEP_IDS)[number];

export type PlannerDraft = {
  dateMode: DateMode | null;
  arrival: string;
  departure: string;
  flexibleWhen: string;
  adults: number;
  children: number;
  /** One entry per child; null until chosen. */
  childrenAges: (number | null)[];
  interests: Interest[];
  duration: Duration | null;
  budget: Budget | null;
  fullName: string;
  email: string;
  country: string;
  phone: string;
  notes: string;
  consent: boolean;
  /** Honeypot: stays empty for real visitors. */
  website: string;
};

export const initialDraft: PlannerDraft = {
  dateMode: null,
  arrival: "",
  departure: "",
  flexibleWhen: "",
  adults: 2,
  children: 0,
  childrenAges: [],
  interests: [],
  duration: null,
  budget: null,
  fullName: "",
  email: "",
  country: "",
  phone: "",
  notes: "",
  consent: false,
  website: "",
};

/** Which payload fields each step is responsible for (used to show only that step's errors). */
export const STEP_FIELDS: Record<StepId, string[]> = {
  when: ["dateMode", "arrival", "departure", "flexibleWhen"],
  who: ["adults", "children", "childrenAges"],
  experience: ["interests"],
  duration: ["duration"],
  budget: ["budget"],
  contact: ["fullName", "email", "country", "phone", "notes"],
  review: ["consent", "idempotencyKey", "turnstileToken", "locale"],
};

export function buildPayload(
  draft: PlannerDraft,
  extra: {
    locale: Locale;
    attribution: Attribution;
    idempotencyKey?: string;
    turnstileToken?: string;
  },
): LeadInput & { website: string } {
  const specific = draft.dateMode === "specific";
  return {
    locale: extra.locale,
    dateMode: draft.dateMode as DateMode,
    arrival: specific ? draft.arrival : undefined,
    departure: specific ? draft.departure : undefined,
    flexibleWhen: draft.dateMode === "flexible" ? draft.flexibleWhen : undefined,
    adults: draft.adults,
    children: draft.children,
    childrenAges: draft.childrenAges as number[],
    interests: draft.interests,
    duration: draft.duration as Duration,
    budget: draft.budget as Budget,
    fullName: draft.fullName,
    email: draft.email,
    country: draft.country,
    phone: draft.phone,
    notes: draft.notes,
    consent: draft.consent as true,
    attribution: extra.attribution,
    idempotencyKey: extra.idempotencyKey as string,
    turnstileToken: extra.turnstileToken,
    // The honeypot is not part of the validated schema; the API reads it from the raw body.
    website: draft.website,
  };
}

const headOf = (key: string) => key.split(".")[0];

/** Runs the shared schema against the draft. Errors are keyed by field path ("childrenAges.1"). */
export function validateDraft(draft: PlannerDraft, locale: Locale): FieldErrors {
  // The real idempotency key is created at submit time; any valid UUID satisfies the schema here.
  const payload = buildPayload(draft, {
    locale,
    attribution: {},
    idempotencyKey: "00000000-0000-4000-8000-000000000000",
  });
  const result = createLeadSchema().safeParse(payload);
  return result.success ? {} : toFieldErrors(result.error);
}

export const errorsForStep = (step: StepId, errors: FieldErrors): FieldErrors =>
  Object.fromEntries(
    Object.entries(errors).filter(([key]) => STEP_FIELDS[step].includes(headOf(key))),
  );

export const firstStepWithErrors = (errors: FieldErrors): StepId | null =>
  STEP_IDS.find((step) => Object.keys(errorsForStep(step, errors)).length > 0) ?? null;
