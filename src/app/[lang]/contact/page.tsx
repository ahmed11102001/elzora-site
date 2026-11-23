import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { plannerPath, privacyPath } from "@/lib/routes";
import { routeAlternates } from "@/lib/seo";
import { contactEmail, whatsappNumber } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.pages.contact.title,
    description: dict.pages.contact.description,
    alternates: routeAlternates(lang, "contact"),
  };
}

// Only real contact channels are shown: the planner always, WhatsApp and email only when they are
// configured (NEXT_PUBLIC_WHATSAPP_NUMBER, NEXT_PUBLIC_CONTACT_EMAIL). Nothing is invented.
export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.pages.contact;

  return (
    <section className="py-12 sm:py-20">
      <Container className="max-w-3xl">
        <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
          {t.title}
        </h1>
        <p className="mt-5 text-lg text-fg/85">{t.intro}</p>

        <ul className="mt-10 space-y-4">
          <li className="rounded-2xl border border-fg/10 bg-card p-6">
            <h2 className="font-display text-2xl font-semibold">{t.plannerTitle}</h2>
            <p className="mt-2 text-fg/85">{t.plannerText}</p>
            <Button href={plannerPath(lang)} className="mt-4">
              {dict.cta.plan}
            </Button>
          </li>
          {whatsappNumber && (
            <li className="rounded-2xl border border-fg/10 bg-card p-6">
              <h2 className="font-display text-2xl font-semibold">{t.whatsappTitle}</h2>
              <p className="mt-2 text-fg/85">{t.whatsappText}</p>
              <Button href={`https://wa.me/${whatsappNumber}`} variant="ghost" className="mt-4">
                {dict.cta.whatsapp}
              </Button>
            </li>
          )}
          {contactEmail && (
            <li className="rounded-2xl border border-fg/10 bg-card p-6">
              <h2 className="font-display text-2xl font-semibold">{t.emailTitle}</h2>
              <p className="mt-2 text-fg/85">{t.emailText}</p>
              <a
                href={`mailto:${contactEmail}`}
                className="mt-3 inline-block font-semibold text-accent underline underline-offset-4"
              >
                {contactEmail}
              </a>
            </li>
          )}
        </ul>

        <p className="mt-8 text-sm text-fg/70">
          <Link href={privacyPath(lang)} className="underline underline-offset-4 hover:text-accent">
            {t.privacy}
          </Link>
        </p>
      </Container>
    </section>
  );
}
