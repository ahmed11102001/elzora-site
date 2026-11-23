import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage, pagesStatus } from "@/content/pages";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { plannerPath, routePath } from "@/lib/routes";
import { routeAlternates } from "@/lib/seo";
import { TextPage } from "@/components/pages/TextPage";
import { Button } from "@/components/ui/Button";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const page = getPage("about", lang);
  return {
    title: page.title,
    description: page.description,
    alternates: routeAlternates(lang, "about"),
  };
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <TextPage
      lang={lang}
      dict={dict}
      page={getPage("about", lang)}
      draft={pagesStatus !== "published"}
    >
      <div className="mt-12 rounded-2xl border border-fg/10 bg-card p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">{dict.pages.about.ctaTitle}</h2>
        <p className="mt-2 text-fg/85">{dict.pages.about.ctaText}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button href={plannerPath(lang)}>{dict.cta.plan}</Button>
          <Button href={routePath(lang, "contact")} variant="ghost">
            {dict.pages.about.contact}
          </Button>
        </div>
      </div>
    </TextPage>
  );
}
