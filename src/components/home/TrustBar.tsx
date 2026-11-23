import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/ui/Container";
import { Chat, Check, Shield, Star } from "@/components/ui/icons";

type TrustItem = {
  key: string;
  Icon: typeof Shield;
  title: string;
  text: string;
  href?: string;
};

type TrustBarProps = {
  lang: Locale;
  dict: Dictionary;
  /** True only when every partner in the internal registry has a verified license. */
  partnersVerified: boolean;
  /** Real average from verified, published reviews. Null until enough of them exist. */
  rating: { average: number; count: number } | null;
  /** Set only when NEXT_PUBLIC_WHATSAPP_NUMBER is configured. */
  whatsappUrl: string | null;
  /** True when the cancellation answer is published, so the claim matches approved content. */
  cancellationPublished: boolean;
};

// A compact strip of claims. Every claim is tied to something that exists (a verified partner
// license, real reviews, a configured WhatsApp number, a published cancellation answer). A claim
// without that support is not rendered, and the whole bar disappears when none is supported.
export function TrustBar({
  lang,
  dict,
  partnersVerified,
  rating,
  whatsappUrl,
  cancellationPublished,
}: TrustBarProps) {
  const t = dict.home.trust;
  const items: TrustItem[] = [];

  if (partnersVerified) {
    items.push({ key: "partners", Icon: Shield, ...t.partners });
  }
  if (rating) {
    items.push({
      key: "rating",
      Icon: Star,
      title: t.rating.title.replace(
        "{rating}",
        rating.average.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      ),
      text: t.rating.text.replace("{count}", rating.count.toLocaleString(lang)),
    });
  }
  if (whatsappUrl) {
    items.push({ key: "support", Icon: Chat, ...t.support, href: whatsappUrl });
  }
  if (cancellationPublished) {
    items.push({ key: "cancellation", Icon: Check, ...t.cancellation });
  }

  if (items.length === 0) return null;

  return (
    <section aria-label={t.label} className="border-y border-fg/10 bg-surface py-8 sm:py-10">
      <Container>
        <ul className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-6">
          {items.map(({ key, Icon, title, text, href }) => {
            const content = (
              <>
                <Icon className="mt-1 size-6 shrink-0 text-accent" />
                <span>
                  <span className="block font-display text-xl leading-snug font-semibold">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-sm text-fg/70">{text}</span>
                </span>
              </>
            );
            return (
              <li key={key} className="flex-1 sm:basis-64">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 transition-opacity hover:opacity-80"
                  >
                    {content}
                  </a>
                ) : (
                  <div className="flex items-start gap-4">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
