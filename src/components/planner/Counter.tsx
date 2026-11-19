import { cn } from "@/lib/utils";

type CounterProps = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  lessLabel: string;
  moreLabel: string;
  className?: string;
};

// Stepper for small whole numbers. 48px buttons, value announced politely, no typing needed.
export function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  lessLabel,
  moreLabel,
  className,
}: CounterProps) {
  const button =
    "grid size-12 place-items-center rounded-full border border-sand/30 text-2xl leading-none transition-colors hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-sand/30 disabled:hover:text-sand";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl border border-sand/20 bg-ink-deep/40 px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-semibold sm:text-lg">{label}</p>
        {hint && <p className="text-sm text-sand/65">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={button}
          aria-label={lessLabel}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <span aria-hidden>−</span>
        </button>
        <output
          aria-live="polite"
          className="w-8 text-center font-display text-3xl font-semibold tabular-nums"
        >
          {value}
        </output>
        <button
          type="button"
          className={button}
          aria-label={moreLabel}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <span aria-hidden>+</span>
        </button>
      </div>
    </div>
  );
}
