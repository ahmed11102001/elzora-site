"use client";

import { INTERESTS, type Interest } from "@/lib/leads/options";
import { ChoiceCard } from "../ChoiceCard";
import type { StepProps } from "./types";

export function ExperienceStep({ copy, draft, update, errors }: StepProps) {
  const toggle = (interest: Interest, checked: boolean) => {
    if (!checked) return update({ interests: draft.interests.filter((item) => item !== interest) });
    // "A bit of everything" and specific interests exclude each other.
    if (interest === "everything") return update({ interests: ["everything"] });
    update({ interests: [...draft.interests.filter((item) => item !== "everything"), interest] });
  };

  return (
    <>
      <div role="group" aria-label={copy.experience.title} className="grid gap-3 sm:grid-cols-2">
        {INTERESTS.map((interest) => (
          <ChoiceCard
            key={interest}
            type="checkbox"
            name="interests"
            value={interest}
            checked={draft.interests.includes(interest)}
            onChange={(checked) => toggle(interest, checked)}
            title={copy.experience.options[interest].title}
            text={copy.experience.options[interest].text}
          />
        ))}
      </div>
      {errors.interests && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {copy.errors.chooseMany}
        </p>
      )}
    </>
  );
}
