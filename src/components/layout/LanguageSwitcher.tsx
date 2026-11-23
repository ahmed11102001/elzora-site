"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import { switchPath, type TripSlugMap } from "@/lib/switch-path";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  lang,
  label,
  tripSlugs,
}: {
  lang: Locale;
  label: string;
  tripSlugs: TripSlugMap;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1 text-sm font-semibold">
        {locales.map((l) => (
          <li key={l}>
            <Link
              href={switchPath(pathname, l, tripSlugs)}
              lang={l}
              hrefLang={l}
              aria-label={localeLabels[l].full}
              aria-current={l === lang ? "true" : undefined}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                l === lang ? "bg-fg/15 text-accent" : "text-fg/80 hover:text-accent",
              )}
            >
              {localeLabels[l].short}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
