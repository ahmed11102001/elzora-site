"use client";

import { useEffect, useRef } from "react";
import {
  captureAttribution,
  captureClickIds,
  readAttribution,
  readClickIds,
} from "@/lib/leads/attribution";
import { useConsentState } from "@/lib/consent/store";

// Renders nothing. On the first page view of a visit it stores UTM/referrer/landing page in
// sessionStorage so the planner can attach them to the lead, even many pages later.
// Ad click identifiers (gclid, fbclid) are different: they identify one person's ad click, so they are
// kept only after the visitor allowed marketing. Until then they wait in memory for this page view.
export function AttributionCapture() {
  const { ready, stored } = useConsentState();
  const pendingClickIds = useRef(
    typeof window === "undefined" ? {} : readClickIds(window.location.search),
  );
  const marketing = ready && stored?.marketing === true;

  useEffect(() => {
    captureAttribution(
      sessionStorage,
      readAttribution({
        search: window.location.search,
        pathname: window.location.pathname,
        referrer: document.referrer,
        ownHost: window.location.host,
      }),
    );
  }, []);

  useEffect(() => {
    if (!marketing) return;
    const ids = pendingClickIds.current;
    if (ids.gclid || ids.fbclid) captureClickIds(sessionStorage, ids);
  }, [marketing]);

  return null;
}
