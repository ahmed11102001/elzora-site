import { localize, type Faq } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

type FAQSectionProps = {
  lang: Locale;
  dict: Dictionary;
  faqs: Faq[];
  /** Set only when NEXT_PUBLIC_WHATSAPP_NUMBER is configured. */
  whatsappUrl: string | null;
};

// Safety, visa, timing, payments, cancellation, tipping.
const order: Faq["category"][] = [
  "safety",
  "visa",
  "timing",
  "payments",
  "cancellation",
  "practical",
];

export function FAQSection({ lang, dict, faqs, whatsappUrl }: FAQSectionProps) {
  if (faqs.length === 0) return null;
  const t = dict.home.faq;
  const items = [...faqs]
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
    .map((faq) => ({
      id: faq.id,
      question: localize(faq.question, lang),
      answer: localize(faq.answer, lang),
    }));

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-16 sm:py-24">
      <Container className="grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
        <header className="lg:sticky lg:top-28 lg:col-span-4">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-accent uppercase">
            {t.eyebrow}
          </p>
          <h2
            id="faq-title"
            className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-lg text-fg/80">{t.description}</p>
          {whatsappUrl && (
            <div className="mt-8">
              <p className="font-display text-2xl font-semibold">{t.contactTitle}</p>
              <p className="mt-1 mb-4 text-fg/75">{t.contactText}</p>
              <Button href={whatsappUrl} variant="ghost">
                {dict.cta.whatsapp}
              </Button>
            </div>
          )}
        </header>

        <div className="lg:col-span-8">
          <Accordion items={items} name="faq" />
        </div>
      </Container>
    </section>
  );
}
