import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/admin/auth/session";
import { adminDatabaseConfigured } from "@/admin/db/sql";
import {
  DEFINITIONS,
  GROUPS,
  GROUP_LABEL,
  RANGES,
  RANGE_LABEL,
  buildReport,
  formatDuration,
  formatPercent,
  kpiQueryString,
  parseKpiQuery,
  percent,
  windowFor,
  type Dimension,
  type Group,
  type KpiReport,
} from "@/admin/kpis/model";
import { loadRaw } from "@/admin/kpis/store";
import { Card, EmptyState, PageHeader } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "KPIs" };

const date = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const month = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});
const dayLabel = (iso: string, group: Group) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return group === "month"
    ? month.format(d)
    : group === "week"
      ? `Week of ${date.format(d)}`
      : date.format(d);
};

const BREAKDOWNS: { dimension: Dimension; title: string }[] = [
  { dimension: "country", title: "By country" },
  { dimension: "locale", title: "By language" },
  { dimension: "utm_source", title: "By source" },
  { dimension: "utm_medium", title: "By medium" },
  { dimension: "utm_campaign", title: "By campaign" },
  { dimension: "trip_slug", title: "By requested trip" },
];

const chip = (active: boolean) =>
  `inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold ${
    active ? "border-ink bg-ink text-sand" : "border-ink/25 bg-white text-ink"
  }`;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-ink/70">{label}</p>
      <p className="mt-1 font-display text-4xl font-semibold text-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-ink/60">{note}</p>}
    </Card>
  );
}

function Trend({ report }: { report: KpiReport }) {
  const max = Math.max(1, ...report.series.map((p) => p.leads));
  return (
    <Card>
      <h2 className="font-display text-2xl font-semibold text-ink">Requests per {report.group}</h2>
      <p className="mt-1 text-xs text-ink/60">
        Grey: requests created. Teal: those that reached Converted.
      </p>
      <div aria-hidden="true" className="mt-4 flex h-44 items-end gap-px sm:gap-1">
        {report.series.map((p) => (
          <div
            key={p.bucket}
            title={`${dayLabel(p.bucket, report.group)}: ${p.leads} requests, ${p.converted} converted`}
            className="relative flex-1 rounded-t bg-ink/25"
            style={{ height: `${Math.max(2, Math.round((p.leads / max) * 100))}%` }}
          >
            {p.converted > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 rounded-t bg-teal"
                style={{ height: `${Math.round((p.converted / p.leads) * 100)}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <details className="mt-4 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-ink">
          Show as table
        </summary>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-ink/60">
              <tr>
                <th className="py-1.5 pr-3 font-semibold">{GROUP_LABEL[report.group]}</th>
                <th className="py-1.5 pr-3 font-semibold">Requests</th>
                <th className="py-1.5 font-semibold">Converted</th>
              </tr>
            </thead>
            <tbody>
              {report.series.map((p) => (
                <tr key={p.bucket} className="border-t border-ink/10">
                  <td className="py-1.5 pr-3">{dayLabel(p.bucket, report.group)}</td>
                  <td className="py-1.5 pr-3">{p.leads}</td>
                  <td className="py-1.5">{p.converted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

function Funnel({ report }: { report: KpiReport }) {
  return (
    <Card>
      <h2 className="font-display text-2xl font-semibold text-ink">Funnel</h2>
      <p className="mt-1 text-xs text-ink/60">
        Share of the requests created in this period that reached each stage.
      </p>
      <ol className="mt-4 grid gap-3">
        {report.funnel.map((step) => (
          <li key={step.stage}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{step.label}</span>
              <span className="text-ink/70">
                {step.leads}
                {step.ofCreated !== null && ` (${step.ofCreated}%)`}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${step.ofCreated ?? 0}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Breakdown({ title, rows }: { title: string; rows: KpiReport["breakdowns"][Dimension] }) {
  return (
    <Card>
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">No requests in this period.</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-xs text-ink/60">
            <tr>
              <th className="py-1.5 pr-3 font-semibold">Value</th>
              <th className="py-1.5 pr-3 font-semibold">Requests</th>
              <th className="py-1.5 font-semibold">Converted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-ink/10">
                <td
                  className="max-w-[12rem] truncate py-1.5 pr-3 font-semibold text-ink"
                  title={row.key}
                >
                  {row.key}
                </td>
                <td className="py-1.5 pr-3">{row.leads}</td>
                <td className="py-1.5">
                  {row.converted}
                  {row.converted > 0 && (
                    <span className="ml-1 text-xs text-ink/60">
                      ({formatPercent(percent(row.converted, row.leads))})
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSession("kpi.read");
  if (!adminDatabaseConfigured()) {
    return (
      <>
        <PageHeader title="KPIs" description="Operational numbers from real records." />
        <EmptyState title="Database not configured">
          Set DATABASE_URL (or ADMIN_DATABASE_URL) to see KPIs here.
        </EmptyState>
      </>
    );
  }

  const query = parseKpiQuery(await searchParams);
  const window = windowFor(query.range);
  const report = buildReport(await loadRaw(window, query.group), window, query.group);
  const href = (change: Partial<typeof query>) =>
    `/kpis?${kpiQueryString({ ...query, ...change })}`;

  return (
    <>
      <PageHeader
        title="KPIs"
        description="Operational numbers from real records. Dates are UTC; every number is defined at the bottom of this page."
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <nav aria-label="Period" className="flex flex-wrap gap-2">
          {RANGES.map((range) => (
            <Link
              key={range}
              href={href({ range, group: parseKpiQuery({ range }).group })}
              aria-current={query.range === range ? "page" : undefined}
              className={chip(query.range === range)}
            >
              {RANGE_LABEL[range]}
            </Link>
          ))}
        </nav>
        <nav aria-label="Group by" className="flex flex-wrap gap-2">
          {GROUPS.map((group) => (
            <Link
              key={group}
              href={href({ group })}
              aria-current={query.group === group ? "page" : undefined}
              className={chip(query.group === group)}
            >
              {GROUP_LABEL[group]}
            </Link>
          ))}
        </nav>
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Requests" value={String(report.total)} note={RANGE_LABEL[query.range]} />
        <Stat
          label="Conversion rate"
          value={formatPercent(report.conversionRate)}
          note={`${report.converted} of ${report.total} reached Converted`}
        />
        <Stat
          label="Median response time"
          value={formatDuration(report.response.medianSeconds)}
          note={
            report.response.answered > 0
              ? `${report.response.answered} answered, ${report.response.unanswered} not yet`
              : "No answered requests in this period"
          }
        />
        <Stat
          label="Waiting now"
          value={String(report.waiting.count)}
          note={
            report.waiting.oldestAt
              ? `Oldest since ${date.format(new Date(report.waiting.oldestAt))}`
              : "Nobody is waiting"
          }
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Trend report={report} />
        <Funnel report={report} />
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-2xl font-semibold text-ink">Response time</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink/60">Median</dt>
            <dd className="font-semibold text-ink">
              {formatDuration(report.response.medianSeconds)}
            </dd>
          </div>
          <div>
            <dt className="text-ink/60">Average</dt>
            <dd className="font-semibold text-ink">
              {formatDuration(report.response.averageSeconds)}
            </dd>
          </div>
          <div>
            <dt className="text-ink/60">Answered within 24 hours</dt>
            <dd className="font-semibold text-ink">
              {formatPercent(report.response.within24hShare)}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {BREAKDOWNS.map((b) => (
          <Breakdown key={b.dimension} title={b.title} rows={report.breakdowns[b.dimension]} />
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-2xl font-semibold text-ink">
          How these numbers are calculated
        </h2>
        <dl className="mt-3 grid gap-4 text-sm">
          {DEFINITIONS.map((d) => (
            <div key={d.term}>
              <dt className="font-semibold text-ink">{d.term}</dt>
              <dd className="mt-0.5 max-w-3xl text-ink/70">{d.text}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
