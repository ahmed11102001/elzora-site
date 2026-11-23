import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { routePath, type RouteKey } from "@/lib/routes";
import { siteName } from "@/lib/site";
import { Container } from "@/components/ui/Container";

const browse: { key: "trips" | "destinations" | "about" | "contact"; route: RouteKey }[] = [
  { key: "trips", route: "trips" },
  { key: "destinations", route: "destinations" },
  { key: "about", route: "about" },
  { key: "contact", route: "contact" },
];
const legal: { key: "privacy" | "terms" | "cookies"; route: RouteKey }[] = [
  { key: "privacy", route: "privacy" },
  { key: "terms", route: "terms" },
  { key: "cookies", route: "cookies" },
];

export function Footer({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const linkClass = "text-fg/70 hover:text-accent";
  return (
    <footer className="dark-zone border-t border-fg/10 bg-surface py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <Container className="flex flex-col gap-8 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-xl font-semibold tracking-[0.18em] text-fg">{siteName}</p>
          <p className="text-fg/70">{dict.footer.tagline}</p>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <nav aria-label={dict.footer.browse}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {browse.map(({ key, route }) => (
                <li key={key}>
                  <Link href={routePath(lang, route)} className={linkClass}>
                    {dict.nav[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={dict.footer.legal.label}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {legal.map(({ key, route }) => (
                <li key={key}>
                  <Link href={routePath(lang, route)} className={linkClass}>
                    {dict.footer.legal[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="text-fg/70">
          © {siteName}. {dict.footer.rights}
        </p>
      </Container>
    </footer>
  );
}
