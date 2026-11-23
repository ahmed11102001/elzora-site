import { isDevPreview } from "@/content";
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
        <Star key={i} className={cn("size-4", i < rating ? "fill-gold text-gold" : "text-fg/30")} />
      ))}
    </div>
  );
}

// Development only (never rendered in production): marks where the reviews will go. It is
// deliberately not styled like a testimonial, so it cannot be mistaken for a real review.
function ReviewsDevPlaceholder() {
  return (
    <section
      id="reviews"
      aria-label="Reviews (development placeholder)"
      className="bg-surface-2 py-16"
    >
      <Container>
        <div className="rounded-2xl border border-dashed border-accent/50 p-8 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-accent uppercase">
            Development preview only
          </p>
          <p className="mt-3 text-fg/80">
            Reviews section: no published, verified reviews exist yet. This block is hidden in
            production, where the section renders nothing until real reviews are added.
          </p>
        </div>
      </Container>
    </section>
  );
}

// Real travelers only. With no published, verified review the section renders nothing (no empty
// cards, no placeholder that could suggest customers who do not exist). The review schema has no
// photo field, so traveler photos are not shown.
export function ReviewsSection({ lang, dict, reviews, trips }: ReviewsSectionProps) {
  const list = publicReviews(reviews);
  if (list.length === 0) return isDevPreview ? <ReviewsDevPlaceholder /> : null;

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
          "flex h-full flex-col gap-5 rounded-2xl border border-fg/10 p-6 sm:p-8",
          large && "bg-surface/60",
        )}
      >
        <Stars
          rating={review.rating}
          label={t.starsLabel.replace("{rating}", String(review.rating))}
        />
        <blockquote
          className={cn(
            "text-fg/90",
            large ? "font-display text-3xl leading-snug sm:text-4xl" : "text-lg",
          )}
        >
          {localize(review.text, lang)}
        </blockquote>
        <figcaption className="mt-auto text-sm text-fg/70">
          <span className="font-semibold text-fg">{review.author}</span>
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
    <section id="reviews" aria-labelledby="reviews-title" className="bg-surface-2 py-16 sm:py-24">
      <Container>
        <header className="mb-10 max-w-2xl sm:mb-14">
          <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-accent uppercase">
            {t.eyebrow}
          </p>
          <h2
            id="reviews-title"
            className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl"
          >
            {t.title}
          </h2>
          {summary && (
            <p className="mt-4 text-lg text-fg/80">
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
