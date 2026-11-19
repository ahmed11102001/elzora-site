"use client";

import { DURATIONS } from "@/lib/leads/options";
import { ChoiceCard } from "../ChoiceCard";
import type { StepProps } from "./types";

export function DurationStep({ copy, draft, update, errors }: StepProps) {
  return (
    <>
      <div role="radiogroup" aria-label={copy.duration.title} className="grid gap-3 sm:grid-cols-2">
        {DURATIONS.map((duration) => (
          <ChoiceCard
            key={duration}
            type="radio"
            name="duration"
            value={duration}
            checked={draft.duration === duration}
            onChange={() => update({ duration })}
            title={copy.duration.options[duration]}
          />
        ))}
      </div>
      {errors.duration && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {copy.errors.choose}
        </p>
      )}
    </>
  );
}
