"use client";

import { Component, useEffect, useState, type ComponentType, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { JourneyCopy } from "./copy";
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

// If the animated journey crashes, show the intro instead of an error page.
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

type EnhancerProps = { lang: Locale; copy: JourneyCopy; intro: ReactNode };

/**
 * The animated journey, always. The server HTML holds only the intro (title + route map), which is the
 * same picture the animation starts on. Once the page is idle the animation code (GSAP + ScrollTrigger,
 * ~50 KB gzip) is downloaded and the intro is swapped for the journey. There is no static fallback:
 * if the code fails to load or the journey crashes, the intro stays.
 */
export function JourneyEnhancer({ lang, copy, intro }: EnhancerProps) {
  const [Animated, setAnimated] = useState<ComponentType<JourneyAnimatedProps> | null>(null);
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    let cancelled = false;
    const cancelIdle = whenIdle(() => {
      import("./JourneyAnimated")
        .then((module) => {
          if (cancelled) return;
          setVariant(window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop");
          setAnimated(() => module.JourneyAnimated);
        })
        .catch((error) => console.error("[journey] the animation code failed to load", error));
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, []);

  if (!Animated) return <>{intro}</>;
  return (
    <JourneyBoundary
      onError={(error) => {
        console.error("[journey] the animated version crashed, showing the intro", error);
        setAnimated(null);
      }}
    >
      <Animated lang={lang} copy={copy} variant={variant} />
    </JourneyBoundary>
  );
}
