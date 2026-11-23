"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { trackOnce } from "@/lib/analytics/browser";
import type { AnalyticsEvent } from "@/lib/analytics/events";
import type { Locale } from "@/i18n/config";
import { formatNumber, type JourneyCopy } from "./copy";
import { JourneyStage } from "./JourneyStage";
import { computeSchedule, stations } from "./stations";
import { buildJourney, stationIndexAt } from "./timeline";

export type JourneyAnimatedProps = {
  lang: Locale;
  copy: JourneyCopy;
  variant: "desktop" | "mobile";
};

// Loaded on demand by JourneyEnhancer, so GSAP never ships with the first paint.
export function JourneyAnimated({ lang, copy, variant }: JourneyAnimatedProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const schedule = useMemo(() => computeSchedule(), []);
  const [stationIndex, setStationIndex] = useState(-1);
  const [railIndex, setRailIndex] = useState(-1);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true }); // the mobile URL bar must not restart the pin

    // The ScrollTrigger also reports through React state, but only when the station actually changes.
    const marks = schedule.marks;
    const context = gsap.context(() => {
      const built = buildJourney({
        gsap,
        ScrollTrigger,
        root: stage,
        stations,
        scrollPerUnit: variant === "mobile" ? 2.4 : 3.5,
        lite: variant === "mobile",
        format: (n, decimals) => formatNumber(n, lang, decimals),
        onProgress: (progress) => {
          setStationIndex(stationIndexAt(progress * schedule.total, schedule.times));
          let rail = -1;
          marks.slice(1).forEach((mark, i) => {
            if (progress >= mark - 0.005) rail = i;
          });
          setRailIndex(rail);
        },
      });
      triggerRef.current = built.scrollTrigger;
    }, stage);

    return () => {
      context.revert(); // kills the timeline and the pin, restores inline styles
      triggerRef.current = null;
    };
  }, [lang, variant, schedule]);

  // Station N reached (1 = Alexandria ... 5 = Abu Simbel), once per page view. The finale is not a station.
  useEffect(() => {
    if (railIndex < 0 || railIndex >= stations.length) return;
    trackOnce(`journey_station_${railIndex + 1}` as AnalyticsEvent, { locale: lang });
  }, [railIndex, lang]);

  const scrollToProgress = (fraction: number) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    window.scrollTo({
      top: trigger.start + (trigger.end - trigger.start) * fraction,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div>
        <JourneyStage
          stageRef={stageRef}
          lang={lang}
          copy={copy}
          variant={variant}
          mountedUpTo={stationIndex + 1}
          railIndex={railIndex}
          format={(n, decimals) => formatNumber(n, lang, decimals)}
          onRail={(i) => scrollToProgress(schedule.marks[i + 1])}
          onSkip={() =>
            window.scrollTo({
              top: (endRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY,
              behavior: "smooth",
            })
          }
        />
      </div>
      <div ref={endRef} />
    </>
  );
}
