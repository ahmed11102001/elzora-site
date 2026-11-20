import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage, pagesStatus } from "@/content/pages";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { routeAlternates } from "@/lib/seo";
import { TextPage } from "@/components/pages/TextPage";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const page = getPage("terms", lang);
  return {
    title: page.title,
    description: page.description,
    alternates: routeAlternates(lang, "terms"),
  };
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <TextPage
      lang={lang}
      dict={dict}
      page={getPage("terms", lang)}
      draft={pagesStatus !== "published"}
    />
  );
}
