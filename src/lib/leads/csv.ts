import type { StoredLead } from "./types";

// CSV export for the team. Every cell is quoted, values that a spreadsheet could execute as a formula
// are defused, and the file starts with a UTF-8 BOM so Excel shows German characters correctly.

/** OWASP CSV-injection guard: prefix cells that start with = + - @ (also after tab/CR/space) with '. */
export function escapeCsvCell(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) text = "";
  else if (value instanceof Date) text = value.toISOString();
  else if (Array.isArray(value)) text = value.join("; ");
  else text = String(value);

  if (/^[\t\r ]*[=+\-@]/.test(text) || /^[\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const day = (value?: string) => value ?? "";

export const CSV_COLUMNS: { header: string; value: (lead: StoredLead) => unknown }[] = [
  { header: "reference_code", value: (l) => l.referenceCode },
  { header: "status", value: (l) => l.status },
  { header: "first_contacted_at", value: (l) => l.firstContactedAt },
  { header: "created_at", value: (l) => l.createdAt },
  { header: "locale", value: (l) => l.locale },
  { header: "full_name", value: (l) => l.fullName },
  { header: "email", value: (l) => l.email },
  { header: "country", value: (l) => l.country },
  { header: "phone", value: (l) => l.phone },
  { header: "date_flexibility", value: (l) => l.dateFlexibility },
  { header: "arrival_date", value: (l) => day(l.arrivalDate) },
  { header: "departure_date", value: (l) => day(l.departureDate) },
  { header: "flexible_when", value: (l) => l.flexibleWhen },
  { header: "travelers", value: (l) => l.adults + l.children },
  { header: "adults", value: (l) => l.adults },
  { header: "children", value: (l) => l.children },
  { header: "children_ages", value: (l) => l.childrenAges },
  { header: "interests", value: (l) => l.interests },
  { header: "duration", value: (l) => l.duration },
  { header: "budget", value: (l) => l.budget },
  { header: "budget_type", value: (l) => l.budgetType },
  { header: "notes", value: (l) => l.notes },
  { header: "source", value: (l) => l.source },
  { header: "landing_page", value: (l) => l.landingPage },
  { header: "utm_source", value: (l) => l.utmSource },
  { header: "utm_medium", value: (l) => l.utmMedium },
  { header: "utm_campaign", value: (l) => l.utmCampaign },
  { header: "utm_content", value: (l) => l.utmContent },
  { header: "utm_term", value: (l) => l.utmTerm },
  { header: "referrer", value: (l) => l.referrer },
  { header: "trip_slug", value: (l) => l.tripSlug },
  { header: "consent_version", value: (l) => l.consentVersion },
  { header: "consented_at", value: (l) => l.consentedAt },
  { header: "team_notified_at", value: (l) => l.teamNotifiedAt },
  { header: "traveler_notified_at", value: (l) => l.travelerNotifiedAt },
];

export function leadsToCsv(leads: StoredLead[]): string {
  const rows = [
    CSV_COLUMNS.map((column) => escapeCsvCell(column.header)).join(","),
    ...leads.map((lead) =>
      CSV_COLUMNS.map((column) => escapeCsvCell(column.value(lead))).join(","),
    ),
  ];
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}
