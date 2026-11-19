"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type PlannerStepProps = {
  id: string;
  title: string;
  hint?: string;
  /** Move keyboard/screen-reader focus to the heading (after the visitor navigates, not on first load). */
  focusHeading: boolean;
  onSubmit: () => void;
  onBack?: () => void;
  backLabel: string;
  nextLabel: string;
  nextDisabled?: boolean;
  /** Replaces the default "next" button (the review step has its own submit area). */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

// One screen of the planner: heading, content and Back/Continue. It is a <form>, so Enter in a text
// field continues. The parent re-mounts it per step (key), which also restarts the fade-in.
export function PlannerStep({
  id,
  title,
  hint,
  focusHeading,
  onSubmit,
  onBack,
  backLabel,
  nextLabel,
  nextDisabled,
  footer,
  children,
}: PlannerStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
    // Only when this step mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form
      noValidate
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="motion-safe:animate-planner-in"
    >
      <h2
        id={`${id}-title`}
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl leading-tight font-semibold text-balance outline-none sm:text-4xl"
      >
        {title}
      </h2>
      {hint && <p className="mt-2 text-base text-sand/70">{hint}</p>}

      <div className="mt-6 sm:mt-8">{children}</div>

      {footer ?? (
        <div className="mt-8 flex items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="min-h-12 rounded-full px-5 text-base font-semibold text-sand/80 transition-colors hover:text-gold"
            >
              {backLabel}
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={nextDisabled}
            className={cn(
              "min-h-12 rounded-full bg-gold px-8 text-base font-semibold text-ink transition-colors hover:bg-sand",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {nextLabel}
          </button>
        </div>
      )}
    </form>
  );
}
