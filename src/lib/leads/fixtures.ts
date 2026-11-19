// Shared test fixtures (not imported by application code).
import type { LeadInput, ValidLead } from "./schema";
import type { LeadStorage, NewLead, StoredLead } from "./types";

export const NOW = new Date("2026-11-19T10:00:00.000Z");
export const KEY = "5b0f3a6e-8f2a-4c1d-9a55-0a5c3d1e7b11";

export const validInput = (over: Record<string, unknown> = {}): LeadInput =>
  ({
    locale: "de",
    dateMode: "specific",
    arrival: "2027-03-01",
    departure: "2027-03-10",
    adults: 2,
    children: 1,
    childrenAges: [7],
    interests: ["nile", "history"],
    duration: "6-8",
    budget: "1500-2500",
    fullName: "Anna Müller",
    email: "Anna@Example.de ",
    country: "de",
    phone: "+49 170 1234567",
    notes: "Wir reisen gern ruhig.",
    consent: true,
    attribution: {
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "de-winter",
      source: "google",
    },
    idempotencyKey: KEY,
    ...over,
  }) as LeadInput;

export function fakeStorage(overrides: Partial<LeadStorage> = {}) {
  const leads: StoredLead[] = [];
  const calls = { insert: 0, hit: 0 };
  const storage: LeadStorage = {
    async findByIdempotencyKey(key) {
      return leads.find((l) => l.idempotencyKey === key) ?? null;
    },
    async findRecentByDedupeHash(hash) {
      return leads.find((l) => l.dedupeHash === hash) ?? null;
    },
    async insert(lead: NewLead) {
      calls.insert++;
      const stored: StoredLead = {
        ...lead,
        id: `id-${leads.length + 1}`,
        referenceCode: `EZ-TEST-000${leads.length + 1}`,
        status: "new",
        teamNotifiedAt: null,
        travelerNotifiedAt: null,
        notificationAttempts: 0,
        createdAt: NOW,
        updatedAt: NOW,
      };
      leads.push(stored);
      return { lead: stored, created: true };
    },
    async hit() {
      calls.hit++;
      return { allowed: true, retryAfterSeconds: 0 };
    },
    async recordNotification() {},
    async listPendingNotifications() {
      return [];
    },
    async listForExport() {
      return leads;
    },
    ...overrides,
  };
  return { storage, leads, calls };
}

/** Maps a validated lead to storage input (test helper). */
export const toNew = (lead: ValidLead): NewLead => ({
  idempotencyKey: lead.idempotencyKey,
  dedupeHash: "h",
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
  budgetType: "per_person",
  notes: lead.notes,
  source: lead.attribution.source,
  utmSource: lead.attribution.utmSource,
  utmMedium: lead.attribution.utmMedium,
  utmCampaign: lead.attribution.utmCampaign,
  consentVersion: "v",
  consentedAt: new Date("2026-11-19T10:00:00Z"),
});
