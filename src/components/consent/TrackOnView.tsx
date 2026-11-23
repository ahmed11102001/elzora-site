"use client";

import { useEffect, useRef } from "react";
import { trackOnce } from "@/lib/analytics/browser";
import type { AnalyticsEvent } from "@/lib/analytics/events";

// Renders an invisible marker and fires `event` once when its parent element crosses the middle of the
// screen. Used for sections that are many screens tall, where "x% visible" would never be reached.
export function TrackOnView({ event }: { event: AnalyticsEvent }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = marker.current?.parentElement;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackOnce(event);
          observer.disconnect();
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [event]);

  return <span ref={marker} hidden />;
}
