import "server-only";
// Database access of the leads inbox (7.5). Runs on the dashboard's privileged connection. Everything here is
// personal data: callers check the permission first, and nothing in this file is reachable from a public page.
import type { PendingQuery, Row } from "postgres";
import { adminSql } from "../db/sql";
import { toLead } from "@/lib/leads/storage";
import type { StoredLead } from "@/lib/leads/types";
import { isUuid } from "../trips/rows";
import {
  PAGE_SIZE,
  likePattern,
  type ActivityItem,
  type LeadFilter,
  type LeadListItem,
  type LeadStatus,
} from "./model";

type Fragment = PendingQuery<Row[]>;

const iso = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();

export async function listLeads(
  filter: LeadFilter,
): Promise<{ items: LeadListItem[]; total: number }> {
  const sql = adminSql();
  const conds: Fragment[] = [];
  if (filter.status) conds.push(sql`l.status = ${filter.status}::lead_status`);
  if (filter.locale) conds.push(sql`l.locale = ${filter.locale}`);
  if (filter.country) conds.push(sql`l.country = ${filter.country}`);
  if (filter.trip) conds.push(sql`l.trip_slug = ${filter.trip}`);
  if (filter.due)
    conds.push(
      sql`(l.next_follow_up_on <= CURRENT_DATE AND l.status NOT IN ('converted', 'lost'))`,
    );
  if (filter.q) {
    const pattern = likePattern(filter.q);
    conds.push(
      sql`(l.full_name ILIKE ${pattern} OR l.email ILIKE ${pattern} OR l.reference_code ILIKE ${pattern})`,
    );
  }
  const where = conds.length
    ? sql`WHERE ${conds.reduce((all, c, i) => (i === 0 ? c : sql`${all} AND ${c}`))}`
    : sql``;

  const [rows, [count]] = await Promise.all([
    sql<Row[]>`
      SELECT l.id, l.reference_code, l.full_name, l.email, l.country, l.locale, l.status::text AS status,
             l.created_at, l.trip_slug, l.adults, l.children,
             to_char(l.next_follow_up_on, 'YYYY-MM-DD') AS follow_up,
             (SELECT tt.title FROM trip_translations tt WHERE tt.trip_id = l.trip_id
               ORDER BY (tt.locale = 'en') DESC LIMIT 1) AS trip_title
      FROM leads l ${where}
      ORDER BY l.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${(filter.page - 1) * PAGE_SIZE}`,
    sql<Row[]>`SELECT count(*)::int AS n FROM leads l ${where}`,
  ]);

  return {
    total: Number(count?.n ?? 0),
    items: rows.map((r) => ({
      id: r.id as string,
      referenceCode: r.reference_code as string,
      fullName: r.full_name as string,
      email: r.email as string,
      country: (r.country as string).trim(),
      locale: r.locale as "en" | "de",
      status: r.status as LeadStatus,
      createdAt: iso(r.created_at),
      tripSlug: (r.trip_slug as string | null) ?? null,
      tripTitle: (r.trip_title as string | null) ?? null,
      nextFollowUpOn: (r.follow_up as string | null) ?? null,
      travelers: Number(r.adults) + Number(r.children),
    })),
  };
}

/** How many leads are in each status, and how many follow-ups are due. Unfiltered, for the tabs. */
export async function leadCounts(): Promise<{
  byStatus: Partial<Record<LeadStatus, number>>;
  due: number;
}> {
  const sql = adminSql();
  const [byStatus, [due]] = await Promise.all([
    sql<Row[]>`SELECT status::text AS status, count(*)::int AS n FROM leads GROUP BY 1`,
    sql<Row[]>`SELECT count(*)::int AS n FROM leads
               WHERE next_follow_up_on <= CURRENT_DATE AND status NOT IN ('converted', 'lost')`,
  ]);
  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status as string, Number(r.n)])),
    due: Number(due?.n ?? 0),
  };
}

export type LeadDetail = {
  lead: StoredLead;
  nextFollowUpOn: string | null;
  tripTitle: string | null;
  activity: ActivityItem[];
};

export async function getLead(id: string): Promise<LeadDetail | null> {
  if (!isUuid(id)) return null;
  const sql = adminSql();
  const [rows, activity] = await Promise.all([
    sql<Row[]>`
      SELECT l.*, to_char(l.next_follow_up_on, 'YYYY-MM-DD') AS follow_up,
             (SELECT tt.title FROM trip_translations tt WHERE tt.trip_id = l.trip_id
               ORDER BY (tt.locale = 'en') DESC LIMIT 1) AS trip_title
      FROM leads l WHERE l.id = ${id}::uuid`,
    sql<Row[]>`
      SELECT id, kind, from_status::text AS from_status, to_status::text AS to_status, actor_id,
             details, created_at
      FROM lead_activity WHERE lead_id = ${id}::uuid ORDER BY created_at DESC, id`,
  ]);
  const row = rows[0];
  if (!row) return null;
  return {
    lead: toLead(row),
    nextFollowUpOn: (row.follow_up as string | null) ?? null,
    tripTitle: (row.trip_title as string | null) ?? null,
    activity: activity.map((a) => ({
      id: a.id as string,
      kind: a.kind as ActivityItem["kind"],
      fromStatus: (a.from_status as LeadStatus | null) ?? null,
      toStatus: (a.to_status as LeadStatus | null) ?? null,
      actorId: (a.actor_id as string | null) ?? null,
      text:
        a.details && typeof a.details === "object" && "text" in a.details
          ? String((a.details as { text: unknown }).text)
          : null,
      createdAt: iso(a.created_at),
    })),
  };
}

/** Moves a lead to a new status; the database logs it (with the actor) and stamps the first contact. */
export async function changeStatus(
  id: string,
  status: LeadStatus,
  actorId: string,
): Promise<"changed" | "same" | "missing"> {
  return adminSql().begin(async (tx) => {
    await tx`SELECT set_config('app.actor_id', ${isUuid(actorId) ? actorId : ""}, true)`;
    const [current] = await tx<
      Row[]
    >`SELECT status::text AS status FROM leads WHERE id = ${id}::uuid FOR UPDATE`;
    if (!current) return "missing";
    if (current.status === status) return "same";
    await tx`UPDATE leads SET status = ${status}::lead_status WHERE id = ${id}::uuid`;
    return "changed";
  });
}

export async function addNote(id: string, text: string, actorId: string): Promise<boolean> {
  const sql = adminSql();
  const rows = await sql`
    INSERT INTO lead_activity (lead_id, kind, actor_id, details)
    SELECT l.id, 'note', ${isUuid(actorId) ? actorId : null}::uuid, ${sql.json({ text })}
    FROM leads l WHERE l.id = ${id}::uuid
    RETURNING id`;
  return rows.length > 0;
}

export async function setFollowUp(id: string, date: string | null): Promise<boolean> {
  const rows = await adminSql()`
    UPDATE leads SET next_follow_up_on = ${date}::date WHERE id = ${id}::uuid RETURNING id`;
  return rows.length > 0;
}
