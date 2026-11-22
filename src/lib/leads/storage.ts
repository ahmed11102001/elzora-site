import "server-only";
import postgres, { type Sql } from "postgres";
import { generateReferenceCode } from "./reference";
import {
  StorageUnavailableError,
  type LeadStorage,
  type NewLead,
  type RateLimitResult,
  type StoredLead,
} from "./types";
import type { LeadStatus } from "./types";
import type { Locale } from "@/i18n/config";
import type { Budget, DateMode, Duration, Interest } from "./options";

// Postgres storage (provider-agnostic: Supabase, Neon, Vercel Postgres, RDS ...) over DATABASE_URL.
// The connection string is read on the server only and never reaches the browser.
// Table definitions: db/migrations/0001_create_leads.sql and 0002_content_platform.sql (trip context).
//
// Provider notes:
//  - Serverless (Vercel): use the provider's POOLED connection string (Supabase: "transaction pooler",
//    port 6543). `prepare: false` below is required by transaction poolers.
//  - SSL: append `?sslmode=require` to the URL when the provider needs it (Supabase does).

const globalForSql = globalThis as unknown as { __elzoraSql?: Sql };

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new StorageUnavailableError("DATABASE_URL is not set");
  globalForSql.__elzoraSql ??= postgres(url, {
    max: 1, // one connection per serverless instance; the pooler does the multiplexing
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return globalForSql.__elzoraSql;
}

const TEXT_ARRAY = 1009;
const INT2_ARRAY = 1005;
const REFERENCE_RETRIES = 5;

type Row = Record<string, unknown>;
const opt = (value: unknown) =>
  value === null || value === undefined ? undefined : (value as string);
const dateOnly = (value: unknown) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : opt(value);

export function toLead(row: Row): StoredLead {
  return {
    id: row.id as string,
    referenceCode: row.reference_code as string,
    idempotencyKey: row.idempotency_key as string,
    dedupeHash: row.dedupe_hash as string,
    status: row.status as LeadStatus,
    locale: row.locale as Locale,
    fullName: row.full_name as string,
    email: row.email as string,
    country: (row.country as string).trim(),
    phone: opt(row.phone),
    dateFlexibility: row.date_flexibility as DateMode,
    arrivalDate: dateOnly(row.arrival_date),
    departureDate: dateOnly(row.departure_date),
    flexibleWhen: opt(row.flexible_when),
    adults: Number(row.adults),
    children: Number(row.children),
    childrenAges: (row.children_ages as number[]).map(Number),
    interests: row.interests as Interest[],
    duration: row.duration as Duration,
    budget: row.budget as Budget,
    budgetType: "per_person",
    notes: opt(row.notes),
    source: opt(row.source),
    landingPage: opt(row.landing_page),
    utmSource: opt(row.utm_source),
    utmMedium: opt(row.utm_medium),
    utmCampaign: opt(row.utm_campaign),
    utmContent: opt(row.utm_content),
    utmTerm: opt(row.utm_term),
    referrer: opt(row.referrer),
    tripSlug: opt(row.trip_slug),
    tripId: (row.trip_id as string | null) ?? null,
    firstContactedAt: (row.first_contacted_at as Date | null) ?? null,
    consentVersion: row.consent_version as string,
    consentedAt: row.consented_at as Date,
    teamNotifiedAt: (row.team_notified_at as Date | null) ?? null,
    travelerNotifiedAt: (row.traveler_notified_at as Date | null) ?? null,
    notificationAttempts: Number(row.notification_attempts),
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/** Logs only the Postgres error code and constraint, never the message (it can contain row data). */
function toUnavailable(error: unknown): never {
  if (error instanceof StorageUnavailableError) throw error;
  const e = error as { code?: string; constraint_name?: string; name?: string };
  console.error("[leads] database error", {
    code: e.code ?? e.name ?? "unknown",
    constraint: e.constraint_name,
  });
  throw new StorageUnavailableError();
}

const isUniqueViolation = (error: unknown, constraint: string) =>
  (error as { code?: string; constraint_name?: string })?.code === "23505" &&
  (error as { constraint_name?: string }).constraint_name === constraint;

async function guarded<T>(job: () => Promise<T>): Promise<T> {
  try {
    return await job();
  } catch (error) {
    return toUnavailable(error);
  }
}

export const postgresStorage: LeadStorage = {
  findByIdempotencyKey: (key) =>
    guarded(async () => {
      const rows = await getSql()<
        Row[]
      >`SELECT * FROM leads WHERE idempotency_key = ${key} LIMIT 1`;
      return rows[0] ? toLead(rows[0]) : null;
    }),

  findRecentByDedupeHash: (hash, withinMinutes) =>
    guarded(async () => {
      const rows = await getSql()<Row[]>`
        SELECT * FROM leads
        WHERE dedupe_hash = ${hash} AND created_at > now() - (${withinMinutes}::int * interval '1 minute')
        ORDER BY created_at DESC LIMIT 1`;
      return rows[0] ? toLead(rows[0]) : null;
    }),

  insert: (lead: NewLead) =>
    guarded(async () => {
      const sql = getSql();
      for (let attempt = 0; attempt < REFERENCE_RETRIES; attempt++) {
        const referenceCode = generateReferenceCode();
        try {
          const rows = await sql<Row[]>`
            INSERT INTO leads (
              reference_code, idempotency_key, dedupe_hash, locale, full_name, email, country, phone,
              date_flexibility, arrival_date, departure_date, flexible_when,
              adults, children, children_ages, interests, duration, budget, budget_type, notes,
              source, landing_page, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer,
              trip_id, trip_slug,
              consent_version, consented_at
            ) VALUES (
              ${referenceCode}, ${lead.idempotencyKey}, ${lead.dedupeHash}, ${lead.locale},
              ${lead.fullName}, ${lead.email}, ${lead.country}, ${lead.phone ?? null},
              ${lead.dateFlexibility}, ${lead.arrivalDate ?? null}, ${lead.departureDate ?? null},
              ${lead.flexibleWhen ?? null},
              ${lead.adults}, ${lead.children}, ${sql.array(lead.childrenAges, INT2_ARRAY)},
              ${sql.array(lead.interests, TEXT_ARRAY)}, ${lead.duration}, ${lead.budget},
              ${lead.budgetType}, ${lead.notes ?? null},
              ${lead.source ?? null}, ${lead.landingPage ?? null}, ${lead.utmSource ?? null},
              ${lead.utmMedium ?? null}, ${lead.utmCampaign ?? null}, ${lead.utmContent ?? null},
              ${lead.utmTerm ?? null}, ${lead.referrer ?? null},
              (SELECT trip_id FROM trip_translations WHERE slug = ${lead.tripSlug ?? null}
                 ORDER BY (locale = ${lead.locale}) DESC LIMIT 1),
              ${lead.tripSlug ?? null},
              ${lead.consentVersion}, ${lead.consentedAt}
            )
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING *`;
          if (rows[0]) return { lead: toLead(rows[0]), created: true };
          // The same idempotency key won the race: return that lead.
          const existing = await sql<Row[]>`
            SELECT * FROM leads WHERE idempotency_key = ${lead.idempotencyKey} LIMIT 1`;
          return { lead: toLead(existing[0]), created: false };
        } catch (error) {
          if (isUniqueViolation(error, "leads_reference_code_key")) continue; // new code, try again
          throw error;
        }
      }
      throw new Error("Could not generate a unique reference code");
    }),

  hit: (key, limit, windowSeconds): Promise<RateLimitResult> =>
    guarded(async () => {
      const sql = getSql();
      const rows = await sql<{ hits: number; retry_after: number }[]>`
        INSERT INTO lead_rate_limits AS r (key, window_start, hits)
        VALUES (${key}, now(), 1)
        ON CONFLICT (key) DO UPDATE SET
          hits = CASE WHEN r.window_start < now() - (${windowSeconds}::int * interval '1 second')
                      THEN 1 ELSE r.hits + 1 END,
          window_start = CASE WHEN r.window_start < now() - (${windowSeconds}::int * interval '1 second')
                              THEN now() ELSE r.window_start END
        RETURNING hits,
          GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
            window_start + (${windowSeconds}::int * interval '1 second') - now()
          ))))::int AS retry_after`;
      // Housekeeping on roughly 1 in 50 calls keeps the table small without a cron job.
      if (Math.random() < 0.02) {
        await sql`DELETE FROM lead_rate_limits WHERE window_start < now() - interval '1 day'`;
      }
      const { hits, retry_after } = rows[0];
      return { allowed: hits <= limit, retryAfterSeconds: retry_after };
    }),

  recordNotification: (id, kind, outcome) =>
    guarded(async () => {
      const sql = getSql();
      if (outcome.ok) {
        if (kind === "team")
          await sql`UPDATE leads SET team_notified_at = now(), last_notification_error = NULL WHERE id = ${id}`;
        else
          await sql`UPDATE leads SET traveler_notified_at = now(), last_notification_error = NULL WHERE id = ${id}`;
        return;
      }
      // "not_configured" does not use up retry attempts: it is fixed by setting the env vars.
      const attempt = outcome.reason === "not_configured" ? 0 : 1;
      await sql`
        UPDATE leads
        SET notification_attempts = notification_attempts + ${attempt}::int,
            last_notification_error = ${`${kind}:${outcome.reason}`.slice(0, 100)}
        WHERE id = ${id}`;
    }),

  listPendingNotifications: (limit) =>
    guarded(async () => {
      const rows = await getSql()<Row[]>`
        SELECT * FROM leads
        WHERE (team_notified_at IS NULL OR traveler_notified_at IS NULL)
          AND notification_attempts < 10
          AND created_at < now() - interval '2 minutes'
        ORDER BY created_at ASC LIMIT ${limit}`;
      return rows.map(toLead);
    }),

  listForExport: (limit) =>
    guarded(async () => {
      const rows = await getSql()<
        Row[]
      >`SELECT * FROM leads ORDER BY created_at DESC LIMIT ${limit}`;
      return rows.map(toLead);
    }),
};
