"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/i18n/config";
import { plannerPath } from "@/lib/routes";

// Subtle "Plan my trip" pill for phones. It appears only after the visitor has scrolled past the first
// screen (which has its own CTA), hides while the journey section, the footer or any element marked
// data-hide-planner-entry is on screen, and never shows on the planner or its confirmation page.
const HIDE_WHILE_VISIBLE = "#journey, footer, [data-hide-planner-entry]";

export function PlannerMobileEntry({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const onPlanner = pathname.startsWith(plannerPath(lang));

  useEffect(() => {
    if (onPlanner) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onPlanner]);

  useEffect(() => {
    if (onPlanner) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setBlocked(visible.size > 0);
    });
    document.querySelectorAll(HIDE_WHILE_VISIBLE).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [onPlanner, pathname]);

  if (onPlanner || !scrolled || blocked) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
      <Button href={plannerPath(lang)} className="pointer-events-auto shadow-lg shadow-deep/60">
        {label}
      </Button>
    </div>
  );
}
