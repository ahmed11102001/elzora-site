"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname();
  // "/en/trips" -> "/trips"; "/en" -> ""
  const tail = pathname.split("/").slice(2).join("/");
  const suffix = tail ? `/${tail}` : "";

  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1 text-sm font-semibold">
        {locales.map((l) => (
          <li key={l}>
            <Link
              href={`/${l}${suffix}`}
              lang={l}
              hrefLang={l}
              aria-label={localeLabels[l].full}
              aria-current={l === lang ? "true" : undefined}
              className={cn(
                "rounded-full px-2.5 py-1 transition-colors",
                l === lang ? "bg-sand/15 text-gold" : "text-sand/80 hover:text-gold",
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
