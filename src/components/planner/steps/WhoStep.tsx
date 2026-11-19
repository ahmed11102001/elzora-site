"use client";

import { Field, Select } from "@/components/ui/Field";
import { LIMITS } from "@/lib/leads/options";
import { Counter } from "../Counter";
import { errorText, type PlannerCopy, type StepProps } from "./types";

const ages = Array.from({ length: LIMITS.childAgeMax + 1 }, (_, age) => age);

function ageLabel(copy: PlannerCopy, age: number) {
  if (age === 0) return copy.who.ageUnder1;
  if (age === 1) return copy.who.age1;
  return copy.who.ageOther.replace("{age}", String(age));
}

export function WhoStep({ copy, draft, update, errors }: StepProps) {
  const setChildren = (children: number) => {
    // Resize the ages list but keep what has already been chosen.
    const childrenAges = Array.from({ length: children }, (_, i) => draft.childrenAges[i] ?? null);
    update({ children, childrenAges });
  };

  return (
    <div className="grid gap-3">
      <Counter
        label={copy.who.adults}
        hint={copy.who.adultsHint}
        value={draft.adults}
        min={1}
        max={Math.min(LIMITS.adultsMax, LIMITS.travelersMax - draft.children)}
        onChange={(adults) => update({ adults })}
        lessLabel={copy.who.adultsLess}
        moreLabel={copy.who.adultsMore}
      />
      <Counter
        label={copy.who.children}
        hint={copy.who.childrenHint}
        value={draft.children}
        min={0}
        max={Math.min(LIMITS.childrenMax, LIMITS.travelersMax - draft.adults)}
        onChange={setChildren}
        lessLabel={copy.who.childrenLess}
        moreLabel={copy.who.childrenMore}
      />
      {(errors.adults || errors.children) && (
        <p role="alert" className="text-sm text-red-300">
          {errorText(copy, errors.adults ?? errors.children)}
        </p>
      )}

      {draft.children > 0 && (
        <fieldset className="mt-3 rounded-2xl border border-sand/15 p-4 sm:p-5">
          <legend className="px-2 text-base font-semibold">{copy.who.agesTitle}</legend>
          <p className="mb-4 text-sm text-sand/65">{copy.who.agesHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {draft.childrenAges.map((age, index) => (
              <Field
                key={index}
                label={copy.who.childAge.replace("{n}", String(index + 1))}
                error={errorText(copy, errors[`childrenAges.${index}`] ?? errors.childrenAges)}
              >
                {(props) => (
                  <Select
                    {...props}
                    required
                    value={age === null ? "" : String(age)}
                    onChange={(event) => {
                      const next = [...draft.childrenAges];
                      next[index] = event.target.value === "" ? null : Number(event.target.value);
                      update({ childrenAges: next });
                    }}
                  >
                    <option value="">{copy.who.agePlaceholder}</option>
                    {ages.map((value) => (
                      <option key={value} value={value}>
                        {ageLabel(copy, value)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
