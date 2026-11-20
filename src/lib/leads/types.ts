import type { Locale } from "@/i18n/config";
import type { Budget, DateMode, Duration, Interest } from "./options";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "converted",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** What the API hands to storage. Everything is already validated and normalised. */
export type NewLead = {
  idempotencyKey: string;
  dedupeHash: string;
  locale: Locale;
  fullName: string;
  email: string;
  country: string;
  phone?: string;
  dateFlexibility: DateMode;
  arrivalDate?: string;
  departureDate?: string;
  flexibleWhen?: string;
  adults: number;
  children: number;
  childrenAges: number[];
  interests: Interest[];
  duration: Duration;
  budget: Budget;
  budgetType: "per_person";
  notes?: string;
  source?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  /** Slug of the trip the traveler came from (the planner link carries ?trip=<slug>). */
  tripSlug?: string;
  consentVersion: string;
  consentedAt: Date;
};

export type StoredLead = NewLead & {
  id: string;
  referenceCode: string;
  status: LeadStatus;
  /** Set by the database when the slug matches a trip translation; the slug itself is kept either way. */
  tripId: string | null;
  firstContactedAt: Date | null;
  teamNotifiedAt: Date | null;
  travelerNotifiedAt: Date | null;
  notificationAttempts: number;
  createdAt: Date;
  updatedAt: Date;
};

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/** Everything the submission flow needs from the database. */
export interface LeadStorage {
  findByIdempotencyKey(key: string): Promise<StoredLead | null>;
  findRecentByDedupeHash(hash: string, withinMinutes: number): Promise<StoredLead | null>;
  /** Inserts the lead, or returns the existing one when the idempotency key was already used. */
  insert(lead: NewLead): Promise<{ lead: StoredLead; created: boolean }>;
  hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
  recordNotification(
    id: string,
    kind: "team" | "traveler",
    outcome: { ok: true } | { ok: false; reason: string },
  ): Promise<void>;
  listPendingNotifications(limit: number): Promise<StoredLead[]>;
  listForExport(limit: number): Promise<StoredLead[]>;
}

export class StorageUnavailableError extends Error {
  constructor(message = "Lead storage is not available") {
    super(message);
    this.name = "StorageUnavailableError";
  }
}
