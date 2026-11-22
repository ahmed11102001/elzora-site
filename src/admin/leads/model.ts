// Pure rules of the leads inbox (7.5): statuses, filters, follow-up state, input validation.
// No database and no framework, so it is unit tested directly.
import { z } from "zod";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/types";

export { LEAD_STATUSES };
export type { LeadStatus };

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal sent",
  converted: "Converted",
  lost: "Lost",
};

export const STATUS_TONE: Record<LeadStatus, "neutral" | "ok" | "warn" | "soon"> = {
  new: "warn",
  contacted: "neutral",
  qualified: "neutral",
  proposal_sent: "soon",
  converted: "ok",
  lost: "neutral",
};

/** A lead that is finished either way no longer needs a follow-up. */
export const isClosed = (status: LeadStatus) => status === "converted" || status === "lost";

export const PAGE_SIZE = 25;
export const NOTE_MAX = 2000;

export type LeadFilter = {
  q: string;
  status?: LeadStatus;
  locale?: "en" | "de";
  country?: string;
  /** Slug of the requested trip. */
  trip?: string;
  /** Only leads whose follow-up date is today or earlier and that are still open. */
  due: boolean;
  page: number;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Reads and sanitizes the inbox query string: unknown values are dropped, never trusted. */
export function parseLeadFilter(query: Record<string, string | string[] | undefined>): LeadFilter {
  const status = first(query.status);
  const locale = first(query.locale);
  const country = (first(query.country) ?? "").trim().toUpperCase();
  const trip = (first(query.trip) ?? "").trim().toLowerCase();
  const page = Number.parseInt(first(query.page) ?? "1", 10);
  return {
    q: (first(query.q) ?? "").trim().slice(0, 80),
    status: LEAD_STATUSES.find((s) => s === status),
    locale: locale === "en" || locale === "de" ? locale : undefined,
    country: /^[A-Z]{2}$/.test(country) ? country : undefined,
    trip: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(trip) && trip.length <= 120 ? trip : undefined,
    due: first(query.due) === "1",
    page: Number.isFinite(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

/** The same filter as a query string (pagination and export links), without the page. */
export function filterQuery(filter: LeadFilter, extra: Record<string, string> = {}): string {
  const query = new URLSearchParams();
  if (filter.q) query.set("q", filter.q);
  if (filter.status) query.set("status", filter.status);
  if (filter.locale) query.set("locale", filter.locale);
  if (filter.country) query.set("country", filter.country);
  if (filter.trip) query.set("trip", filter.trip);
  if (filter.due) query.set("due", "1");
  for (const [key, value] of Object.entries(extra)) query.set(key, value);
  return query.toString();
}

/** Escapes % _ and \ so a search box can never act as a LIKE pattern. */
export const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export type FollowUpState = "overdue" | "today" | "upcoming" | null;

export function followUpState(
  date: string | null,
  status: LeadStatus,
  today: string, // YYYY-MM-DD
): FollowUpState {
  if (!date || isClosed(status)) return null;
  return date < today ? "overdue" : date === today ? "today" : "upcoming";
}

export const todayUtc = (now: Date = new Date()) => now.toISOString().slice(0, 10);

// -------------------------------------------------------------------------------- form input

export const LeadId = z.uuid();

export const StatusInput = z.object({ id: LeadId, status: z.enum(LEAD_STATUSES) });
export const NoteInput = z.object({
  id: LeadId,
  text: z.string().trim().min(1, "Write a note first.").max(NOTE_MAX, "That note is too long."),
});

/** An empty field clears the follow-up; otherwise a real calendar date, not in the distant past. */
export const FollowUpInput = z.object({
  id: LeadId,
  date: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .refine(
      (v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))),
      "Choose a valid date.",
    ),
});

// -------------------------------------------------------------------------------- read models

export type LeadListItem = {
  id: string;
  referenceCode: string;
  fullName: string;
  email: string;
  country: string;
  locale: "en" | "de";
  status: LeadStatus;
  createdAt: string;
  tripSlug: string | null;
  tripTitle: string | null;
  nextFollowUpOn: string | null;
  travelers: number;
};

export type ActivityItem = {
  id: string;
  kind: "created" | "status_change" | "assignment" | "note";
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  actorId: string | null;
  text: string | null;
  createdAt: string;
};
