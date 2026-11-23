"use client";

import Link from "next/link";
import { privacyPath } from "@/lib/routes";
import { TurnstileWidget } from "../TurnstileWidget";
import { PlannerSummary } from "../PlannerSummary";
import type { StepId } from "../state";
import { errorText, type StepProps } from "./types";

type ReviewStepProps = StepProps & {
  onEdit: (step: StepId) => void;
  turnstileSiteKey?: string;
  captchaNonce: number;
  onToken: (token: string | null) => void;
};

export function ReviewStep({
  copy,
  locale,
  draft,
  update,
  errors,
  onEdit,
  turnstileSiteKey,
  captchaNonce,
  onToken,
}: ReviewStepProps) {
  const consentError = errorText(copy, errors.consent);
  return (
    <div className="grid gap-6">
      <PlannerSummary copy={copy} locale={locale} draft={draft} onEdit={onEdit} />

      <div>
        {/* Explicit, unchecked by default, one purpose only (answering this request). No marketing opt-in. */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={draft.consent}
            onChange={(event) => update({ consent: event.target.checked })}
            aria-invalid={consentError ? true : undefined}
            aria-describedby={consentError ? "consent-error" : undefined}
            className="mt-1 size-6 shrink-0 cursor-pointer accent-accent"
          />
          <span className="text-sm leading-relaxed text-fg/85 sm:text-base">
            {copy.review.consent.before}
            <Link
              href={privacyPath(locale)}
              target="_blank"
              rel="noopener"
              className="text-accent underline underline-offset-4"
            >
              {copy.review.consent.link}
            </Link>
            {copy.review.consent.after}
          </span>
        </label>
        {consentError && (
          <p id="consent-error" role="alert" className="mt-2 text-sm text-red-300">
            {consentError}
          </p>
        )}
      </div>

      {turnstileSiteKey && (
        <TurnstileWidget
          siteKey={turnstileSiteKey}
          locale={locale}
          resetNonce={captchaNonce}
          onToken={onToken}
          label={copy.review.captchaLabel}
          loadingLabel={copy.review.captchaLoading}
        />
      )}
    </div>
  );
}
