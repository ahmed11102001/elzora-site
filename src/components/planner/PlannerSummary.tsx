import type { Locale } from "@/i18n/config";
import { budgetLabel, countryName, formatDay, formatMonth } from "@/lib/leads/format";
import { INTERESTS, type Season } from "@/lib/leads/options";
import type { PlannerDraft, StepId } from "./state";
import type { PlannerCopy } from "./steps/types";

type PlannerSummaryProps = {
  copy: PlannerCopy;
  locale: Locale;
  draft: PlannerDraft;
  onEdit: (step: StepId) => void;
};

function datesText(copy: PlannerCopy, locale: Locale, draft: PlannerDraft): string {
  const t = copy.review.dates;
  if (draft.dateMode === "specific")
    return t.range
      .replace("{arrival}", formatDay(draft.arrival, locale))
      .replace("{departure}", formatDay(draft.departure, locale));
  if (draft.dateMode === "flexible") {
    const when = draft.flexibleWhen;
    if (when.startsWith("month:"))
      return t.flexibleMonth.replace("{month}", formatMonth(when.slice(6), locale));
    if (when.startsWith("season:"))
      return t.flexibleSeason.replace(
        "{season}",
        copy.when.seasons[when.slice(7) as Season] ?? when,
      );
    return t.flexibleAny;
  }
  return t.undecided;
}

function travellersText(copy: PlannerCopy, draft: PlannerDraft): string {
  const w = copy.who;
  const adults =
    draft.adults === 1 ? w.adultsOne : w.adultsMany.replace("{count}", String(draft.adults));
  if (draft.children === 0) return adults;
  const children =
    draft.children === 1
      ? w.childrenOne
      : w.childrenMany.replace("{count}", String(draft.children));
  return `${adults}, ${children} (${w.ages.replace("{ages}", draft.childrenAges.join(", "))})`;
}

export function PlannerSummary({ copy, locale, draft, onEdit }: PlannerSummaryProps) {
  const rows: { step: StepId; label: string; value: React.ReactNode }[] = [
    { step: "when", label: copy.review.labels.when, value: datesText(copy, locale, draft) },
    { step: "who", label: copy.review.labels.who, value: travellersText(copy, draft) },
    {
      step: "experience",
      label: copy.review.labels.experience,
      value: INTERESTS.filter((i) => draft.interests.includes(i))
        .map((i) => copy.experience.options[i].title)
        .join(", "),
    },
    {
      step: "duration",
      label: copy.review.labels.duration,
      value: draft.duration ? copy.duration.options[draft.duration] : "",
    },
    {
      step: "budget",
      label: copy.review.labels.budget,
      value: draft.budget ? budgetLabel(draft.budget, locale, copy.budget.templates) : "",
    },
    {
      step: "contact",
      label: copy.review.labels.contact,
      value: (
        <>
          {draft.fullName}
          <br />
          {draft.email}
          <br />
          {countryName(draft.country, locale)}
          <br />
          {draft.phone || <span className="text-sand/55">{copy.common.notProvided}</span>}
          {draft.notes && (
            <span className="mt-2 block whitespace-pre-line text-sand/75">{draft.notes}</span>
          )}
        </>
      ),
    },
  ];

  return (
    <dl className="divide-y divide-sand/10 rounded-2xl border border-sand/15 bg-ink-deep/40">
      {rows.map((row) => (
        <div key={row.step} className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <dt className="text-xs tracking-[0.2em] text-gold uppercase">{row.label}</dt>
            <dd className="mt-1 text-base break-words">{row.value}</dd>
          </div>
          <button
            type="button"
            onClick={() => onEdit(row.step)}
            aria-label={`${copy.common.change}: ${row.label}`}
            className="-my-1 min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-sand/80 underline decoration-gold/60 underline-offset-4 transition-colors hover:text-gold"
          >
            {copy.common.change}
          </button>
        </div>
      ))}
    </dl>
  );
}
