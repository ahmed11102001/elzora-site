import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Container } from "@/components/ui/Container";
import { ArrowDown, Chat, Clock, Shield } from "@/components/ui/icons";
import { Photo } from "@/components/ui/Photo";
import { plannerPath } from "@/lib/routes";

// The first screen. Server-rendered, no animation library and no client JavaScript, so it paints
// fast on a phone. The animated journey lives in the section below.
export function Hero({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.hero;
  const trust = [
    { Icon: Shield, label: t.trust.licensed },
    { Icon: Clock, label: t.trust.reply },
    { Icon: Chat, label: t.trust.support },
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-4rem-env(safe-area-inset-top,0px))] items-end overflow-hidden sm:items-center"
    >
      <Photo
        id="giza-pyramids"
        alt=""
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20"
        imgClassName="object-[62%_55%]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-ink via-ink/60 to-ink/30 sm:bg-linear-to-r sm:from-ink-deep/90 sm:via-ink/55 sm:to-transparent"
      />

      <Container className="py-14 sm:py-24">
        <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-gold uppercase">
          {t.eyebrow}
        </p>
        <h1
          id="hero-title"
          className="max-w-3xl font-display text-5xl leading-[1.02] font-semibold text-balance sm:text-7xl lg:text-8xl"
        >
          {t.title}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-sand/90 sm:text-xl">{t.subtitle}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href={plannerPath(lang)}>{dict.cta.plan}</Button>
          <Button href="#journey" variant="ghost" className="gap-2">
            {t.journeyCta}
            <ArrowDown className="size-4" />
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap gap-2">
          {trust.map(({ Icon, label }) => (
            <li key={label}>
              <Chip tone="neutral" className="bg-ink-deep/60 backdrop-blur-sm">
                <Icon className="size-4 text-gold" />
                {label}
              </Chip>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
