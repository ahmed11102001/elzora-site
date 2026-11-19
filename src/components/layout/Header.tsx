import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { navRoutes, plannerPath } from "@/lib/routes";
import { siteName, whatsappNumber } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";

export function Header({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const navItems = navRoutes.map(({ key, path }) => ({
    href: `/${lang}${path}`,
    label: dict.nav[key],
  }));
  const whatsapp = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;

  return (
    <header className="sticky top-0 z-40 border-b border-sand/10 bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href={`/${lang}`}
          className="font-display text-2xl font-semibold tracking-[0.18em] text-sand"
        >
          {siteName}
        </Link>

        {navRoutes.length > 0 && (
          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {navRoutes.map(({ key, path }) => (
              <Link
                key={key}
                href={`/${lang}${path}`}
                className="text-sm font-medium text-sand/80 hover:text-gold"
              >
                {dict.nav[key]}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher lang={lang} label={dict.header.language} />
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
