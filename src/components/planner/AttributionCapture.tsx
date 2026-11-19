"use client";

import { useEffect } from "react";
import { captureAttribution, readAttribution } from "@/lib/leads/attribution";

// Renders nothing. On the first page view of a visit it stores UTM/referrer/landing page in
// sessionStorage so the planner can attach them to the lead, even many pages later.
export function AttributionCapture() {
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
  return null;
}
