import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/admin/auth/session";
import { Badge, Card, PageHeader, buttonClass } from "@/admin/ui/primitives";
import { STATE_LABEL, tripState, type TripState } from "@/admin/trips/model";
import { getTripStore } from "@/admin/trips/store";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const { user, role } = await requireSession();

  // Trip counts by status (7.4B). A trip counts once, under its most advanced language.
  const counts: Record<TripState, number> = { draft: 0, review: 0, published: 0, archived: 0 };
  for (const trip of await getTripStore().list()) counts[tripState(trip)] += 1;

  // Booleans only: configuration values are never shown, not even to the Owner.
  const checks = [
    { label: "Sign-in (Supabase Auth)", ok: true, note: "Connected" },
    { label: "Two-step verification", ok: true, note: "Verified for this session" },
    {
      label: "Database (DATABASE_URL)",
      ok: Boolean(process.env.DATABASE_URL),
      note: process.env.DATABASE_URL
        ? "Configured"
        : "Missing: sign-in rate limiting and leads need it",
    },
    {
      label: "Admin host (ADMIN_HOST)",
      ok: Boolean(process.env.ADMIN_HOST),
      note: process.env.ADMIN_HOST ? "Exact host set" : "Not set: any admin.* host is accepted",
    },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Signed in as ${user.email} (${role}). This is the operations dashboard: trips, leads, partners and KPIs. The website itself is not edited here.`}
      />

      <section aria-labelledby="status-title" className="mb-8">
        <h2
          id="status-title"
          className="mb-3 text-sm font-semibold tracking-wide text-ink/70 uppercase"
        >
          System status
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((check) => (
            <Card key={check.label} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{check.label}</p>
                <p className="mt-0.5 text-sm text-ink/65">{check.note}</p>
              </div>
              <Badge tone={check.ok ? "ok" : "warn"}>{check.ok ? "OK" : "Check"}</Badge>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="trips-title" className="mb-8">
        <h2
          id="trips-title"
          className="mb-3 text-sm font-semibold tracking-wide text-ink/70 uppercase"
        >
          Trips by status
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["draft", "review", "published", "archived"] as const).map((key) => (
            <Link
              key={key}
              href={key === "archived" ? "/trips?status=archived" : `/trips?status=${key}`}
            >
              <Card className="h-full transition-colors hover:border-ink/30">
                <p className="font-display text-4xl font-semibold">{counts[key]}</p>
                <p className="mt-0.5 text-sm text-ink/65">{STATE_LABEL[key]}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="roadmap-title">
        <h2
          id="roadmap-title"
          className="mb-3 text-sm font-semibold tracking-wide text-ink/70 uppercase"
        >
          What is coming
        </h2>
        <Card className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-semibold">Trips</p>
            <p className="mt-0.5 text-sm text-ink/65">
              Create and edit trips in English and German, with itinerary, photos and SEO, then
              preview and publish.
            </p>
            <Link href="/trips" className={`${buttonClass("ghost")} mt-3`}>
              Open trips
            </Link>
          </div>
          <div>
            <p className="font-semibold">Leads, partners, KPIs</p>
            <p className="mt-0.5 text-sm text-ink/65">
              Follow up requests from the trip planner, manage partners privately and read the
              numbers (milestones 7.5 to 7.7).
            </p>
            <p className="mt-3 flex gap-2">
              <Badge tone="soon">7.5</Badge>
              <Badge tone="soon">7.6</Badge>
              <Badge tone="soon">7.7</Badge>
            </p>
          </div>
        </Card>
      </section>
    </>
  );
}
