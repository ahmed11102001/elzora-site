"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import { captureAttribution, readAttribution } from "@/lib/leads/attribution";
import { postLead, saveReference, type SubmitOutcome } from "@/lib/leads/client";
import { plannerConfirmationPath } from "@/lib/routes";
import { PlannerProgress } from "./PlannerProgress";
import { PlannerStep } from "./PlannerStep";
import {
  STEP_IDS,
  buildPayload,
  errorsForStep,
  firstStepWithErrors,
  initialDraft,
  validateDraft,
  type PlannerDraft,
  type StepId,
} from "./state";
import { BudgetStep } from "./steps/BudgetStep";
import { ContactStep } from "./steps/ContactStep";
import { DurationStep } from "./steps/DurationStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { ReviewStep } from "./steps/ReviewStep";
import type { PlannerCopy } from "./steps/types";
import { WhenStep } from "./steps/WhenStep";
import { WhoStep } from "./steps/WhoStep";
import type { FieldErrors } from "@/lib/leads/schema";

type TripPlannerProps = {
  lang: Locale;
  copy: PlannerCopy;
  /** Public Turnstile site key (NEXT_PUBLIC_TURNSTILE_SITE_KEY). Empty in development without keys. */
  turnstileSiteKey?: string;
};

type SubmitProblem =
  | "offline"
  | "network"
  | "service"
  | "rateLimited"
  | "captchaFailed"
  | "captchaPending"
  | "validation";

const REVIEW = STEP_IDS.indexOf("review");
const REQUEST_TIMEOUT_MS = 20_000;

const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

export function TripPlanner({ lang, copy, turnstileSiteKey }: TripPlannerProps) {
  const router = useRouter();
  // Answers live in memory only; nothing personal is written to browser storage.
  const [draft, setDraft] = useState<PlannerDraft>(initialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [navigated, setNavigated] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<SubmitProblem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [captchaNonce, setCaptchaNonce] = useState(0);

  const submittingRef = useRef(false);
  const attempt = useRef<{ key: string; fingerprint: string } | null>(null);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  const stepId: StepId = STEP_IDS[stepIndex];
  const update = (patch: Partial<PlannerDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setServerErrors({});
    setProblem(null);
  };

  const errors = useMemo(
    () => (showErrors ? { ...validateDraft(draft, lang), ...serverErrors } : {}),
    [draft, lang, serverErrors, showErrors],
  );
  const stepErrors = errorsForStep(stepId, errors);

  const goTo = (index: number) => {
    setNavigated(true);
    setShowErrors(false);
    setProblem(null);
    setStepIndex(index);
  };

  const next = () => {
    if (Object.keys(errorsForStep(stepId, validateDraft(draft, lang))).length > 0) {
      setShowErrors(true);
      return;
    }
    const target = returnToReview ? REVIEW : stepIndex + 1;
    setReturnToReview(false);
    goTo(target);
  };

  const edit = (step: StepId) => {
    setReturnToReview(true);
    goTo(STEP_IDS.indexOf(step));
  };

  const failWith = (kind: SubmitProblem) => {
    setProblem(kind);
    setSubmitting(false);
    submittingRef.current = false;
    // Turnstile tokens are single use: always ask for a fresh one before the next try.
    setToken(null);
    setCaptchaNonce((n) => n + 1);
  };

  const handleOutcome = (outcome: SubmitOutcome) => {
    switch (outcome.kind) {
      case "success":
        saveReference(outcome.referenceCode);
        // replace: Back does not return to a fresh, re-submittable form. Stay "submitting" until navigation.
        router.replace(plannerConfirmationPath(lang));
        return;
      case "validation": {
        setServerErrors(outcome.fieldErrors);
        setShowErrors(true);
        const step = firstStepWithErrors(outcome.fieldErrors);
        if (step) setStepIndex(STEP_IDS.indexOf(step));
        return failWith("validation");
      }
      case "rate_limited":
        return failWith("rateLimited");
      case "captcha_failed":
        return failWith("captchaFailed");
      case "network":
        return failWith(navigator.onLine ? "network" : "offline");
      default:
        return failWith("service");
    }
  };

  const submit = async () => {
    if (submittingRef.current) return; // double click / double Enter
    const clientErrors = validateDraft(draft, lang);
    if (Object.keys(clientErrors).length > 0) {
      setShowErrors(true);
      const step = firstStepWithErrors(clientErrors);
      if (step && step !== "review") {
        setStepIndex(STEP_IDS.indexOf(step));
        setProblem("validation");
      }
      return;
    }
    if (!navigator.onLine) return setProblem("offline");
    if (turnstileSiteKey && !token) return setProblem("captchaPending");

    submittingRef.current = true;
    setSubmitting(true);
    setProblem(null);

    const attribution = captureAttribution(
      sessionStorage,
      readAttribution({
        search: window.location.search,
        pathname: window.location.pathname,
        referrer: document.referrer,
        ownHost: window.location.host,
      }),
    );
    // Same answers => same idempotency key, so a retry after a lost response can never create a second lead.
    const fingerprint = JSON.stringify(buildPayload(draft, { locale: lang, attribution }));
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) {
      attempt.current = { key: crypto.randomUUID(), fingerprint };
    }
    const payload = buildPayload(draft, {
      locale: lang,
      attribution,
      idempotencyKey: attempt.current.key,
      turnstileToken: token ?? undefined,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      handleOutcome(await postLead(payload, controller.signal));
    } finally {
      clearTimeout(timer);
    }
  };

  const common = { copy, locale: lang, draft, update, errors: stepErrors };
  const isReview = stepId === "review";
  const problemText =
    !online && isReview ? copy.status.offline : problem ? copy.status[problem] : null;
  const progressText = copy.progress.step
    .replace("{current}", String(stepIndex + 1))
    .replace("{total}", String(STEP_IDS.length));

  const stepCopy = {
    when: copy.when,
    who: copy.who,
    experience: copy.experience,
    duration: copy.duration,
    budget: copy.budget,
    contact: copy.contact,
    review: copy.review,
  }[stepId];

  return (
    <div className="relative rounded-3xl border border-sand/15 bg-ink-deep/40 p-5 sm:p-10">
      {/* Honeypot: invisible to people and assistive tech; bots that fill every field get rejected. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          {copy.review.honeypot}
          <input
            type="text"
            name="hp_field"
            tabIndex={-1}
            autoComplete="off"
            value={draft.website}
            onChange={(event) => setDraft((d) => ({ ...d, website: event.target.value }))}
          />
        </label>
      </div>

      <PlannerProgress
        label={copy.progress.label}
        stepText={progressText}
        stepName={copy.stepNames[stepIndex]}
        current={stepIndex}
        total={STEP_IDS.length}
      />
      <p className="mt-3 text-xs text-sand/50">{copy.common.requiredNote}</p>

      <div className="mt-8">
        <PlannerStep
          key={stepId}
          id={`planner-${stepId}`}
          title={"title" in stepCopy ? stepCopy.title : ""}
          hint={"hint" in stepCopy ? stepCopy.hint : undefined}
          focusHeading={navigated}
          onSubmit={isReview ? submit : next}
          onBack={stepIndex > 0 ? () => goTo(stepIndex - 1) : undefined}
          backLabel={copy.common.back}
          nextLabel={copy.common.continue}
          footer={
            isReview ? (
              <div className="mt-8">
                {problemText && (
                  <div
                    role="alert"
                    className="mb-4 rounded-2xl border border-red-300/40 bg-red-300/10 px-4 py-3 text-sm text-red-100"
                  >
                    {problemText}
                  </div>
                )}
                <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => goTo(stepIndex - 1)}
                    disabled={submitting}
                    className="min-h-12 rounded-full px-5 text-base font-semibold text-sand/80 transition-colors hover:text-gold disabled:opacity-50"
                  >
                    {copy.common.back}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !online}
                    aria-busy={submitting}
                    className="min-h-14 rounded-full bg-gold px-8 text-base font-semibold text-ink transition-colors hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? copy.review.submitting
                      : problem && problem !== "validation" && problem !== "captchaPending"
                        ? copy.status.retry
                        : copy.review.submit}
                  </button>
                </div>
                <p className="mt-4 text-center text-sm text-sand/60">{copy.review.reassurance}</p>
              </div>
            ) : undefined
          }
        >
          {stepId === "when" && <WhenStep {...common} />}
          {stepId === "who" && <WhoStep {...common} />}
          {stepId === "experience" && <ExperienceStep {...common} />}
          {stepId === "duration" && <DurationStep {...common} />}
          {stepId === "budget" && <BudgetStep {...common} />}
          {stepId === "contact" && <ContactStep {...common} />}
          {isReview && (
            <ReviewStep
              {...common}
              onEdit={edit}
              turnstileSiteKey={turnstileSiteKey}
              captchaNonce={captchaNonce}
              onToken={setToken}
            />
          )}
        </PlannerStep>
      </div>
      {!isReview && problemText && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {problemText}
        </p>
      )}
    </div>
  );
}
