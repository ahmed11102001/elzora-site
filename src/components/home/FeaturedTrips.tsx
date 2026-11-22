import type { TripView } from "@/content/trips-public";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { TripCard, TripCardSkeleton } from "@/components/trips/TripCard";
import { Button } from "@/components/ui/Button";
import { plannerPath, routePath } from "@/lib/routes";
import { Container } from "@/components/ui/Container";
import { FEATURED_TRIPS_LIMIT, featuredTrips } from "./home-data";

type FeaturedTripsProps = { lang: Locale; dict: Dictionary; trips: TripView[] };

const gridClassName = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

// Each card links to its trip page and has an anchor id so the "Choose your journey" tiles can jump to
// the trips of a style.
export function FeaturedTrips({ lang, dict, trips }: FeaturedTripsProps) {
  const featured = featuredTrips(trips);
  if (featured.length === 0) return null;
  const t = dict.home.trips;

  return (
    <section id="trips" aria-labelledby="trips-title" className="py-16 sm:py-24">
      <Container>
        <header className="mb-10 max-w-2xl sm:mb-14">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-gold uppercase">
            {t.eyebrow}
          </p>
          <h2
            id="trips-title"
            className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-sand/80">{t.description}</p>
        </header>

        <ul className={gridClassName}>
          {featured.map((trip) => (
            <li key={trip.id} id={`trip-${trip.id}`}>
              <TripCard
                trip={trip}
                lang={lang}
                labels={dict.trips}
                href={routePath(lang, "trips", `/${trip.slug}`)}
                showHighlights
              />
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center sm:mt-14">
          <Button href={routePath(lang, "trips")} variant="ghost">
            {dict.trips.list.title}
          </Button>
          <Button href={plannerPath(lang)} className="ml-3">
            {dict.cta.plan}
          </Button>
        </div>
      </Container>
    </section>
  );
}

// Same grid as FeaturedTrips, for a loading state once the trips come from a remote CMS.
export function FeaturedTripsSkeleton() {
  return (
    <div className={gridClassName} aria-hidden>
      {Array.from({ length: FEATURED_TRIPS_LIMIT }, (_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}
