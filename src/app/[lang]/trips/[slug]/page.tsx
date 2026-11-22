import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getDestinations, getTripStyles } from "@/content";
import { getPublicTrip, getPublicTrips, getTripRedirect } from "@/content/public";
import { hasLocale, locales, defaultLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { tripMetadata } from "@/lib/trip-seo";
import { TripDetail, relatedTrips } from "@/components/trips/TripDetail";

// Known trips are prerendered; a slug published later is rendered on first visit. An empty list would fail
// the build under Cache Components, so a placeholder stands in (it renders the normal 404).
export async function generateStaticParams() {
  try {
    const params = (
      await Promise.all(
        locales.map(async (lang) =>
          (await getPublicTrips(lang)).map((trip) => ({ lang, slug: trip.slug })),
        ),
      )
    ).flat();
    if (params.length > 0) return params;
  } catch (error) {
    console.error(
      "generateStaticParams(trips) failed",
      error instanceof Error ? error.message : error,
    );
  }
  return [{ lang: defaultLocale, slug: "not-found" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/trips/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const trip = await getPublicTrip(lang, slug);
  return trip ? tripMetadata(trip) : {};
}

export default async function TripPage({ params }: PageProps<"/[lang]/trips/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  return <PublicTrip lang={lang} slug={slug} />;
}

async function PublicTrip({ lang, slug }: { lang: Locale; slug: string }) {
  const trip = await getPublicTrip(lang, slug);
  if (!trip) {
    // A changed slug keeps working: the old address redirects permanently, but only to a page that exists.
    const target = await getTripRedirect(lang, slug);
    if (target) permanentRedirect(target);
    notFound(); // no English fallback on German pages: an unknown slug is a real 404
  }
  const [dict, styles, destinations, all] = await Promise.all([
    getDictionary(lang),
    getTripStyles(),
    getDestinations(),
    getPublicTrips(lang),
  ]);
  return (
    <TripDetail
      trip={trip}
      lang={lang}
      dict={dict}
      styles={styles}
      destinations={destinations}
      related={relatedTrips(trip, all)}
    />
  );
}
