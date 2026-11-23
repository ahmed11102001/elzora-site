import type { Locale } from "@/i18n/config";
import { formatDay, formatMonth } from "./format";
import type { StoredLead } from "./types";

// Email templates: table-based HTML with inline styles (works in Gmail, Outlook and Apple Mail,
// stacks on phones) plus a plain-text alternative. EVERY dynamic value goes through esc().

export type Email = { subject: string; html: string; text: string };

export type TravelerEmailCopy = {
  subject: string; // {reference}
  preheader: string;
  greeting: string; // {name}
  heading: string;
  intro: string;
  referenceLabel: string;
  nextTitle: string;
  next: string[];
  note: string;
  whatsapp: string;
  whatsappMessage: string; // {reference}
  signoff: string;
  footer: string;
};

const BRAND = "ELZORA";
const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const fill = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));

/** Strips line breaks so a value can never add headers or break a subject line. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

function shell(opts: {
  lang: string;
  preheader: string;
  title: string;
  body: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="${esc(opts.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F3E9D7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3E9D7;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:#0B1F3A;padding:24px 32px;text-align:center;">
      <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:5px;color:#F3E9D7;">${BRAND}</span>
    </td></tr>
    <tr><td style="height:3px;background:#C9A24B;line-height:3px;font-size:3px;">&nbsp;</td></tr>
    <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0B1F3A;">
      ${opts.body}
    </td></tr>
    <tr><td style="padding:20px 32px;background:#faf6ee;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6b7280;text-align:center;">
      ${esc(opts.footer)}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export function renderTravelerEmail(
  lead: Pick<StoredLead, "fullName" | "referenceCode" | "locale">,
  copy: TravelerEmailCopy,
  whatsappUrl: string | null,
): Email {
  const name = lead.fullName;
  const reference = lead.referenceCode;
  const vars = { name, reference };
  const next = copy.next.map((item) => `<li style="margin:0 0 8px 0;">${esc(item)}</li>`).join("");
  const whatsapp = whatsappUrl
    ? `<p style="margin:24px 0 0 0;"><a href="${esc(whatsappUrl)}" style="color:#0B1F3A;font-weight:bold;">${esc(copy.whatsapp)}</a></p>`
    : "";

  const body = `
      <p style="margin:0 0 16px 0;">${esc(fill(copy.greeting, vars))}</p>
      <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:600;">${esc(copy.heading)}</h1>
      <p style="margin:0 0 24px 0;">${esc(copy.intro)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;"><tr><td style="background:#F3E9D7;border-left:4px solid #C9A24B;padding:16px 20px;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6b5b2e;">${esc(copy.referenceLabel)}</div>
        <div style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:2px;">${esc(reference)}</div>
      </td></tr></table>
      <h2 style="margin:0 0 8px 0;font-size:16px;">${esc(copy.nextTitle)}</h2>
      <ol style="margin:0 0 16px 0;padding-left:20px;">${next}</ol>
      <p style="margin:0 0 0 0;color:#4b5563;">${esc(copy.note)}</p>
      ${whatsapp}
      <p style="margin:24px 0 0 0;">${esc(copy.signoff)}<br><strong>${BRAND}</strong></p>`;

  const text = [
    fill(copy.greeting, vars),
    "",
    copy.heading,
    copy.intro,
    "",
    `${copy.referenceLabel}: ${reference}`,
    "",
    copy.nextTitle,
    ...copy.next.map((item, i) => `${i + 1}. ${item}`),
    "",
    copy.note,
    ...(whatsappUrl ? ["", `${copy.whatsapp}: ${whatsappUrl}`] : []),
    "",
    copy.signoff,
    BRAND,
  ].join("\n");

  return {
    subject: oneLine(fill(copy.subject, vars)),
    html: shell({
      lang: lead.locale,
      preheader: fill(copy.preheader, vars),
      title: copy.heading,
      body,
      footer: copy.footer,
    }),
    text,
  };
}

// ---- Team notification (internal, English) ----

const INTEREST_LABELS: Record<string, string> = {
  history: "Ancient Egypt & History",
  nile: "Nile Cruise",
  redsea: "Red Sea & Beaches",
  desert: "Desert & Adventure",
  culture: "Culture & Local Experiences",
  family: "Family Holiday",
  romantic: "Romantic Escape",
  everything: "A bit of everything",
};

function dates(lead: StoredLead, locale: Locale = "en"): string {
  if (lead.dateFlexibility === "specific" && lead.arrivalDate && lead.departureDate)
    return `${formatDay(lead.arrivalDate, locale)} to ${formatDay(lead.departureDate, locale)}`;
  if (lead.dateFlexibility === "flexible") {
    const when = lead.flexibleWhen ?? "any";
    if (when.startsWith("month:")) return `Flexible, around ${formatMonth(when.slice(6), locale)}`;
    if (when.startsWith("season:")) return `Flexible, preferred season: ${when.slice(7)}`;
    return "Flexible, any time of year";
  }
  return "Not decided yet";
}

export function renderTeamEmail(lead: StoredLead): Email {
  const travelers =
    lead.children > 0
      ? `${lead.adults} adults, ${lead.children} children (ages ${lead.childrenAges.join(", ")})`
      : `${lead.adults} adults`;
  const rows: [string, string][] = [
    ["Reference", lead.referenceCode],
    ["Name", lead.fullName],
    ["Email", lead.email],
    ["Phone / WhatsApp", lead.phone ?? "-"],
    ["Country", lead.country],
    ["Language", lead.locale.toUpperCase()],
    ["Dates", dates(lead)],
    ["Travelers", travelers],
    ["Interests", lead.interests.map((i) => INTEREST_LABELS[i] ?? i).join(", ")],
    ["Duration", lead.duration === "unsure" ? "Not sure yet" : `${lead.duration} days`],
    ["Budget (EUR, per person)", lead.budget === "unsure" ? "Not sure yet" : lead.budget],
    ["Notes", lead.notes ?? "-"],
    ["Source", lead.source ?? "-"],
    ["UTM source / medium", [lead.utmSource, lead.utmMedium].filter(Boolean).join(" / ") || "-"],
    ["UTM campaign", lead.utmCampaign ?? "-"],
    ["UTM content / term", [lead.utmContent, lead.utmTerm].filter(Boolean).join(" / ") || "-"],
    [
      "Ad click ID",
      [lead.gclid && "Google Ads", lead.fbclid && "Meta"].filter(Boolean).join(" + ") || "-",
    ],
    ["Landing page", lead.landingPage ?? "-"],
    ["Referrer", lead.referrer ?? "-"],
    ["Consent", `${lead.consentVersion} at ${lead.consentedAt.toISOString()}`],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#6b7280;width:38%;vertical-align:top;">${esc(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#0B1F3A;white-space:pre-wrap;">${esc(value)}</td></tr>`,
    )
    .join("");

  const body = `
      <p style="margin:0 0 8px 0;display:inline-block;background:#C9A24B;color:#0B1F3A;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;border-radius:999px;">New inquiry</p>
      <h1 style="margin:8px 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;">New trip inquiry ${esc(lead.referenceCode)}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;">${tableRows}</table>
      <p style="margin:16px 0 0 0;font-size:13px;color:#6b7280;">Reply to this email to answer the traveler directly.</p>`;

  return {
    subject: oneLine(
      `New inquiry ${lead.referenceCode} · ${lead.country} · ${lead.adults + lead.children} travelers · ${dates(lead)}`,
    ),
    html: shell({
      lang: "en",
      preheader: `New trip inquiry ${lead.referenceCode}`,
      title: `New trip inquiry ${lead.referenceCode}`,
      body,
      footer: "Internal notification from the ELZORA trip planner.",
    }),
    text: ["NEW INQUIRY", "", ...rows.map(([label, value]) => `${label}: ${value}`)].join("\n"),
  };
}
