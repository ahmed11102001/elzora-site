"use client";

import { useMemo } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { formatMonth } from "@/lib/leads/format";
import { DATE_MODES, SEASONS } from "@/lib/leads/options";
import { ChoiceCard } from "../ChoiceCard";
import { errorText, type StepProps } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const isoLocal = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return isoLocal(date);
}

// These two only mount after the visitor picks a mode, so the clock is read in the browser,
// never while the page is prerendered.
function SpecificDates({ copy, draft, update, errors }: StepProps) {
  const minArrival = useMemo(() => addDays(isoLocal(new Date()), 1), []);
  const minDeparture = draft.arrival ? addDays(draft.arrival, 1) : minArrival;
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label={copy.when.arrival} error={errorText(copy, errors.arrival)}>
        {(props) => (
          <Input
            {...props}
            type="date"
            required
            min={minArrival}
            value={draft.arrival}
            onChange={(event) => {
              const arrival = event.target.value;
              // Keep the stay valid: push the departure out when it would fall on or before arrival.
              const departure =
                draft.departure && arrival && draft.departure <= arrival ? "" : draft.departure;
              update({ arrival, departure });
            }}
          />
        )}
      </Field>
      <Field label={copy.when.departure} error={errorText(copy, errors.departure)}>
        {(props) => (
          <Input
            {...props}
            type="date"
            required
            min={minDeparture}
            value={draft.departure}
            onChange={(event) => update({ departure: event.target.value })}
          />
        )}
      </Field>
    </div>
  );
}

function FlexibleWhen({ copy, locale, draft, update, errors }: StepProps) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 18 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
      return { value: `month:${value}`, label: formatMonth(value, locale) };
    });
  }, [locale]);

  return (
    <Field
      className="mt-5"
      label={copy.when.flexibleWhen}
      hint={copy.when.flexibleHint}
      error={errorText(copy, errors.flexibleWhen)}
    >
      {(props) => (
        <Select
          {...props}
          required
          value={draft.flexibleWhen}
          onChange={(event) => update({ flexibleWhen: event.target.value })}
        >
          <option value="">{copy.when.choosePlaceholder}</option>
          <option value="any">{copy.when.any}</option>
          <optgroup label={copy.when.seasonsGroup}>
            {SEASONS.map((season) => (
              <option key={season} value={`season:${season}`}>
                {copy.when.seasons[season]}
              </option>
            ))}
          </optgroup>
          <optgroup label={copy.when.monthsGroup}>
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </optgroup>
        </Select>
      )}
    </Field>
  );
}

export function WhenStep(props: StepProps) {
  const { copy, draft, update, errors } = props;
  return (
    <>
      <div role="radiogroup" aria-label={copy.when.title} className="grid gap-3">
        {DATE_MODES.map((mode) => (
          <ChoiceCard
            key={mode}
            type="radio"
            name="dateMode"
            value={mode}
            checked={draft.dateMode === mode}
            onChange={() => update({ dateMode: mode })}
            title={copy.when.options[mode].title}
            text={copy.when.options[mode].text}
          />
        ))}
      </div>
      {errors.dateMode && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {copy.errors.choose}
        </p>
      )}
      {draft.dateMode === "specific" && <SpecificDates {...props} />}
      {draft.dateMode === "flexible" && <FlexibleWhen {...props} />}
    </>
  );
}
