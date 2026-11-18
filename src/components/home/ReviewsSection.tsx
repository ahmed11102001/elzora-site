import { localize, type Review, type Trip } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/ui/Container";
import { Star } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { publicReviews, ratingSummary } from "./home-data";

type ReviewsSectionProps = { lang: Locale; dict: Dictionary; reviews: Review[]; trips: Trip[] };

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn("size-4", i < rating ? "fill-gold text-gold" : "text-sand/30")}
        />
      ))}
    </div>
  );
}

// Real travelers only. With no published, verified review the section renders nothing (no empty
// cards, no placeholder that could suggest customers who do not exist). The review schema has no
// photo field, so traveler photos are not shown.
export function ReviewsSection({ lang, dict, reviews, trips }: ReviewsSectionProps) {
  const list = publicReviews(reviews);
  if (list.length === 0) return null;

  const t = dict.home.reviews;
  const summary = ratingSummary(list);
  const regionNames = new Intl.DisplayNames([lang], { type: "region" });
  const dateFormat = new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const countryName = (code: string) => {
    try {
      return regionNames.of(code.toUpperCase()) ?? code;
    } catch {
      return code;
    }
  };
  const tripTitle = (id?: string) => {
    const trip = id ? trips.find((candidate) => candidate.id === id) : undefined;
    return trip ? localize(trip.title, lang) : null;
  };

  const [lead, ...rest] = list;

  const renderReview = (review: Review, large: boolean) => {
    const trip = tripTitle(review.tripId);
    return (
      <figure
        key={review.id}
        className={cn(
          "flex h-full flex-col gap-5 rounded-2xl border border-sand/10 p-6 sm:p-8",
          large && "bg-ink/60",
        )}
      >
        <Stars
          rating={review.rating}
          label={t.starsLabel.replace("{rating}", String(review.rating))}
        />
        <blockquote
          className={cn(
            "text-sand/90",
            large ? "font-display text-3xl leading-snug sm:text-4xl" : "text-lg",
          )}
        >
          {localize(review.text, lang)}
        </blockquote>
        <figcaption className="mt-auto text-sm text-sand/70">
          <span className="font-semibold text-sand">{review.author}</span>
          {`, ${countryName(review.country)}`}
          {trip && <span className="block">{trip}</span>}
          <span className="block">
            {t.verified} · {dateFormat.format(new Date(`${review.date}T00:00:00Z`))}
          </span>
        </figcaption>
      </figure>
    );
  };

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-ink-deep py-16 sm:py-24">
      <Container>
        <header className="mb-10 max-w-2xl sm:mb-14">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-gold uppercase">
            {t.eyebrow}
          </p>
          <h2
            id="reviews-title"
            className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl"
          >
            {t.title}
          </h2>
          {summary && (
            <p className="mt-4 text-lg text-sand/80">
              {t.summary
                .replace(
                  "{rating}",
                  summary.average.toLocaleString(lang, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }),
                )
                .replace("{count}", summary.count.toLocaleString(lang))}
            </p>
          )}
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-3">{renderReview(lead, true)}</div>
          {rest.map((review) => renderReview(review, false))}
        </div>
      </Container>
    </section>
  );
}
