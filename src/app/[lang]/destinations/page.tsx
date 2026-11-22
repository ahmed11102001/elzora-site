import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDestinationViews } from "@/content/public";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { routePath } from "@/lib/routes";
import { routeAlternates } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Card, CardBody } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Photo } from "@/components/ui/Photo";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/destinations">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.destinations.meta.title,
    description: dict.destinations.meta.description,
    alternates: routeAlternates(lang, "destinations"),
  };
}

export default async function DestinationsPage({ params }: PageProps<"/[lang]/destinations">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, places] = await Promise.all([getDictionary(lang), getDestinationViews(lang)]);
  const t = dict.destinations;

  return (
    <>
      <Breadcrumbs
        label={dict.trips.detail.breadcrumbs}
        items={[
          { label: dict.trips.detail.home, href: `/${lang}` },
          { label: dict.nav.destinations },
        ]}
      />
      <section className="py-12 sm:py-16">
        <Container>
          <header className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-gold uppercase">
              {t.eyebrow}
            </p>
            <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-6xl">
              {t.title}
            </h1>
            <p className="mt-4 text-lg text-sand/80">{t.description}</p>
          </header>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((place) => (
              <li key={place.id}>
                <Link
                  href={routePath(lang, "destinations", `/${place.slug}`)}
                  className="group block h-full"
                >
                  <Card className="flex h-full flex-col transition-colors group-hover:border-gold/50">
                    <div className="aspect-[4/3] bg-gradient-to-br from-ink to-teal/30">
                      {place.image && (
                        <Photo
                          id={place.image}
                          alt=""
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="h-full"
                        />
                      )}
                    </div>
                    <CardBody className="flex flex-1 flex-col gap-2">
                      <h2 className="font-display text-2xl font-semibold">{place.name}</h2>
                      <p className="text-gold">{place.tagline}</p>
                      <p className="line-clamp-3 text-sand/75">{place.summary}</p>
                    </CardBody>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
