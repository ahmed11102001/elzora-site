"use client";

import { Component, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { JourneyCopy } from "./copy";
import { blockedReason, readGateInput, readOverride } from "./gate";
import type { JourneyAnimatedProps } from "./JourneyAnimated";

function whenIdle(callback: () => void): () => void {
  const run = () => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(callback, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(callback, 1000);
    return () => clearTimeout(id);
  };
  if (document.readyState === "complete") return run();
  let cancel = () => {};
  const onLoad = () => {
    cancel = run();
  };
  window.addEventListener("load", onLoad, { once: true });
  return () => {
    window.removeEventListener("load", onLoad);
    cancel();
  };
}

// If the animated journey crashes, fall back to the static version instead of an error page.
class JourneyBoundary extends Component<
  { onError: (error: Error) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type EnhancerProps = { lang: Locale; copy: JourneyCopy; intro: ReactNode; stack: ReactNode };

/**
 * Static first, animated when possible.
 * The server HTML holds the intro and every station as a card (the fallback, also for search engines).
 * After the page is idle the animation code (GSAP + ScrollTrigger, ~50 KB gzip) is downloaded, and as
 * soon as it is ready the section is swapped for the animated journey, unless the visitor has already
 * scrolled deep into the static cards. If the device or connection should not run it,
 * or anything fails, the static version simply stays.
 * In development (or with ?journey=... in the URL) the decision is logged to the console.
 */
export function JourneyEnhancer({ lang, copy, intro, stack }: EnhancerProps) {
  const host = useRef<HTMLDivElement>(null);
  const [Animated, setAnimated] = useState<ComponentType<JourneyAnimatedProps> | null>(null);
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    const override = readOverride(window.location.search);
    const debug = process.env.NODE_ENV !== "production" || override !== null;
    const log = (message: string, detail?: unknown) => {
      if (debug) console.info(`[journey] ${message}`, detail ?? "");
    };

    const reason =
      override === "static"
        ? "forced by ?journey=static"
        : override === "animated"
          ? null
          : blockedReason(readGateInput());
    if (reason) {
      log(`static version: ${reason}`);
      return;
    }

    let cancelled = false;
    const cancelIdle = whenIdle(() => {
      import("./JourneyAnimated")
        .then((module) => {
          if (cancelled) return;
          // Swap while the visitor is above the section or still on its first screen (the intro looks the
          // same in the animated version). Deeper inside the static cards, leave them alone.
          const top = host.current?.getBoundingClientRect().top ?? 1;
          if (override !== "animated" && top < -window.innerHeight * 0.9) {
            log("static version: the visitor is already deep inside the section");
            return;
          }
          setVariant(window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop");
          setAnimated(() => module.JourneyAnimated);
          log("animated version started");
        })
        .catch((error) => log("static version: the animation code failed to load", error));
    });

    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, []);

  return (
    <div ref={host}>
      {Animated ? (
        <JourneyBoundary
          onError={(error) => {
            console.error("[journey] the animated version crashed, showing the static one", error);
            setAnimated(null);
          }}
        >
          <Animated lang={lang} copy={copy} variant={variant} />
        </JourneyBoundary>
      ) : (
        <>
          {intro}
          {stack}
        </>
      )}
    </div>
  );
}
