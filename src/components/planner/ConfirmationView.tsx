"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Check } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { readReference } from "@/lib/leads/client";
import { buildWhatsAppUrl } from "@/lib/leads/whatsapp";
import { plannerPath } from "@/lib/routes";
import type { PlannerCopy } from "./steps/types";

const subscribe = () => () => {};

// Reads the reference code the planner stored in sessionStorage (no personal data, not in the URL).
// Refreshing this page is safe: it never submits anything.
export function ConfirmationView({
  lang,
  copy,
  whatsappNumber,
}: {
  lang: Locale;
  copy: PlannerCopy["confirmation"];
  whatsappNumber: string;
}) {
  const reference = useSyncExternalStore(subscribe, readReference, () => null);

  if (!reference) {
    return (
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">{copy.missingTitle}</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-sand/80">{copy.missingText}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href={plannerPath(lang)}>{copy.planAgain}</Button>
          <Button href={`/${lang}`} variant="ghost">
            {copy.home}
          </Button>
        </div>
      </div>
    );
  }

  // Only the reference code goes into the WhatsApp message.
  const whatsappUrl = buildWhatsAppUrl(
    whatsappNumber,
    copy.whatsappMessage.replace("{reference}", reference),
  );

  return (
    <div className="text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full border border-gold text-gold">
        <Check className="size-8" />
      </span>
      <h1
        tabIndex={-1}
        className="mt-6 font-display text-4xl leading-tight font-semibold text-balance sm:text-6xl"
      >
        {copy.title}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-sand/85">{copy.text}</p>

      <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-gold/50 bg-gold/10 px-6 py-5">
        <p className="text-xs tracking-[0.25em] text-gold uppercase">{copy.referenceLabel}</p>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-wider select-all">
          {reference}
        </p>
        <p className="mt-1 text-sm text-sand/65">{copy.referenceHint}</p>
      </div>

      <div className="mx-auto mt-10 max-w-xl text-left">
        <h2 className="font-display text-2xl font-semibold">{copy.nextTitle}</h2>
        <ol className="mt-4 space-y-3">
          {copy.next.map((item, index) => (
            <li key={item} className="flex gap-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-gold/60 text-sm text-gold">
                {index + 1}
              </span>
              <span className="text-sand/85">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {whatsappUrl && <Button href={whatsappUrl}>{copy.whatsappCta}</Button>}
        <Button href={`/${lang}`} variant="ghost">
          {copy.home}
        </Button>
      </div>
    </div>
  );
}
