import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage, pagesStatus } from "@/content/pages";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { routeAlternates } from "@/lib/seo";
import { TextPage } from "@/components/pages/TextPage";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/cookies">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const page = getPage("cookies", lang);
  return {
    title: page.title,
    description: page.description,
    alternates: routeAlternates(lang, "cookies"),
  };
}

export default async function CookiesPage({ params }: PageProps<"/[lang]/cookies">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <TextPage
      lang={lang}
      dict={dict}
      page={getPage("cookies", lang)}
      draft={pagesStatus !== "published"}
    />
  );
}
