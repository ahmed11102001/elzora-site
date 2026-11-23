import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { routeAlternates } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Check } from "@/components/ui/icons";
import { TripPlanner } from "@/components/planner/TripPlanner";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/plan-your-trip">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.planner.meta.title,
    description: dict.planner.meta.description,
    alternates: routeAlternates(lang, "planner"),
  };
}

export default async function PlanYourTripPage({ params }: PageProps<"/[lang]/plan-your-trip">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.planner.intro;

  return (
    <section
      id="planner"
      aria-labelledby="planner-intro-title"
      className="bg-linear-to-b from-surface-2 to-surface py-10 sm:py-16"
    >
      <Container className="max-w-3xl">
        <header className="mb-8 sm:mb-10">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-accent uppercase">
            {t.eyebrow}
          </p>
          <h1
            id="planner-intro-title"
            className="font-display text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl"
          >
            {t.title}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-fg/85">{t.text}</p>
          <ul className="mt-5 flex flex-col gap-2 text-sm text-fg/80 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {t.points.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-accent" />
                {point}
              </li>
            ))}
          </ul>
        </header>
        <TripPlanner
          lang={lang}
          copy={dict.planner}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
        />
      </Container>
    </section>
  );
}
