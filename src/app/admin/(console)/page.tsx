import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/admin/auth/session";
import { Badge, Card, PageHeader, buttonClass } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const { user, role } = await requireSession();

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
              preview and publish (milestone 7.4B to 7.4D).
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
