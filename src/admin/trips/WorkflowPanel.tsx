import Link from "next/link";
import { Badge, Card, buttonClass } from "../ui/primitives";
import {
  archiveTrip,
  deleteTrip,
  duplicateTrip,
  publishTranslation,
  restoreTrip,
  returnToDraft,
  submitForReview,
  unpublishTranslation,
} from "./actions";
import { ConfirmButton } from "./ConfirmButton";
import type { Locale, TripRecord } from "./model";
import type { Readiness } from "./readiness";

// Server-rendered: status buttons are plain forms that call server actions, so they act on SAVED data.
// The checklist is computed from what is stored, so save first, then check it.

const LANGUAGE: Record<Locale, string> = { en: "English", de: "German" };
const TONE = { draft: "neutral", review: "warn", published: "ok" } as const;
const LABEL = { draft: "Draft", review: "In review", published: "Published" } as const;

function Hidden({ trip, locale }: { trip: TripRecord; locale?: Locale }) {
  return (
    <>
      <input type="hidden" name="tripId" value={trip.id} />
      {locale && <input type="hidden" name="locale" value={locale} />}
    </>
  );
}

export function WorkflowPanel({
  trip,
  forReview,
  forPublish,
}: {
  trip: TripRecord;
  forReview: Partial<Record<Locale, Readiness>>;
  forPublish: Partial<Record<Locale, Readiness>>;
}) {
  return (
    <div className="grid gap-6">
      <Card className="grid gap-5">
        <h2 className="font-display text-2xl font-semibold">Status and checklist</h2>
        <p className="-mt-3 text-sm text-ink/65">
          Each language has its own status. This list reflects the saved version of the trip.
        </p>
        {(["en", "de"] as const).map((locale) => {
          const translation = trip.translations[locale];
          if (!translation) {
            return (
              <div key={locale} className="rounded-xl border border-dashed border-ink/20 p-4">
                <p className="font-semibold">{LANGUAGE[locale]}</p>
                <p className="text-sm text-ink/60">
                  No translation yet, so this language is not public.
                </p>
              </div>
            );
          }
          const review = forReview[locale]?.blockers ?? [];
          const publish = forPublish[locale];
          return (
            <div key={locale} className="grid gap-3 rounded-xl border border-ink/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold">
                  {LANGUAGE[locale]}{" "}
                  <Badge tone={TONE[translation.status]}>{LABEL[translation.status]}</Badge>
                </p>
                <div className="flex flex-wrap gap-2">
                  {translation.status === "draft" && !trip.archivedAt && (
                    <form action={submitForReview}>
                      <Hidden trip={trip} locale={locale} />
                      <button type="submit" className={buttonClass()} disabled={review.length > 0}>
                        Submit for review
                      </button>
                    </form>
                  )}
                  {translation.status === "review" && !trip.archivedAt && (
                    <form action={returnToDraft}>
                      <Hidden trip={trip} locale={locale} />
                      <button type="submit" className={buttonClass("ghost")}>
                        Return to draft
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/trips/${encodeURIComponent(trip.id)}/preview?locale=${locale}`}
                    className={buttonClass("ghost")}
                  >
                    Preview
                  </Link>
                  {translation.status === "review" && !trip.archivedAt && (
                    <form action={publishTranslation}>
                      <Hidden trip={trip} locale={locale} />
                      <ConfirmButton
                        className={buttonClass()}
                        message={`Publish the ${LANGUAGE[locale]} version? It goes live on the public site now.`}
                        disabled={(publish?.blockers.length ?? 1) > 0}
                      >
                        Publish
                      </ConfirmButton>
                    </form>
                  )}
                  {translation.status === "published" && (
                    <form action={unpublishTranslation}>
                      <Hidden trip={trip} locale={locale} />
                      <ConfirmButton
                        className={buttonClass("danger")}
                        message={`Unpublish the ${LANGUAGE[locale]} version? It leaves the public site and goes back to draft.`}
                      >
                        Unpublish
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </div>

              {translation.status === "draft" && review.length > 0 && (
                <div>
                  <p className="text-sm font-semibold">Needed before review</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-red-800">
                    {review.map((issue) => (
                      <li key={issue.code}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {publish && publish.blockers.length > 0 && (
                <div>
                  <p className="text-sm font-semibold">Needed before publishing</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-ink/80">
                    {publish.blockers.map((issue, index) => (
                      <li key={`${issue.code}-${index}`}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {publish && publish.blockers.length === 0 && (
                <p className="text-sm text-emerald-800">
                  Everything needed to publish is in place.
                </p>
              )}
              {publish && publish.warnings.length > 0 && (
                <div>
                  <p className="text-sm font-semibold">Worth a look</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">
                    {publish.warnings.map((issue, index) => (
                      <li key={`${issue.code}-${index}`}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Card className="flex flex-wrap items-center gap-3">
        <form action={duplicateTrip}>
          <Hidden trip={trip} />
          <button type="submit" className={buttonClass("ghost")}>
            Duplicate trip
          </button>
        </form>
        {trip.archivedAt ? (
          <form action={restoreTrip}>
            <Hidden trip={trip} />
            <button type="submit" className={buttonClass("ghost")}>
              Restore trip
            </button>
          </form>
        ) : (
          <form action={archiveTrip}>
            <Hidden trip={trip} />
            <ConfirmButton
              className={buttonClass("ghost")}
              message="Archive this trip? It is hidden from the active list and can be restored."
            >
              Archive trip
            </ConfirmButton>
          </form>
        )}
        <form action={deleteTrip}>
          <Hidden trip={trip} />
          <ConfirmButton
            className={buttonClass("danger")}
            message="Delete this trip permanently? This cannot be undone."
          >
            Delete trip
          </ConfirmButton>
        </form>
        <p className="basis-full text-xs text-ink/60">
          A trip that has been published can only be archived, never deleted.
        </p>
      </Card>
    </div>
  );
}
