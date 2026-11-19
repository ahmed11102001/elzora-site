import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { whatsappNumber } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { ConfirmationView } from "@/components/planner/ConfirmationView";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/plan-your-trip/confirmation">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  // Not for search results: it only makes sense right after sending a request.
  return { title: dict.planner.confirmationMeta.title, robots: { index: false, follow: false } };
}

export default async function ConfirmationPage({
  params,
}: PageProps<"/[lang]/plan-your-trip/confirmation">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <section data-hide-planner-entry className="bg-linear-to-b from-ink-deep to-ink py-16 sm:py-24">
      <Container className="max-w-3xl">
        <ConfirmationView
          lang={lang}
          copy={dict.planner.confirmation}
          whatsappNumber={whatsappNumber}
        />
      </Container>
    </section>
  );
}
