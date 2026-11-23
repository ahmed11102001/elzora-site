import Link from "next/link";
import type { TripView } from "@/content/trips-public";
import { destinationSlug } from "@/content/destination-slugs";
import type { Destination, TripStyle } from "@/content/schema";
import { localize } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Container } from "@/components/ui/Container";
import { Check, Clock } from "@/components/ui/icons";
import { Photo } from "@/components/ui/Photo";
import { TripCard } from "@/components/trips/TripCard";
import { plannerPath, routePath } from "@/lib/routes";
import { siteUrl } from "@/lib/site";
import { tripPublicPath } from "@/lib/trip-paths";

type Props = {
  trip: TripView;
  lang: Locale;
  dict: Dictionary;
  styles: TripStyle[];
  destinations: Destination[];
  related: TripView[];
  /** Preview of a saved draft: shows a banner, no structured data. */
  preview?: boolean;
};

const h2 = "font-display text-3xl font-semibold sm:text-4xl";

// One trip page, used by the public page and by the signed draft preview. Everything shown comes from the
// trip in this language only; no price or availability is promised unless a partner confirmed a price.
export function TripDetail({ trip, lang, dict, styles, destinations, related, preview }: Props) {
  const t = dict.trips;
  const d = t.detail;
  const days = `${trip.durationDays} ${trip.durationDays === 1 ? t.day : t.days}`;
  const price = trip.priceFromEUR
    ? `${t.from} €${trip.priceFromEUR.toLocaleString(lang)}`
    : t.priceOnRequest;
  const styleNames = trip.styleIds.flatMap((id) => {
    const style = styles.find((s) => s.id === id);
    return style ? [localize(style.title, lang)] : [];
  });
  const places = trip.destinationIds.flatMap((id) => {
    const place = destinations.find((x) => x.id === id);
    return place?.name[lang] ? [{ id, name: place.name[lang] as string }] : [];
  });
  const url = `${siteUrl}${tripPublicPath(lang, trip.slug)}`;
  const plan = `${plannerPath(lang)}?trip=${encodeURIComponent(trip.slug)}`;

  const structured = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: trip.title,
    description: trip.summary,
    url,
    inLanguage: lang,
    ...(trip.image ? { image: `${siteUrl}/images/${trip.image.photoId}-1280.webp` } : {}),
    ...(trip.itinerary.length > 0
      ? {
          itinerary: {
            "@type": "ItemList",
            itemListElement: trip.itinerary.map((day) => ({
              "@type": "ListItem",
              position: day.day,
              name: day.title,
            })),
          },
        }
      : {}),
  };

  return (
    <article>
      {preview && (
        <aside
          role="status"
          className="sticky top-16 z-30 border-b border-accent/40 bg-accent/15 px-4 py-2 text-center text-sm text-fg backdrop-blur"
        >
          {d.previewBanner}{" "}
          {/* A form, not a link: <Link> would prefetch the route and end the preview by itself. */}
          <form action="/api/preview/exit" method="get" className="inline">
            <button type="submit" className="font-semibold underline hover:text-accent">
              {d.exitPreview}
            </button>
          </form>
        </aside>
      )}
      {!preview && <JsonLd data={structured} />}
      <Breadcrumbs
        label={d.breadcrumbs}
        items={[
          { label: d.home, href: `/${lang}` },
          { label: dict.nav.trips, href: routePath(lang, "trips") },
          { label: trip.title },
        ]}
      />

      <header className="py-10 sm:py-16">
        <Container className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Chip tone="neutral">
                <Clock className="size-3.5" />
                {days}
              </Chip>
              <Chip>{price}</Chip>
            </div>
            <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-6xl">
              {trip.title}
            </h1>
            {trip.subtitle && <p className="mt-3 text-xl text-accent">{trip.subtitle}</p>}
            <p className="mt-5 text-lg text-fg/85">{trip.summary}</p>
            <p className="mt-3 text-sm text-fg/70">{trip.priceNote || d.priceNoteDefault}</p>
            <div className="mt-7">
              <Button href={plan}>{d.cta.button}</Button>
            </div>
          </div>
          {trip.image && (
            <Photo
              id={trip.image.photoId}
              alt={trip.image.alt}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="aspect-[4/3] rounded-2xl"
            />
          )}
        </Container>
      </header>

      <Container className="space-y-14 pb-16 sm:space-y-20 sm:pb-24">
        <dl className="grid gap-4 rounded-2xl border border-fg/10 p-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs tracking-wider text-fg/70 uppercase">{d.duration}</dt>
            <dd className="mt-1 font-medium">{days}</dd>
          </div>
          {styleNames.length > 0 && (
            <div>
              <dt className="text-xs tracking-wider text-fg/70 uppercase">{d.styles}</dt>
              <dd className="mt-1 font-medium">{styleNames.join(", ")}</dd>
            </div>
          )}
          {places.length > 0 && (
            <div>
              <dt className="text-xs tracking-wider text-fg/70 uppercase">{d.destinations}</dt>
              <dd className="mt-1 flex flex-wrap gap-x-3 font-medium">
                {places.map((place) => (
                  <Link
                    key={place.id}
                    href={routePath(lang, "destinations", `/${destinationSlug(place.id, lang)}`)}
                    className="underline decoration-accent/50 hover:text-accent"
                  >
                    {place.name}
                  </Link>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {trip.description && (
          <section aria-labelledby="overview">
            <h2 id="overview" className={h2}>
              {d.overview}
            </h2>
            <div className="mt-4 max-w-3xl space-y-4 text-fg/85">
              {trip.description.split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        )}

        {trip.highlights.length > 0 && (
          <section aria-labelledby="highlights">
            <h2 id="highlights" className={h2}>
              {d.highlights}
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {trip.highlights.map((item) => (
                <li key={item} className="flex gap-2 text-fg/85">
                  <Check className="mt-1 size-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {trip.itinerary.length > 0 && (
          <section aria-labelledby="itinerary">
            <h2 id="itinerary" className={h2}>
              {d.itinerary}
            </h2>
            <ol className="mt-6 space-y-4">
              {trip.itinerary.map((day) => (
                <li key={day.day} className="rounded-2xl border border-fg/10 p-5">
                  <p className="text-xs font-semibold tracking-[0.25em] text-accent uppercase">
                    {d.day} {day.day}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-semibold">{day.title}</h3>
                  <p className="mt-2 text-fg/85">{day.description}</p>
                  {day.highlights.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg/75 marker:text-accent">
                      {day.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {(trip.inclusions.length > 0 || trip.exclusions.length > 0) && (
          <div className="grid gap-10 sm:grid-cols-2">
            {trip.inclusions.length > 0 && (
              <section aria-labelledby="included">
                <h2 id="included" className="font-display text-2xl font-semibold">
                  {d.included}
                </h2>
                <ul className="mt-4 space-y-2 text-fg/85">
                  {trip.inclusions.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-1 size-4 shrink-0 text-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {trip.exclusions.length > 0 && (
              <section aria-labelledby="not-included">
                <h2 id="not-included" className="font-display text-2xl font-semibold">
                  {d.notIncluded}
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-fg/75 marker:text-fg/40">
                  {trip.exclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {trip.gallery.length > 0 && (
          <section aria-labelledby="gallery">
            <h2 id="gallery" className={h2}>
              {d.gallery}
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trip.gallery.map((image) => (
                <li key={image.photoId}>
                  <Photo
                    id={image.photoId}
                    alt={image.alt}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[4/3] rounded-xl"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          aria-labelledby="trip-cta"
          className="dark-zone rounded-3xl border border-accent/30 bg-surface p-8 text-center sm:p-12"
        >
          <h2 id="trip-cta" className={h2}>
            {d.cta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-fg/85">{d.cta.text}</p>
          <div className="mt-6">
            <Button href={plan}>{d.cta.button}</Button>
          </div>
        </section>

        {related.length > 0 && (
          <section aria-labelledby="related">
            <h2 id="related" className={h2}>
              {d.related}
            </h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((other) => (
                <li key={other.id}>
                  <TripCard
                    trip={other}
                    lang={lang}
                    labels={t}
                    href={routePath(lang, "trips", `/${other.slug}`)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </article>
  );
}

/** Up to three other trips that share a style or a destination with this one. */
export function relatedTrips(trip: TripView, all: TripView[]): TripView[] {
  const score = (other: TripView) =>
    other.styleIds.filter((s) => trip.styleIds.includes(s)).length +
    other.destinationIds.filter((x) => trip.destinationIds.includes(x)).length;
  return all
    .filter((other) => other.id !== trip.id && score(other) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
}
