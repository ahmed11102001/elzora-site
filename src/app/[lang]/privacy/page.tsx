import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage, pagesStatus } from "@/content/pages";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { routeAlternates } from "@/lib/seo";
import { TextPage } from "@/components/pages/TextPage";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const page = getPage("privacy", lang);
  return {
    title: page.title,
    description: page.description,
    alternates: routeAlternates(lang, "privacy"),
  };
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <TextPage
      lang={lang}
      dict={dict}
      page={getPage("privacy", lang)}
      draft={pagesStatus !== "published"}
    />
  );
}
