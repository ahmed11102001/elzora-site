import Link from "next/link";
import { localize, type Trip } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Card, CardBody } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Check, Clock } from "@/components/ui/icons";
import { Photo } from "@/components/ui/Photo";
import { Skeleton } from "@/components/ui/Skeleton";

type TripCardProps = {
  trip: Trip;
  lang: Locale;
  labels: Dictionary["trips"];
  /** Omit to render a non-clickable card (the trip pages arrive in Phase 7). */
  href?: string;
  /** Also list the first highlights of the trip (used on the home page). */
  showHighlights?: boolean;
};

export function TripCard({ trip, lang, labels, href, showHighlights = false }: TripCardProps) {
  const days = `${trip.durationDays} ${trip.durationDays === 1 ? labels.day : labels.days}`;
  const price = trip.priceFromEUR
    ? `${labels.from} €${trip.priceFromEUR.toLocaleString(lang)}`
    : labels.priceOnRequest;

  const card = (
    <Card className="flex h-full flex-col transition-colors group-hover:border-gold/50">
      <div className="aspect-[4/3] bg-gradient-to-br from-ink to-teal/30">
        {trip.image && (
          <Photo
            id={trip.image}
            alt=""
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="h-full"
          />
        )}
      </div>
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <Chip tone="neutral">
            <Clock className="size-3.5" />
            {days}
          </Chip>
          <span className="font-medium text-gold">{price}</span>
        </div>
        <h3 className="font-display text-2xl leading-tight font-semibold">
          {localize(trip.title, lang)}
        </h3>
        <p className="line-clamp-3 text-sand/75">{localize(trip.summary, lang)}</p>
        {showHighlights && trip.highlights.length > 0 && (
          <ul className="mt-auto space-y-2 border-t border-sand/10 pt-4 text-sm text-sand/80">
            {trip.highlights.slice(0, 3).map((highlight) => (
              <li key={highlight.en} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                {localize(highlight, lang)}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );

  return href ? (
    <Link href={href} className="group block h-full">
      {card}
    </Link>
  ) : (
    <div className="group h-full">{card}</div>
  );
}

// Same shape as TripCard, shown while CMS data loads.
export function TripCardSkeleton() {
  return (
    <Card className="flex h-full flex-col" aria-hidden>
      <Skeleton className="aspect-[4/3] rounded-none" />
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </CardBody>
    </Card>
  );
}
