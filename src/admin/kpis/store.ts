import "server-only";
// Database access of the KPI screen (7.7). Runs on the dashboard's privileged connection and only returns
// counts and groupings, never a lead's personal data. Callers check the `kpi.read` permission first.
//
// Every query starts from one CTE, `base`: the leads created in the window, each with its funnel rank.
//   rank = the furthest stage the lead ever reached (0 new, 1 contacted, 2 qualified, 3 proposal sent,
//   4 converted), taken from the status history AND the current status (leads that existed before the
//   history triggers have no history rows, so the current status covers them).
import type { PendingQuery, Row } from "postgres";
import { adminSql } from "../db/sql";
import { DIMENSIONS, NONE_LABEL, type Dimension, type Raw, type Window } from "./model";

type Fragment = PendingQuery<Row[]>;

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));
const numOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

function baseCte(window: Window): Fragment {
  const sql = adminSql();
  return sql`
    WITH base AS (
      SELECT l.id,
             l.created_at,
             l.first_contacted_at,
             btrim(l.country::text) AS country,
             l.locale,
             COALESCE(NULLIF(lower(btrim(l.utm_source)), ''), ${NONE_LABEL}) AS utm_source,
             COALESCE(NULLIF(lower(btrim(l.utm_medium)), ''), ${NONE_LABEL}) AS utm_medium,
             COALESCE(NULLIF(lower(btrim(l.utm_campaign)), ''), ${NONE_LABEL}) AS utm_campaign,
             COALESCE(NULLIF(l.trip_slug, ''), ${NONE_LABEL}) AS trip_slug,
             GREATEST(
               CASE l.status::text
                 WHEN 'contacted' THEN 1 WHEN 'qualified' THEN 2
                 WHEN 'proposal_sent' THEN 3 WHEN 'converted' THEN 4 ELSE 0 END,
               COALESCE((
                 SELECT MAX(CASE a.to_status::text
                              WHEN 'contacted' THEN 1 WHEN 'qualified' THEN 2
                              WHEN 'proposal_sent' THEN 3 WHEN 'converted' THEN 4 ELSE 0 END)
                 FROM lead_activity a
                 WHERE a.lead_id = l.id AND a.kind = 'status_change'
               ), 0)
             ) AS rank
      FROM leads l
      WHERE l.created_at >= ${window.from} AND l.created_at < ${window.to}
    )`;
}

/** The top 10 values of one dimension, with how many of those leads converted. */
async function breakdown(base: Fragment, dimension: Dimension) {
  // `dimension` comes from a fixed list (never from the request), and sql(...) quotes it as an identifier.
  if (!DIMENSIONS.includes(dimension)) throw new Error("unknown dimension");
  const sql = adminSql();
  const rows = await sql<Row[]>`
    ${base}
    SELECT ${sql(dimension)}::text AS key,
           count(*)::int AS leads,
           count(*) FILTER (WHERE rank = 4)::int AS converted
    FROM base GROUP BY 1 ORDER BY leads DESC, key LIMIT 10`;
  return rows.map((r) => ({
    key: String(r.key),
    leads: num(r.leads),
    converted: num(r.converted),
  }));
}

export async function loadRaw(window: Window, group: "day" | "week" | "month"): Promise<Raw> {
  const sql = adminSql();
  const base = baseCte(window);

  const [rankRows, seriesRows, [response], [waiting]] = await Promise.all([
    sql<Row[]>`${base} SELECT rank::int AS rank, count(*)::int AS leads FROM base GROUP BY 1`,
    sql<Row[]>`
      ${base}
      SELECT to_char(date_trunc(${group}::text, created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS bucket,
             count(*)::int AS leads,
             count(*) FILTER (WHERE rank = 4)::int AS converted
      FROM base GROUP BY 1 ORDER BY 1`,
    sql<Row[]>`
      ${base}
      SELECT count(*)::int AS answered,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY secs) AS median_s,
             avg(secs) AS average_s,
             count(*) FILTER (WHERE secs <= 86400)::int AS within_24h
      FROM (
        SELECT GREATEST(0, extract(epoch FROM first_contacted_at - created_at)) AS secs
        FROM base WHERE first_contacted_at IS NOT NULL
      ) s`,
    // Not limited to the window: everybody who is still waiting for a first answer.
    sql<
      Row[]
    >`SELECT count(*)::int AS n, min(created_at) AS oldest FROM leads WHERE status = 'new'`,
  ]);

  const entries = await Promise.all(
    DIMENSIONS.map(async (dimension) => [dimension, await breakdown(base, dimension)] as const),
  );

  const oldest = waiting?.oldest;
  return {
    rankCounts: rankRows.map((r) => ({ rank: num(r.rank), leads: num(r.leads) })),
    series: seriesRows.map((r) => ({
      bucket: String(r.bucket),
      leads: num(r.leads),
      converted: num(r.converted),
    })),
    response: {
      answered: num(response?.answered),
      medianSeconds: numOrNull(response?.median_s),
      averageSeconds: numOrNull(response?.average_s),
      within24h: num(response?.within_24h),
    },
    waiting: {
      count: num(waiting?.n),
      oldestAt: oldest
        ? (oldest instanceof Date ? oldest : new Date(String(oldest))).toISOString()
        : null,
    },
    breakdowns: Object.fromEntries(entries) as Raw["breakdowns"],
  };
}
