import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFaqs, getPartnerStatus, getReviews, getTripStyles, getTrips } from "@/content";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/lib/seo";
import { whatsappNumber } from "@/lib/site";
import { ChooseJourney } from "@/components/home/ChooseJourney";
import { FAQSection } from "@/components/home/FAQSection";
import { FeaturedTrips } from "@/components/home/FeaturedTrips";
import { FinalCTA } from "@/components/home/FinalCTA";
import { Hero } from "@/components/home/Hero";
import { ratingSummary } from "@/components/home/home-data";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { TrustBar } from "@/components/home/TrustBar";
import { WhyElzora } from "@/components/home/WhyElzora";
import { JourneyShell } from "@/components/journey/JourneyShell";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { alternates: localizedAlternates(lang) };
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  // Content is read once here and handed to the sections. Each section hides itself when it has
  // nothing publishable, so the page stays intact with empty or unpublished content.
  const [styles, trips, faqs, reviews, partners] = await Promise.all([
    getTripStyles(),
    getTrips(),
    getFaqs(),
    getReviews(),
    getPartnerStatus(),
  ]);
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;

  return (
    <>
      <Hero lang={lang} dict={dict} />
      <JourneyShell lang={lang} dict={dict} />
      <TrustBar
        lang={lang}
        dict={dict}
        partnersVerified={partners.allLicensesVerified}
        rating={ratingSummary(reviews)}
        whatsappUrl={whatsappUrl}
        cancellationPublished={faqs.some((faq) => faq.category === "cancellation")}
      />
      <ChooseJourney lang={lang} dict={dict} styles={styles} trips={trips} />
      <FeaturedTrips lang={lang} dict={dict} trips={trips} />
      <WhyElzora dict={dict} />
      <ReviewsSection lang={lang} dict={dict} reviews={reviews} trips={trips} />
      <FAQSection lang={lang} dict={dict} faqs={faqs} whatsappUrl={whatsappUrl} />
      <FinalCTA lang={lang} dict={dict} whatsappUrl={whatsappUrl} />
    </>
  );
}
