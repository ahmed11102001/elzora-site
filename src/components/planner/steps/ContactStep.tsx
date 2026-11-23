"use client";

import { useMemo } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { countryOptions } from "@/lib/leads/format";
import { LIMITS } from "@/lib/leads/options";
import { errorText, type StepProps } from "./types";

export function ContactStep({ copy, locale, draft, update, errors }: StepProps) {
  const countries = useMemo(() => countryOptions(locale), [locale]);
  const optional = ` (${copy.common.optional.toLowerCase()})`;

  return (
    <div className="grid gap-5">
      <Field label={copy.contact.fullName} error={errorText(copy, errors.fullName)}>
        {(props) => (
          <Input
            {...props}
            type="text"
            required
            autoComplete="name"
            maxLength={LIMITS.nameMax}
            value={draft.fullName}
            onChange={(event) => update({ fullName: event.target.value })}
          />
        )}
      </Field>
      <Field
        label={copy.contact.email}
        hint={copy.contact.emailHint}
        error={errorText(copy, errors.email)}
      >
        {(props) => (
          <Input
            {...props}
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={LIMITS.emailMax}
            value={draft.email}
            onChange={(event) => update({ email: event.target.value })}
          />
        )}
      </Field>
      <Field label={copy.contact.country} error={errorText(copy, errors.country)}>
        {(props) => (
          <Select
            {...props}
            required
            autoComplete="country"
            value={draft.country}
            onChange={(event) => update({ country: event.target.value })}
          >
            <option value="">{copy.contact.countryPlaceholder}</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        label={`${copy.contact.phone}${optional}`}
        hint={copy.contact.phoneHint}
        error={errorText(copy, errors.phone)}
      >
        {(props) => (
          <Input
            {...props}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={LIMITS.phoneMax}
            value={draft.phone}
            onChange={(event) => update({ phone: event.target.value })}
          />
        )}
      </Field>
      <Field
        label={`${copy.contact.notes}${optional}`}
        hint={copy.contact.notesCount
          .replace("{count}", String(draft.notes.length))
          .replace("{max}", String(LIMITS.notesMax))}
        error={errorText(copy, errors.notes)}
      >
        {(props) => (
          <Textarea
            {...props}
            maxLength={LIMITS.notesMax}
            placeholder={copy.contact.notesPlaceholder}
            value={draft.notes}
            onChange={(event) => update({ notes: event.target.value })}
          />
        )}
      </Field>
      <p className="text-sm text-fg/70">{copy.contact.privacyNote}</p>
    </div>
  );
}
