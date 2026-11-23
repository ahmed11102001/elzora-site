import { dedupeHash } from "./dedupe";
import { BUDGET_TYPE, CONSENT_VERSION } from "./options";
import { createLeadSchema, toFieldErrors, type FieldErrors, type ValidLead } from "./schema";
import { StorageUnavailableError, type LeadStorage, type NewLead, type StoredLead } from "./types";
import type { TurnstileOutcome } from "./turnstile";

export const RATE_LIMIT = { limit: 10, windowSeconds: 600 } as const;
export const DEDUPE_WINDOW_MINUTES = 30;

export type SubmitDeps = {
  storage: LeadStorage;
  verifyTurnstile: (
    token: string | undefined,
    remoteIp: string | undefined,
    idempotencyKey: string,
  ) => Promise<TurnstileOutcome>;
  /** Called once for a newly created lead. Must not throw into the request (fire and forget). */
  notify: (lead: StoredLead) => void;
  now?: () => Date;
  log?: (event: string, details?: Record<string, string | number | boolean>) => void;
};

export type SubmitInput = {
  body: unknown;
  /** Rate-limit key derived from the client IP (see request-meta.ts). */
  rateLimitKey: string;
  remoteIp?: string;
};

export type SubmitResponse =
  | { status: 200 | 201; body: { ok: true; referenceCode: string; duplicate: boolean } }
  | { status: 400; body: { ok: false; error: "invalid_payload" | "rejected" } }
  | { status: 403; body: { ok: false; error: "captcha_failed" } }
  | { status: 422; body: { ok: false; error: "validation"; fieldErrors: FieldErrors } }
  | { status: 429; body: { ok: false; error: "rate_limited"; retryAfterSeconds: number } }
  | {
      status: 503;
      body: { ok: false; error: "storage_unavailable" | "captcha_unavailable" };
    }
  | { status: 500; body: { ok: false; error: "server_error" } };

const ok = (lead: StoredLead, duplicate: boolean): SubmitResponse => ({
  status: duplicate ? 200 : 201,
  body: { ok: true, referenceCode: lead.referenceCode, duplicate },
});

function toNewLead(lead: ValidLead, consentedAt: Date): NewLead {
  const a = lead.attribution;
  return {
    idempotencyKey: lead.idempotencyKey,
    dedupeHash: dedupeHash(lead),
    locale: lead.locale,
    fullName: lead.fullName,
    email: lead.email,
    country: lead.country,
    phone: lead.phone,
    dateFlexibility: lead.dateMode,
    arrivalDate: lead.arrival,
    departureDate: lead.departure,
    flexibleWhen: lead.flexibleWhen,
    adults: lead.adults,
    children: lead.children,
    childrenAges: lead.childrenAges,
    interests: lead.interests,
    duration: lead.duration,
    budget: lead.budget,
    budgetType: BUDGET_TYPE,
    notes: lead.notes,
    source: a.source,
    landingPage: a.landingPage,
    utmSource: a.utmSource,
    utmMedium: a.utmMedium,
    utmCampaign: a.utmCampaign,
    utmContent: a.utmContent,
    utmTerm: a.utmTerm,
    gclid: a.gclid,
    fbclid: a.fbclid,
    referrer: a.referrer,
    tripSlug: lead.tripSlug,
    consentVersion: CONSENT_VERSION,
    consentedAt,
  };
}

/**
 * The whole submission flow, free of HTTP and framework details so it can be tested with fakes.
 * Order matters:
 *   rate limit -> honeypot -> validation -> duplicate check -> Turnstile -> persist -> notify.
 * The duplicate check runs before Turnstile because a Turnstile token is single use: a retry of a
 * request that did succeed must return the original reference, not fail the captcha.
 * Success is reported only after the lead is stored.
 */
export async function submitLead(input: SubmitInput, deps: SubmitDeps): Promise<SubmitResponse> {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? (() => {});
  const { storage } = deps;

  try {
    const limit = await storage.hit(input.rateLimitKey, RATE_LIMIT.limit, RATE_LIMIT.windowSeconds);
    if (!limit.allowed) {
      log("rate_limited");
      return {
        status: 429,
        body: { ok: false, error: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds },
      };
    }

    if (typeof input.body !== "object" || input.body === null || Array.isArray(input.body)) {
      return { status: 400, body: { ok: false, error: "invalid_payload" } };
    }

    // Honeypot: a field real visitors never see or fill.
    const honeypot = (input.body as Record<string, unknown>).website;
    if (typeof honeypot === "string" ? honeypot.trim() !== "" : honeypot != null) {
      log("honeypot");
      return { status: 400, body: { ok: false, error: "rejected" } };
    }

    const parsed = createLeadSchema(now).safeParse(input.body);
    if (!parsed.success) {
      return {
        status: 422,
        body: { ok: false, error: "validation", fieldErrors: toFieldErrors(parsed.error) },
      };
    }
    const lead = parsed.data;

    const existing =
      (await storage.findByIdempotencyKey(lead.idempotencyKey)) ??
      (await storage.findRecentByDedupeHash(dedupeHash(lead), DEDUPE_WINDOW_MINUTES));
    if (existing) {
      log("duplicate");
      return ok(existing, true);
    }

    const captcha = await deps.verifyTurnstile(
      lead.turnstileToken,
      input.remoteIp,
      lead.idempotencyKey,
    );
    if (captcha === "failed") {
      log("captcha_failed");
      return { status: 403, body: { ok: false, error: "captcha_failed" } };
    }
    if (captcha === "unavailable") {
      log("captcha_unavailable");
      return { status: 503, body: { ok: false, error: "captcha_unavailable" } };
    }

    const { lead: stored, created } = await storage.insert(toNewLead(lead, now()));
    if (created) deps.notify(stored);
    return ok(stored, !created);
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      log("storage_unavailable");
      return { status: 503, body: { ok: false, error: "storage_unavailable" } };
    }
    log("unexpected_error", { name: error instanceof Error ? error.name : "unknown" });
    // Anything unexpected is most likely the database; never claim success.
    return { status: 500, body: { ok: false, error: "server_error" } };
  }
}
