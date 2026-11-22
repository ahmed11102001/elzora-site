import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDestinations, getTripStyles } from "@/content";
import { getPreviewTrip, getPublicTrips } from "@/content/public";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getPreviewPayload } from "@/lib/preview-access";
import { TripDetail, relatedTrips } from "@/components/trips/TripDetail";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The saved draft of a trip, for the dashboard's signed preview. The proxy rewrites a trip address here only
// when the visitor holds a valid preview cookie; this page checks it again and shows nothing otherwise.
export default function PreviewPage({ params }: PageProps<"/[lang]/trips/[slug]/preview">) {
  return (
    <Suspense fallback={null}>
      <Draft params={params} />
    </Suspense>
  );
}

async function Draft({ params }: Pick<PageProps<"/[lang]/trips/[slug]/preview">, "params">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const access = await getPreviewPayload();
  if (!access || access.l !== lang) notFound();

  const trip = await getPreviewTrip(access.t, lang);
  // The link was made for this exact page: the slug in the address must be the trip's slug.
  if (!trip || trip.slug !== slug) notFound();

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
      preview
    />
  );
}
