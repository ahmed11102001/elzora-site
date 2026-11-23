"use client";

import { openConsentSettings } from "@/lib/consent/store";

// Footer link that reopens the cookie choices. Withdrawing consent must be as easy as giving it.
export function CookieSettingsButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      {label}
    </button>
  );
}
