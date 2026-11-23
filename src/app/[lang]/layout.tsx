import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getTripSlugMap } from "@/content/public";
import {
  hasAnalyticsTool,
  hasMarketingTool,
  trackingConfig,
  trackingEnabled,
} from "@/lib/analytics/config";
import { routePath } from "@/lib/routes";
import { siteName, siteUrl } from "@/lib/site";
import type { TripSlugMap } from "@/lib/switch-path";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { Tracking } from "@/components/consent/Tracking";
import { AttributionCapture } from "@/components/planner/AttributionCapture";
import { PlannerMobileEntry } from "@/components/planner/PlannerMobileEntry";
import { cormorant, inter } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // edge-to-edge on notched phones; header/footer add safe-area padding
  themeColor: "#FBF6EC",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: dict.meta.title, template: `%s | ${siteName}` },
    description: dict.meta.description,
    openGraph: {
      siteName,
      type: "website",
      locale: locale === "de" ? "de_DE" : "en_GB",
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  // Unknown locale: render the default shell; the page itself returns 404.
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(locale);
  // The language switcher needs the slug of each trip in the other language. A failed read must not take
  // every page down: the switcher then falls back to the trips list.
  const tripSlugs: TripSlugMap = await getTripSlugMap().catch((error: unknown) => {
    console.error("trip slug map failed", error instanceof Error ? error.message : error);
    return { en: {}, de: {} };
  });

  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SkipLink label={dict.header.skip} />
        <Header lang={locale} dict={dict} tripSlugs={tripSlugs} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer lang={locale} dict={dict} />
        <AttributionCapture />
        {trackingEnabled && (
          <>
            {/* usePathname() needs a Suspense boundary here for the same reason as the language switcher. */}
            <Suspense fallback={null}>
              <Tracking />
            </Suspense>
            <CookieBanner
              copy={dict.consent}
              policyHref={routePath(locale, "cookies")}
              hasAnalytics={hasAnalyticsTool(trackingConfig)}
              hasMarketing={hasMarketingTool(trackingConfig)}
            />
          </>
        )}
        <Suspense fallback={null}>
          <PlannerMobileEntry lang={locale} label={dict.cta.planMobile} />
        </Suspense>
      </body>
    </html>
  );
}
