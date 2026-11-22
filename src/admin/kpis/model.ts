// Pure rules of the KPI screen (7.7): query parsing, time windows, buckets, funnel and report assembly.
// No database and no framework, so it is unit tested directly. Everything is UTC and documented in
// DEFINITIONS (shown on the page) and in docs/phase-7/7.7-kpis-and-hardening.md.

export const RANGES = ["7d", "30d", "90d", "365d"] as const;
export type Range = (typeof RANGES)[number];
export const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "365d": "Last 12 months",
};
const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

export const GROUPS = ["day", "week", "month"] as const;
export type Group = (typeof GROUPS)[number];
export const GROUP_LABEL: Record<Group, string> = { day: "Day", week: "Week", month: "Month" };

export const DIMENSIONS = [
  "country",
  "locale",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "trip_slug",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

/** The funnel stages in order. A lead "reached" a stage when it ever had that status or a later one. */
export const FUNNEL_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "converted",
] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];
export const STAGE_LABEL: Record<FunnelStage, string> = {
  new: "Request received",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal sent",
  converted: "Converted",
};

export const NONE_LABEL = "(none)";
export const DAY_SECONDS = 86_400;

export const DEFINITIONS: { term: string; text: string }[] = [
  {
    term: "Leads",
    text: "Requests created from the trip planner in the selected period (UTC dates).",
  },
  {
    term: "Funnel",
    text: "Of the leads created in the period, how many ever reached each stage or a later one. It uses the status history, so a lead that was qualified and then lost still counts as qualified. A lead that skips a stage counts for the stages before it.",
  },
  {
    term: "Conversion rate",
    text: "Leads created in the period that ever reached Converted, divided by all leads created in the same period. Recent leads have had less time to convert, so compare long periods with long periods.",
  },
  {
    term: "Response time",
    text: "First contact minus the moment the lead was created. First contact is the first time a lead leaves New for anything except Lost. Leads still waiting are not part of the median; they are counted separately.",
  },
  {
    term: "Waiting now",
    text: "All leads that are still New, whatever their date. The oldest one shows how long somebody has been waiting.",
  },
  {
    term: "Source, medium, campaign",
    text: "The UTM values saved with the lead when it was created (first touch). Leads without a value are grouped as (none). Values are compared in lower case.",
  },
  {
    term: "Not included",
    text: "Website visits, bounce rate and ad spend (they arrive with analytics in Phase 9) and a breakdown by partner (it arrives with partners).",
  },
];

// ---------------------------------------------------------------------------------- query string

export type KpiQuery = { range: Range; group: Group };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The bucket size that suits a period, unless the person picked one. */
export const defaultGroup = (range: Range): Group =>
  range === "365d" ? "month" : range === "90d" ? "week" : "day";

/** Reads the query string; unknown values are dropped, never trusted. */
export function parseKpiQuery(query: Record<string, string | string[] | undefined>): KpiQuery {
  const rangeRaw = first(query.range);
  const groupRaw = first(query.by);
  const range = RANGES.find((r) => r === rangeRaw) ?? "30d";
  const group = GROUPS.find((g) => g === groupRaw) ?? defaultGroup(range);
  return { range, group };
}

export const kpiQueryString = (q: KpiQuery) =>
  new URLSearchParams({ range: q.range, by: q.group }).toString();

// ---------------------------------------------------------------------------------- time window

export type Window = { from: Date; to: Date };

const startOfUtcDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/**
 * The period as [from, to): `from` is UTC midnight of the first day, `to` is the start of tomorrow, so the
 * current day is always included and a "7 day" period is exactly seven calendar days.
 */
export function windowFor(range: Range, now: Date = new Date()): Window {
  const today = startOfUtcDay(now);
  const to = new Date(today.getTime() + DAY_SECONDS * 1000);
  const from = new Date(to.getTime() - RANGE_DAYS[range] * DAY_SECONDS * 1000);
  return { from, to };
}

/** Start of the bucket a date falls in. Weeks start on Monday, like Postgres date_trunc('week'). */
export function bucketStart(date: Date, group: Group): Date {
  const day = startOfUtcDay(date);
  if (group === "day") return day;
  if (group === "month") return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_SECONDS * 1000);
}

const nextBucket = (start: Date, group: Group): Date =>
  group === "month"
    ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
    : new Date(start.getTime() + (group === "week" ? 7 : 1) * DAY_SECONDS * 1000);

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export type SeriesPoint = { bucket: string; leads: number; converted: number };

/** One point per bucket in the window, with zeros where nothing happened, so the chart has no gaps. */
export function buildSeries(
  rows: { bucket: string; leads: number; converted: number }[],
  window: Window,
  group: Group,
): SeriesPoint[] {
  const byBucket = new Map(rows.map((r) => [r.bucket, r]));
  const points: SeriesPoint[] = [];
  let cursor = bucketStart(window.from, group);
  // `to` is exclusive; the guard keeps a bad window from looping forever.
  for (let i = 0; cursor < window.to && i < 1000; i++) {
    const key = isoDay(cursor);
    const row = byBucket.get(key);
    points.push({ bucket: key, leads: row?.leads ?? 0, converted: row?.converted ?? 0 });
    cursor = nextBucket(cursor, group);
  }
  return points;
}

// ---------------------------------------------------------------------------------- numbers

/** Whole-number percentage, or null when there is nothing to divide by (never a fake 0%). */
export const percent = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

export const formatPercent = (value: number | null) => (value === null ? "–" : `${value}%`);

/** "45 min", "3 h 20 min", "2 d 4 h". Null (no data) is a dash. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "–";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} d ${restHours} h` : `${days} d`;
}

// ---------------------------------------------------------------------------------- report

export type Raw = {
  /** Leads created in the window, grouped by funnel rank (0 = new ... 4 = converted). */
  rankCounts: { rank: number; leads: number }[];
  series: { bucket: string; leads: number; converted: number }[];
  response: {
    answered: number;
    medianSeconds: number | null;
    averageSeconds: number | null;
    within24h: number;
  };
  waiting: { count: number; oldestAt: string | null };
  breakdowns: Record<Dimension, { key: string; leads: number; converted: number }[]>;
};

export type FunnelStep = {
  stage: FunnelStage;
  label: string;
  leads: number;
  ofCreated: number | null;
};

/** "Reached at least stage N" from the per-rank counts. */
export function buildFunnel(rankCounts: Raw["rankCounts"]): FunnelStep[] {
  const total = rankCounts.reduce((sum, r) => sum + r.leads, 0);
  return FUNNEL_STAGES.map((stage, index) => {
    const leads = rankCounts.filter((r) => r.rank >= index).reduce((sum, r) => sum + r.leads, 0);
    return { stage, label: STAGE_LABEL[stage], leads, ofCreated: percent(leads, total) };
  });
}

export type KpiReport = {
  window: { from: string; to: string };
  group: Group;
  total: number;
  converted: number;
  conversionRate: number | null;
  funnel: FunnelStep[];
  series: SeriesPoint[];
  response: {
    answered: number;
    unanswered: number;
    medianSeconds: number | null;
    averageSeconds: number | null;
    within24hShare: number | null;
  };
  waiting: { count: number; oldestAt: string | null };
  breakdowns: Raw["breakdowns"];
};

export function buildReport(raw: Raw, window: Window, group: Group): KpiReport {
  const funnel = buildFunnel(raw.rankCounts);
  const total = funnel[0]?.leads ?? 0;
  const converted = funnel[funnel.length - 1]?.leads ?? 0;
  return {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    group,
    total,
    converted,
    conversionRate: percent(converted, total),
    funnel,
    series: buildSeries(raw.series, window, group),
    response: {
      answered: raw.response.answered,
      unanswered: Math.max(0, total - raw.response.answered),
      medianSeconds: raw.response.medianSeconds,
      averageSeconds: raw.response.averageSeconds,
      within24hShare: percent(raw.response.within24h, raw.response.answered),
    },
    waiting: raw.waiting,
    breakdowns: raw.breakdowns,
  };
}
