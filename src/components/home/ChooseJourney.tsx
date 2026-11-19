import Link from "next/link";
import { localize, type Trip, type TripStyle } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/ui/Container";
import { ArrowRight } from "@/components/ui/icons";
import { Photo } from "@/components/ui/Photo";
import { plannerPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { featuredTrips } from "./home-data";

type ChooseJourneyProps = {
  lang: Locale;
  dict: Dictionary;
  styles: TripStyle[];
  trips: Trip[];
};

// Column spans on large screens, repeated: 7+5, 5+7, 6+6. Written out in full so Tailwind sees them.
const spans = [
  "lg:col-span-7",
  "lg:col-span-5",
  "lg:col-span-5",
  "lg:col-span-7",
  "lg:col-span-6",
  "lg:col-span-6",
];

// Travel styles as an editorial mosaic. A style with a photo in the content gets the photo; one
// without gets a typographic tile (no stand-in photo that would misrepresent it). Each tile links to
// its first trip on this page, or to the planner when no trip exists for that style yet.
export function ChooseJourney({ lang, dict, styles, trips }: ChooseJourneyProps) {
  if (styles.length === 0) return null;
  const t = dict.home.styles;
  const shown = featuredTrips(trips);

  return (
    <section id="styles" aria-labelledby="styles-title" className="bg-ink-deep py-16 sm:py-24">
      <Container>
        <header className="mb-10 max-w-2xl sm:mb-14">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-gold uppercase">
            {t.eyebrow}
          </p>
          <h2
            id="styles-title"
            className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-sand/80">{t.description}</p>
        </header>

        <ol className="grid gap-4 sm:gap-5 lg:grid-cols-12">
          {styles.map((style, index) => {
            const related = trips.filter((trip) => trip.styleIds.includes(style.id));
            const target = related.find((trip) => shown.some((s) => s.id === trip.id));
            let href = "#trips";
            if (related.length === 0) href = plannerPath(lang);
            else if (target) href = `#trip-${target.id}`;
            const countTemplate = related.length === 1 ? t.tripCount.one : t.tripCount.other;
            const countLabel = countTemplate.replace("{count}", String(related.length));

            return (
              <li key={style.id} className={spans[index % spans.length]}>
                <Link
                  href={href}
                  className="group relative isolate flex h-80 flex-col justify-end overflow-hidden rounded-2xl p-6 sm:h-96 sm:p-8 lg:h-[26rem]"
                >
                  {style.image ? (
                    <Photo
                      id={style.image}
                      alt=""
                      sizes="(min-width: 1024px) 58vw, 100vw"
                      className="absolute inset-0 -z-20"
                      imgClassName="transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
                    />
                  ) : (
                    <div
                      aria-hidden
                      className="absolute inset-0 -z-20 bg-linear-to-br from-ink via-ink-deep to-teal/30"
                    />
                  )}
                  <div
                    aria-hidden
                    className="absolute inset-0 -z-10 bg-linear-to-t from-ink-deep/90 via-ink-deep/40 to-transparent"
                  />
                  <span
                    aria-hidden
                    className="absolute top-5 right-6 font-display text-6xl leading-none text-sand/25 sm:text-7xl"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {related.length > 0 && (
                    <p className="mb-2 text-xs font-semibold tracking-[0.25em] text-gold uppercase">
                      {countLabel}
                    </p>
                  )}
                  <h3 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
                    {localize(style.title, lang)}
                  </h3>
                  <p className="mt-2 max-w-md text-sand/85">{localize(style.summary, lang)}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold">
                    {related.length > 0 ? t.seeTrips : t.plan}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
