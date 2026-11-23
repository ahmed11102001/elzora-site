"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isWithdrawn } from "@/lib/consent/consent";
import { useConsentState } from "@/lib/consent/store";
import {
  applyConsent,
  clearTrackingCookies,
  initConsentMode,
  track,
  trackPageView,
} from "@/lib/analytics/browser";
import { trackingEnabled } from "@/lib/analytics/config";
import type { ConsentChoice } from "@/lib/consent/consent";

const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com"]);

// Renders nothing. Applies the visitor's decision to the measurement tools, sends page views and counts
// WhatsApp clicks. With no tool configured it does nothing at all.
export function Tracking() {
  return trackingEnabled ? <TrackingInner /> : null;
}

function TrackingInner() {
  const pathname = usePathname();
  const { ready, stored } = useConsentState();
  const previous = useRef<ConsentChoice | null>(null);

  // 1. Defaults first: everything denied, no network request.
  useEffect(() => {
    initConsentMode();
  }, []);

  // 2. The decision. Withdrawing a category removes its cookies and reloads, which stops its scripts.
  useEffect(() => {
    if (!ready) return;
    const now: ConsentChoice | null = stored
      ? { analytics: stored.analytics, marketing: stored.marketing }
      : null;
    if (isWithdrawn(previous.current, now)) {
      clearTrackingCookies();
      window.location.reload();
      return;
    }
    previous.current = now;
    applyConsent(now);
    // A tool that was just allowed has not seen this page yet.
    trackPageView(window.location.pathname);
  }, [ready, stored]);

  // 3. Route changes in the single-page app.
  useEffect(() => {
    if (ready) trackPageView(pathname);
  }, [pathname, ready]);

  // 4. WhatsApp clicks, wherever the link is (header, trust bar, contact page, finale).
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      try {
        const url = new URL((link as HTMLAnchorElement).href, window.location.href);
        if (WHATSAPP_HOSTS.has(url.hostname)) {
          track("whatsapp_click", { location: window.location.pathname });
        }
      } catch {
        // not a valid URL: ignore
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
