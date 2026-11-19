"use client";

import { useActionState, useState } from "react";
import { InputField } from "../ui/fields";
import { buttonClass } from "../ui/primitives";
import { createTrip, type SaveState } from "./actions";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export function NewTripForm() {
  const [state, action, pending] = useActionState<SaveState, FormData>(createTrip, {});
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="grid max-w-xl gap-4" noValidate>
      <InputField
        id="title"
        name="title"
        label="English title"
        value={title}
        maxLength={120}
        required
        onChange={(e) => {
          setTitle(e.target.value);
          if (!slugTouched) setSlug(slugify(e.target.value));
        }}
      />
      <InputField
        id="slug"
        name="slug"
        label="English URL slug"
        hint="Public address: /en/trips/your-slug. You can add the German slug later."
        value={slug}
        maxLength={80}
        autoCapitalize="none"
        spellCheck={false}
        required
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value.toLowerCase());
        }}
      />
      <InputField
        id="durationDays"
        name="durationDays"
        label="Duration (days)"
        type="number"
        inputMode="numeric"
        min={1}
        max={90}
        defaultValue={7}
        required
      />
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass()}>
          {pending ? "Creating…" : "Create draft"}
        </button>
      </div>
    </form>
  );
}
