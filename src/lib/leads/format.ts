import type { Locale } from "@/i18n/config";
import { BUDGET_BOUNDS, COUNTRY_CODES, type Budget } from "./options";

// Locale-aware formatting for the planner (labels, summary, emails).

const intlLocale = (locale: Locale) => (locale === "de" ? "de-DE" : "en-GB");

export type BudgetTemplates = { under: string; range: string; over: string; unsure: string };

export function budgetLabel(budget: Budget, locale: Locale, t: BudgetTemplates): string {
  const money = new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const { min, max } = BUDGET_BOUNDS[budget];
  if (min === undefined && max === undefined) return t.unsure;
  if (min === undefined) return t.under.replace("{max}", money.format(max!));
  if (max === undefined) return t.over.replace("{min}", money.format(min));
  return t.range.replace("{min}", money.format(min)).replace("{max}", money.format(max));
}

/** "2027-03-14" -> "14 March 2027" / "14. März 2027". Parsed and formatted in UTC: no timezone drift. */
export function formatDay(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** "2027-03" -> "March 2027" / "März 2027". */
export function formatMonth(yearMonth: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${yearMonth}-01T00:00:00Z`));
}

export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([intlLocale(locale)], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Countries sorted by their localized name. */
export function countryOptions(locale: Locale): { code: string; name: string }[] {
  const collator = new Intl.Collator(intlLocale(locale));
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) =>
    collator.compare(a.name, b.name),
  );
}
