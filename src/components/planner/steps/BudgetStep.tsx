"use client";

import { Chip } from "@/components/ui/Chip";
import { budgetLabel } from "@/lib/leads/format";
import { BUDGETS } from "@/lib/leads/options";
import { ChoiceCard } from "../ChoiceCard";
import type { StepProps } from "./types";

export function BudgetStep({ copy, locale, draft, update, errors }: StepProps) {
  return (
    <>
      <Chip className="mb-4">{copy.budget.perPerson}</Chip>
      <div role="radiogroup" aria-label={copy.budget.title} className="grid gap-3 sm:grid-cols-2">
        {BUDGETS.map((budget) => (
          <ChoiceCard
            key={budget}
            type="radio"
            name="budget"
            value={budget}
            checked={draft.budget === budget}
            onChange={() => update({ budget })}
            title={budgetLabel(budget, locale, copy.budget.templates)}
          />
        ))}
      </div>
      {errors.budget && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {copy.errors.choose}
        </p>
      )}
      <p className="mt-5 text-sm text-sand/65">{copy.budget.note}</p>
    </>
  );
}
