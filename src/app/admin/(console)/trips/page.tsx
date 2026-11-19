import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/admin/auth/session";
import { Badge, Card, EmptyState, PageHeader, buttonClass } from "@/admin/ui/primitives";
import { ERRORS, NOTICES } from "@/admin/trips/messages";
import {
  STATE_LABEL,
  displayTitle,
  tripState,
  type TripRecord,
  type TripState,
} from "@/admin/trips/model";
import { getTripStore } from "@/admin/trips/store";

export const metadata: Metadata = { title: "Trips" };

const FILTERS: { key: "all" | TripState; label: string }[] = [
  { key: "all", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "In review" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
];
const TONE = { draft: "neutral", review: "warn", published: "ok" } as const;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function LanguageBadge({ locale, trip }: { locale: "en" | "de"; trip: TripRecord }) {
  const t = trip.translations[locale];
  const name = locale.toUpperCase();
  if (!t) return <Badge tone="soon">{name} –</Badge>;
  return (
    <Badge tone={TONE[t.status]}>
      {name} {t.status === "published" ? "live" : t.status === "review" ? "review" : "draft"}
    </Badge>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession("trips.manage");
  const params = await searchParams;
  const q = (first(params.q) ?? "").trim().toLowerCase().slice(0, 80);
  const requested = first(params.status);
  const filter = FILTERS.some((f) => f.key === requested)
    ? (requested as "all" | TripState)
    : "all";
  const notice = NOTICES[first(params.msg) ?? ""];
  const error = ERRORS[first(params.err) ?? ""];

  const store = getTripStore();
  const all = await store.list();

  const counts: Record<TripState, number> = { draft: 0, review: 0, published: 0, archived: 0 };
  for (const trip of all) counts[tripState(trip)] += 1;

  const matches = (trip: TripRecord) => {
    if (!q) return true;
    const haystack = [
      displayTitle(trip),
      trip.translations.de?.title ?? "",
      trip.translations.en.slug,
      trip.translations.de?.slug ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  };
  const visible = all
    .filter((trip) => (filter === "all" ? !trip.archivedAt : tripState(trip) === filter))
    .filter(matches)
    .sort((a, b) => a.sortOrder - b.sortOrder || displayTitle(a).localeCompare(displayTitle(b)));

  const href = (status: string) => {
    const query = new URLSearchParams();
    if (status !== "all") query.set("status", status);
    if (q) query.set("q", q);
    const text = query.toString();
    return text ? `/trips?${text}` : "/trips";
  };

  return (
    <>
      <PageHeader
        title="Trips"
        description="Create and manage trips. Each language has its own content, slug and status."
        actions={
          <Link href="/trips/new" className={buttonClass()}>
            New trip
          </Link>
        }
      />

      {!store.persistent && (
        <p role="note" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Preview storage: trips are kept in the server’s memory until the database step (7.4C).
        </p>
      )}
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

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            const total =
              item.key === "all" ? all.length - counts.archived : counts[item.key as TripState];
            return (
              <Link
                key={item.key}
                href={href(item.key)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${
                  active ? "border-ink bg-ink text-sand" : "border-ink/25 bg-white text-ink"
                }`}
              >
                {item.label}
                <span className="text-xs opacity-70">{total}</span>
              </Link>
            );
          })}
        </nav>
        <form action="/trips" method="get" role="search" className="flex gap-2">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <label htmlFor="q" className="sr-only">
            Search trips
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search title or slug"
            className="min-h-11 w-56 rounded-lg border border-ink/25 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          />
          <button type="submit" className={buttonClass("ghost")}>
            Search
          </button>
        </form>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={all.length === 0 ? "No trips yet" : "No trips match"}>
          {all.length === 0
            ? "Create the first trip to get started."
            : "Try another status or a different search."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {visible.map((trip) => {
            const state = tripState(trip);
            return (
              <li key={trip.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/trips/${encodeURIComponent(trip.id)}`}
                      className="font-display text-xl font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      {displayTitle(trip)}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-ink/60">
                      {trip.durationDays} days
                      {trip.translations.en.slug && ` · /en/trips/${trip.translations.en.slug}`}
                      {trip.featured && " · Featured"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {state === "archived" ? (
                      <Badge>{STATE_LABEL.archived}</Badge>
                    ) : (
                      <>
                        <LanguageBadge locale="en" trip={trip} />
                        <LanguageBadge locale="de" trip={trip} />
                      </>
                    )}
                    <Link
                      href={`/trips/${encodeURIComponent(trip.id)}`}
                      className={buttonClass("ghost")}
                    >
                      Edit
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
