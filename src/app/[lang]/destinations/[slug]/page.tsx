import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDestinationView, getDestinationViews, getPublicTrips } from "@/content/public";
import { destinationSlug } from "@/content/destination-slugs";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { plannerPath, routePath } from "@/lib/routes";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Photo } from "@/components/ui/Photo";
import { TripCard } from "@/components/trips/TripCard";

export async function generateStaticParams() {
  const params = (
    await Promise.all(
      locales.map(async (lang) =>
        (await getDestinationViews(lang)).map((place) => ({ lang, slug: place.slug })),
      ),
    )
  ).flat();
  return params.length > 0 ? params : [{ lang: defaultLocale, slug: "not-found" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/destinations/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const place = await getDestinationView(lang, slug);
  if (!place) return {};
  const languages: Record<string, string> = {};
  for (const l of locales) {
    if (place.slugs[l])
      languages[l] = routePath(l, "destinations", `/${destinationSlug(place.id, l)}`);
  }
  languages["x-default"] = languages[defaultLocale] ?? Object.values(languages)[0];
  return {
    title: `${place.name}: ${place.tagline}`,
    description:
      place.summary.length > 160 ? `${place.summary.slice(0, 157).trimEnd()}...` : place.summary,
    alternates: { canonical: routePath(lang, "destinations", `/${place.slug}`), languages },
  };
}

export default async function DestinationPage({
  params,
}: PageProps<"/[lang]/destinations/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const place = await getDestinationView(lang, slug);
  if (!place) notFound();
  const [dict, trips] = await Promise.all([getDictionary(lang), getPublicTrips(lang)]);
  const t = dict.destinations;
  const related = trips.filter((trip) => trip.destinationIds.includes(place.id));

  return (
    <article>
      <Breadcrumbs
        label={dict.trips.detail.breadcrumbs}
        items={[
          { label: dict.trips.detail.home, href: `/${lang}` },
          { label: dict.nav.destinations, href: routePath(lang, "destinations") },
          { label: place.name },
        ]}
      />
      <header className="py-10 sm:py-16">
        <Container className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-5xl leading-tight font-semibold text-balance sm:text-6xl">
              {place.name}
            </h1>
            <p className="mt-3 text-xl text-gold">{place.tagline}</p>
            <p className="mt-5 text-lg text-sand/85">{place.summary}</p>
          </div>
          {place.image && (
            <Photo
              id={place.image}
              alt=""
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="aspect-[4/3] rounded-2xl"
            />
          )}
        </Container>
      </header>

      <Container className="space-y-14 pb-16 sm:pb-24">
        {place.facts.length > 0 && (
          <section aria-labelledby="facts">
            <h2 id="facts" className="font-display text-3xl font-semibold">
              {t.facts}
            </h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {place.facts.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-sand/10 p-5">
                  <dt className="text-xs tracking-wider text-sand/60 uppercase">{fact.label}</dt>
                  <dd className="mt-1 text-lg font-medium">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section aria-labelledby="trips-here">
          <h2 id="trips-here" className="font-display text-3xl font-semibold">
            {t.tripsHere.replace("{name}", place.name)}
          </h2>
          {related.length > 0 ? (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((trip) => (
                <li key={trip.id}>
                  <TripCard
                    trip={trip}
                    lang={lang}
                    labels={dict.trips}
                    href={routePath(lang, "trips", `/${trip.slug}`)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 max-w-2xl text-sand/80">{t.noTrips.replace("{name}", place.name)}</p>
          )}
        </section>

        <section className="rounded-3xl border border-gold/30 bg-ink-deep p-8 text-center sm:p-12">
          <h2 className="font-display text-3xl font-semibold">
            {t.cta.title.replace("{name}", place.name)}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sand/85">{t.cta.text}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href={plannerPath(lang)}>{t.cta.button}</Button>
            <Button href={routePath(lang, "destinations")} variant="ghost">
              {t.all}
            </Button>
          </div>
        </section>
      </Container>
    </article>
  );
}
