import Link from "next/link";
import type { TripFilter } from "@/content/trips-public";
import { DURATION_FILTERS } from "@/content/trips-public";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { routePath } from "@/lib/routes";

type Option = { value: string; label: string };
type Props = {
  lang: Locale;
  dict: Dictionary;
  filter: TripFilter;
  styles: Option[];
  destinations: Option[];
  budgets: Option[];
};

const selectClass =
  "w-full rounded-xl border border-fg/25 bg-surface px-3 py-2.5 text-fg focus:border-accent";

// A plain GET form: it works without JavaScript and every filtered view is a shareable address.
export function TripFilters({ lang, dict, filter, styles, destinations, budgets }: Props) {
  const f = dict.trips.list.filters;
  const fields: { name: keyof TripFilter; label: string; options: Option[] }[] = [
    { name: "style", label: f.style, options: styles },
    {
      name: "duration",
      label: f.duration,
      options: DURATION_FILTERS.map((value) => ({ value, label: f.durations[value] })),
    },
    { name: "budget", label: f.budget, options: budgets },
    { name: "destination", label: f.destination, options: destinations },
  ];
  const active = Object.values(filter).some(Boolean);

  return (
    <form
      method="get"
      action={routePath(lang, "trips")}
      aria-label={f.label}
      className="grid gap-4 rounded-2xl border border-fg/10 p-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {fields.map(({ name, label, options }) =>
        options.length > 0 ? (
          <label key={name} className="grid gap-1.5 text-sm font-medium">
            {label}
            <select name={name} defaultValue={filter[name] ?? ""} className={selectClass}>
              <option value="">{f.all}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null,
      )}
      <div className="flex items-end gap-4 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-full bg-accent px-6 py-2.5 font-semibold text-on-accent hover:bg-accent-strong"
        >
          {f.apply}
        </button>
        {active && (
          <Link
            href={routePath(lang, "trips")}
            className="text-sm text-fg/80 underline hover:text-accent"
          >
            {f.clear}
          </Link>
        )}
      </div>
    </form>
  );
}
