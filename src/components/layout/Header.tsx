import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { TripSlugMap } from "@/lib/switch-path";
import { navRoutes, plannerPath, routePath } from "@/lib/routes";
import { siteName, whatsappNumber } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";

export function Header({
  lang,
  dict,
  tripSlugs,
}: {
  lang: Locale;
  dict: Dictionary;
  tripSlugs: TripSlugMap;
}) {
  const navItems = navRoutes.map(({ key, route }) => ({
    href: routePath(lang, route),
    label: dict.nav[key],
  }));
  const whatsapp = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;

  return (
    <header className="sticky top-0 z-40 border-b border-fg/10 bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href={`/${lang}`}
          className="font-display text-2xl font-semibold tracking-[0.18em] text-fg"
        >
          {siteName}
        </Link>

        {navRoutes.length > 0 && (
          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {navRoutes.map(({ key, route }) => (
              <Link
                key={key}
                href={routePath(lang, route)}
                className="text-sm font-medium text-fg/80 hover:text-accent"
              >
                {dict.nav[key]}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {/* usePathname() needs a Suspense boundary on routes whose address is only known per request
              (the draft preview); the placeholder keeps the header from jumping. */}
          <Suspense fallback={<span aria-hidden className="inline-block h-9 w-20" />}>
            <LanguageSwitcher lang={lang} label={dict.header.language} tripSlugs={tripSlugs} />
          </Suspense>
          {whatsapp && (
            <Button href={whatsapp} variant="ghost" size="sm" className="hidden sm:inline-flex">
              {dict.cta.whatsapp}
            </Button>
          )}
          <Button href={plannerPath(lang)} size="sm">
            {dict.cta.plan}
          </Button>
          {navItems.length > 0 && (
            <MobileNav items={navItems} label={dict.header.menu} closeLabel={dict.common.close} />
          )}
        </div>
      </Container>
    </header>
  );
}
