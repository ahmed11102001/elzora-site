import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTripStyles } from "@/content";
import { getDestinationViews, getPublicTrips } from "@/content/public";
import { parseFilter, filterViews } from "@/content/trips-public";
import { hasLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { BUDGETS, type Budget } from "@/lib/leads/options";
import { plannerPath, routePath } from "@/lib/routes";
import { routeAlternates } from "@/lib/seo";
import { TripCard, TripCardSkeleton } from "@/components/trips/TripCard";
import { TripFilters } from "@/components/trips/TripFilters";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { localize } from "@/content/schema";

export async function generateMetadata({ params }: PageProps<"/[lang]/trips">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.trips.list.meta.title,
    description: dict.trips.list.meta.description,
    // Filtered views are not separate pages for search engines: they all point at the plain list.
    alternates: routeAlternates(lang, "trips"),
  };
}

export default async function TripsPage({ params, searchParams }: PageProps<"/[lang]/trips">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const l = dict.trips.list;

  return (
    <>
      <Breadcrumbs
        label={dict.trips.detail.breadcrumbs}
        items={[{ label: dict.trips.detail.home, href: `/${lang}` }, { label: dict.nav.trips }]}
      />
      <section className="py-12 sm:py-16">
        <Container>
          <header className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-accent uppercase">
              {l.eyebrow}
            </p>
            <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-6xl">
              {l.title}
            </h1>
            <p className="mt-4 text-lg text-fg/80">{l.description}</p>
          </header>
          {/* The filters live in the query string, which is only known per request. */}
          <Suspense fallback={<ResultsSkeleton />}>
            <Results lang={lang} searchParams={searchParams} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function Results({
  lang,
  searchParams,
}: {
  lang: Locale;
  searchParams: PageProps<"/[lang]/trips">["searchParams"];
}) {
  const dict = await getDictionary(lang);
  const l = dict.trips.list;
  const [all, styles, places] = await Promise.all([
    getPublicTrips(lang),
    getTripStyles(),
    getDestinationViews(lang),
  ]);

  // Only offer choices that exist among the visible trips.
  const usedStyles = styles.filter((s) => all.some((t) => t.styleIds.includes(s.id)));
  const usedPlaces = places.filter((p) => all.some((t) => t.destinationIds.includes(p.id)));
  const usedBudgets = BUDGETS.filter((b): b is Exclude<Budget, "unsure"> => b !== "unsure").filter(
    (b) => all.some((t) => t.budgetCategory === b),
  );
  const filter = parseFilter(await searchParams, {
    styles: usedStyles.map((s) => s.id),
    destinations: usedPlaces.map((p) => p.id),
    budgets: usedBudgets,
  });
  const shown = filterViews(all, filter);
  const filtering = Object.values(filter).some(Boolean);

  if (all.length === 0) {
    return <EmptyState lang={lang} title={l.empty.title} text={l.empty.text} />;
  }

  return (
    <div className="space-y-8">
      <TripFilters
        lang={lang}
        dict={dict}
        filter={filter}
        styles={usedStyles.map((s) => ({ value: s.id, label: localize(s.title, lang) }))}
        destinations={usedPlaces.map((p) => ({ value: p.id, label: p.name }))}
        budgets={usedBudgets.map((b) => ({ value: b, label: l.filters.budgets[b] }))}
      />
      <p className="text-sm text-fg/70" aria-live="polite">
        {(shown.length === 1 ? l.count.one : l.count.other).replace(
          "{count}",
          String(shown.length),
        )}
      </p>
      {shown.length === 0 ? (
        <EmptyState lang={lang} title={l.emptyFiltered.title} text={l.emptyFiltered.text} />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((trip) => (
            <li key={trip.id}>
              <TripCard
                trip={trip}
                lang={lang}
                labels={dict.trips}
                href={routePath(lang, "trips", `/${trip.slug}`)}
                showHighlights={!filtering}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function EmptyState({ lang, title, text }: { lang: Locale; title: string; text: string }) {
  const dict = await getDictionary(lang);
  return (
    <div className="rounded-2xl border border-fg/10 p-8 text-center sm:p-12">
      <h2 className="font-display text-3xl font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-fg/80">{text}</p>
      <div className="mt-6">
        <Button href={plannerPath(lang)}>{dict.cta.plan}</Button>
      </div>
    </div>
  );
}
