"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { closeConsentSettings, saveConsent, useConsentState } from "@/lib/consent/store";

export type ConsentCopy = {
  title: string;
  text: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  save: string;
  policy: string;
  necessaryTitle: string;
  necessaryText: string;
  analyticsTitle: string;
  analyticsText: string;
  marketingTitle: string;
  marketingText: string;
  alwaysOn: string;
};

type Props = {
  copy: ConsentCopy;
  policyHref: string;
  /** Which categories exist at all (an unconfigured tool is not offered). */
  hasAnalytics: boolean;
  hasMarketing: boolean;
};

// Bottom card, not a wall: the site stays usable. "Accept all" and "Reject all" look the same on
// purpose (equal prominence). It appears until the visitor decides, and again from the footer link.
export function CookieBanner({ copy, policyHref, hasAnalytics, hasMarketing }: Props) {
  const { ready, stored, panelOpen } = useConsentState();
  const [detailsOpen, setDetailsOpen] = useState(false);
  // null = "not touched yet": show the saved choice (or off).
  const [analyticsDraft, setAnalytics] = useState<boolean | null>(null);
  const [marketingDraft, setMarketing] = useState<boolean | null>(null);
  const titleId = useId();
  const textId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const visible = ready && (stored === null || panelOpen);

  const details = detailsOpen || panelOpen; // reopened from the footer: show the choices right away
  const analytics = analyticsDraft ?? stored?.analytics ?? false;
  const marketing = marketingDraft ?? stored?.marketing ?? false;

  // Reopened from the footer: move focus into the card.
  useEffect(() => {
    if (panelOpen) panelRef.current?.focus();
  }, [panelOpen]);

  useEffect(() => {
    if (!visible || stored === null) return; // Escape only closes a reopened panel
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeConsentSettings();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, stored]);

  if (!visible) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    saveConsent({
      analytics: hasAnalytics && choice.analytics,
      marketing: hasMarketing && choice.marketing,
    });
    setDetailsOpen(false);
    setAnalytics(null);
    setMarketing(null);
  };

  const choiceButton =
    "min-h-11 flex-1 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={textId}
      tabIndex={-1}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-fg/15 bg-card p-5 text-fg shadow-2xl outline-none sm:bottom-5 sm:p-6"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <h2 id={titleId} className="font-display text-2xl font-semibold">
        {copy.title}
      </h2>
      <p id={textId} className="mt-2 text-sm leading-relaxed text-fg/80">
        {copy.text}{" "}
        <Link href={policyHref} className="font-semibold underline underline-offset-4">
          {copy.policy}
        </Link>
      </p>

      {details && (
        <div className="mt-4 space-y-3 border-t border-fg/10 pt-4">
          <Category title={copy.necessaryTitle} text={copy.necessaryText}>
            <span className="text-xs font-semibold tracking-wider text-fg/70 uppercase">
              {copy.alwaysOn}
            </span>
          </Category>
          {hasAnalytics && (
            <Category title={copy.analyticsTitle} text={copy.analyticsText}>
              <Toggle label={copy.analyticsTitle} checked={analytics} onChange={setAnalytics} />
            </Category>
          )}
          {hasMarketing && (
            <Category title={copy.marketingTitle} text={copy.marketingText}>
              <Toggle label={copy.marketingTitle} checked={marketing} onChange={setMarketing} />
            </Category>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          className={choiceButton}
          onClick={() => decide({ analytics: false, marketing: false })}
        >
          {copy.rejectAll}
        </button>
        <button
          type="button"
          className={choiceButton}
          onClick={() => decide({ analytics: true, marketing: true })}
        >
          {copy.acceptAll}
        </button>
        {details ? (
          <button
            type="button"
            className="min-h-11 rounded-full border border-fg/40 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
            onClick={() => decide({ analytics, marketing })}
          >
            {copy.save}
          </button>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded-full px-3 py-2.5 text-sm font-semibold underline underline-offset-4 hover:text-accent"
            aria-expanded={false}
            onClick={() => setDetailsOpen(true)}
          >
            {copy.customize}
          </button>
        )}
      </div>
    </div>
  );
}

function Category({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-fg/75">{text}</p>
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="size-6 cursor-pointer accent-accent"
    />
  );
}
