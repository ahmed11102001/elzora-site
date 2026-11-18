import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Photo } from "@/components/ui/Photo";

type FinalCTAProps = {
  lang: Locale;
  dict: Dictionary;
  /** Set only when NEXT_PUBLIC_WHATSAPP_NUMBER is configured. */
  whatsappUrl: string | null;
};

// Closing call to action before the footer. "Design my trip" points to #planner, which exists once
// the planner is built (Phase 6), the same target the header and hero already use.
export function FinalCTA({ lang, dict, whatsappUrl }: FinalCTAProps) {
  const t = dict.home.finalCta;

  return (
    <section
      aria-labelledby="final-cta-title"
      className="relative isolate overflow-hidden py-24 sm:py-36"
    >
      <Photo
        id="aswan-nile"
        alt=""
        sizes="100vw"
        className="absolute inset-0 -z-20"
        imgClassName="object-[50%_60%]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-ink-deep/90 via-ink/60 to-ink/40 sm:bg-linear-to-r sm:from-ink-deep/85 sm:via-ink/55 sm:to-transparent"
      />

      <Container>
        <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-gold uppercase">
          {t.eyebrow}
        </p>
        <h2
          id="final-cta-title"
          className="max-w-3xl font-display text-5xl leading-[1.05] font-semibold text-balance sm:text-7xl"
        >
          {t.title}
        </h2>
        <p className="mt-5 max-w-xl text-lg text-sand/90 sm:text-xl">{t.text}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href={`/${lang}#planner`}>{dict.cta.plan}</Button>
          {whatsappUrl && (
            <Button href={whatsappUrl} variant="ghost">
              {dict.cta.whatsapp}
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}
