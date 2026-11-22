import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/admin/auth/session";
import { can } from "@/admin/auth/permissions";
import { adminDatabaseConfigured } from "@/admin/db/sql";
import {
  LEAD_STATUSES,
  PAGE_SIZE,
  STATUS_LABEL,
  STATUS_TONE,
  filterQuery,
  followUpState,
  parseLeadFilter,
  todayUtc,
} from "@/admin/leads/model";
import { leadCounts, listLeads } from "@/admin/leads/store";
import { Badge, Card, EmptyState, PageHeader, buttonClass } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "Leads" };

const FOLLOW: Record<
  "overdue" | "today" | "upcoming",
  { label: string; tone: "warn" | "ok" | "neutral" }
> = {
  overdue: { label: "Overdue", tone: "warn" },
  today: { label: "Today", tone: "warn" },
  upcoming: { label: "", tone: "neutral" },
};

const day = (iso: string) => iso.slice(0, 10);
const input = "min-h-11 rounded-lg border border-ink/25 bg-white px-3 text-sm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role } = await requireSession("leads.manage");
  if (!adminDatabaseConfigured()) {
    return (
      <>
        <PageHeader title="Leads" description="Requests from the trip planner." />
        <EmptyState title="Database not configured">
          Set DATABASE_URL (or ADMIN_DATABASE_URL) to see leads here.
        </EmptyState>
      </>
    );
  }

  const filter = parseLeadFilter(await searchParams);
  const [{ items, total }, counts] = await Promise.all([listLeads(filter), leadCounts()]);
  const today = todayUtc();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allTotal = Object.values(counts.byStatus).reduce((sum, n) => sum + (n ?? 0), 0);
  const link = (extra: Record<string, string>, base: Partial<typeof filter> = {}) => {
    const query = filterQuery({ ...filter, ...base }, extra);
    return query ? `/leads?${query}` : "/leads";
  };
  const exportHref = `/leads/export${filterQuery(filter) ? `?${filterQuery(filter)}` : ""}`;

  return (
    <>
      <PageHeader
        title="Leads"
        description="Requests from the trip planner. Personal data: only open what you need."
        actions={
          can(role, "leads.export") ? (
            <a href={exportHref} className={buttonClass("ghost")}>
              Export CSV
            </a>
          ) : undefined
        }
      />

      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
        {[
          { key: "", label: "All", n: allTotal },
          ...LEAD_STATUSES.map((s) => ({
            key: s,
            label: STATUS_LABEL[s],
            n: counts.byStatus[s] ?? 0,
          })),
        ].map((item) => {
          const active = (filter.status ?? "") === item.key && !filter.due;
          return (
            <Link
              key={item.key || "all"}
              href={link(
                {},
                {
                  status: item.key ? (item.key as typeof filter.status) : undefined,
                  due: false,
                  page: 1,
                },
              )}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${
                active ? "border-ink bg-ink text-sand" : "border-ink/25 bg-white text-ink"
              }`}
            >
              {item.label}
              <span className="text-xs opacity-70">{item.n}</span>
            </Link>
          );
        })}
        <Link
          href={link({}, { status: undefined, due: true, page: 1 })}
          aria-current={filter.due ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${
            filter.due
              ? "border-ink bg-ink text-sand"
              : "border-amber-400 bg-amber-50 text-amber-900"
          }`}
        >
          Follow-up due
          <span className="text-xs opacity-70">{counts.due}</span>
        </Link>
      </nav>

      <form
        action="/leads"
        method="get"
        role="search"
        className="mb-5 flex flex-wrap items-end gap-2"
      >
        {filter.status && <input type="hidden" name="status" value={filter.status} />}
        {filter.due && <input type="hidden" name="due" value="1" />}
        <label className="grid gap-1 text-xs font-semibold text-ink/70">
          Search
          <input
            name="q"
            defaultValue={filter.q}
            placeholder="Name, email or reference"
            className={`${input} w-64`}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-ink/70">
          Language
          <select name="locale" defaultValue={filter.locale ?? ""} className={input}>
            <option value="">All</option>
            <option value="en">English</option>
            <option value="de">German</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-ink/70">
          Country
          <input
            name="country"
            defaultValue={filter.country ?? ""}
            maxLength={2}
            placeholder="DE"
            className={`${input} w-20 uppercase`}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-ink/70">
          Trip slug
          <input name="trip" defaultValue={filter.trip ?? ""} className={`${input} w-48`} />
        </label>
        <button type="submit" className={buttonClass()}>
          Filter
        </button>
        {(filter.q || filter.locale || filter.country || filter.trip) && (
          <Link
            href={link(
              {},
              { q: "", locale: undefined, country: undefined, trip: undefined, page: 1 },
            )}
            className="text-sm underline"
          >
            Clear
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState title="No leads match">
          {allTotal === 0 ? "New requests from the planner appear here." : "Try fewer filters."}
        </EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-ink/10 text-xs tracking-wide text-ink/60 uppercase">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Traveler</th>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => {
                const state = followUpState(lead.nextFollowUpOn, lead.status, today);
                return (
                  <tr key={lead.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {day(lead.createdAt)}
                      <div className="text-xs text-ink/55">{lead.referenceCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-semibold underline decoration-ink/30"
                      >
                        {lead.fullName}
                      </Link>
                      <div className="text-xs text-ink/60">
                        {lead.country} · {lead.locale.toUpperCase()} · {lead.travelers} traveler
                        {lead.travelers === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.tripTitle ?? lead.tripSlug ?? (
                        <span className="text-ink/45">General request</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.nextFollowUpOn ? (
                        <>
                          {lead.nextFollowUpOn}{" "}
                          {state && FOLLOW[state].label && (
                            <Badge tone={FOLLOW[state].tone}>{FOLLOW[state].label}</Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-ink/45">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-between text-sm">
          {filter.page > 1 ? (
            <Link href={link({ page: String(filter.page - 1) })} className={buttonClass("ghost")}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink/65">
            Page {filter.page} of {pages} · {total} leads
          </span>
          {filter.page < pages ? (
            <Link href={link({ page: String(filter.page + 1) })} className={buttonClass("ghost")}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
