import { cn } from "@/lib/utils";

type PlannerProgressProps = {
  label: string;
  /** Localized "Step {current} of {total}". */
  stepText: string;
  stepName: string;
  current: number; // zero-based
  total: number;
};

// Restrained progress indicator: one line of text and a thin segmented bar. Segments do not
// shrink below a readable size on a 320px phone, unlike a row of numbered circles.
export function PlannerProgress({
  label,
  stepText,
  stepName,
  current,
  total,
}: PlannerProgressProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-valuetext={`${stepText}: ${stepName}`}
    >
      <p className="mb-3 flex items-baseline justify-between gap-3 text-xs tracking-[0.2em] uppercase">
        <span className="text-gold">{stepText}</span>
        <span className="truncate text-sand/60">{stepName}</span>
      </p>
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-0.5 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
              i <= current ? "bg-gold" : "bg-sand/20",
            )}
          />
        ))}
      </div>
    </div>
  );
}
