import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/admin/auth/session";
import { Badge, PageHeader, buttonClass } from "@/admin/ui/primitives";
import { readinessContext } from "@/admin/trips/context";
import { ERRORS, NOTICES } from "@/admin/trips/messages";
import {
  BUDGET_CATEGORIES,
  STATE_LABEL,
  displayTitle,
  toDraft,
  tripState,
} from "@/admin/trips/model";
import { checkTrip } from "@/admin/trips/readiness";
import { getTripStore } from "@/admin/trips/store";
import { DESTINATION_OPTIONS, PHOTO_OPTIONS, STYLE_OPTIONS } from "@/admin/trips/taxonomy";
import { TripEditor } from "@/admin/trips/TripEditor";
import { WorkflowPanel } from "@/admin/trips/WorkflowPanel";

export const metadata: Metadata = { title: "Edit trip" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// A malformed %-sequence in the address must lead to a 404, not an error page.
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession("trips.manage");
  const { id } = await params;
  const query = await searchParams;

  const store = getTripStore();
  const trip = await store.get(safeDecode(id));
  if (!trip) notFound();

  const context = await readinessContext(store, trip);
  const forReview = checkTrip(trip, "review", context);
  const forPublish = checkTrip(trip, "publish", context);

  const state = tripState(trip);
  const notice = NOTICES[first(query.msg) ?? ""];
  const error = ERRORS[first(query.err) ?? ""];
  const initialTab = first(query.tab) === "de" ? "de" : "en";

  return (
    <>
      <PageHeader
        title={displayTitle(trip)}
        description="Edit the trip, then save. Status changes and the checklist work on the saved version."
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={state === "published" ? "ok" : state === "review" ? "warn" : "neutral"}>
              {STATE_LABEL[state]}
            </Badge>
            <Link href="/trips" className={buttonClass("ghost")}>
              Back to trips
            </Link>
          </div>
        }
      />

      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {trip.archivedAt && (
        <p role="note" className="mb-4 rounded-lg bg-ink/5 px-4 py-3 text-sm text-ink/80">
          This trip is archived. Restore it below to edit it.
        </p>
      )}

      <div className="grid gap-8">
        {trip.archivedAt ? null : (
          <TripEditor
            // Remount with fresh server data after every save.
            key={trip.updatedAt}
            tripId={trip.id}
            initial={toDraft(trip)}
            statuses={{
              en: trip.translations.en.status,
              de: trip.translations.de?.status ?? null,
            }}
            initialTab={initialTab}
            styles={STYLE_OPTIONS}
            destinations={DESTINATION_OPTIONS}
            photos={PHOTO_OPTIONS}
            budgetCategories={[...BUDGET_CATEGORIES]}
            persistent={store.persistent}
          />
        )}
        <WorkflowPanel trip={trip} forReview={forReview} forPublish={forPublish} />
      </div>
    </>
  );
}
