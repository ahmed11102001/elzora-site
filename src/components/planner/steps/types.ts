import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { FieldErrors } from "@/lib/leads/schema";
import type { PlannerDraft } from "../state";

export type PlannerCopy = Dictionary["planner"];

export type StepProps = {
  copy: PlannerCopy;
  locale: Locale;
  draft: PlannerDraft;
  update: (patch: Partial<PlannerDraft>) => void;
  /** Errors for THIS step, already empty until the visitor has tried to continue. */
  errors: FieldErrors;
};

/** Localized text for an error code. Unknown codes fall back to the generic message. */
export const errorText = (copy: PlannerCopy, code: string | undefined): string | undefined =>
  code ? ((copy.errors as Record<string, string>)[code] ?? copy.errors.invalid) : undefined;
