import { cn } from "@/lib/utils";
import { Check } from "./icons";

// Progress indicator for multi-step flows (trip planner). `current` is zero-based.
export function Stepper({
  steps,
  current,
  label,
}: {
  steps: string[];
  current: number;
  label: string;
}) {
  return (
    <nav aria-label={label}>
      <ol className="flex items-center gap-2">
        {steps.map((step, i) => (
          <li
            key={step}
            aria-current={i === current ? "step" : undefined}
            className={cn("flex items-center gap-2", i < steps.length - 1 && "flex-1")}
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                i < current && "bg-gold text-ink",
                i === current && "border-2 border-gold text-gold",
                i > current && "border border-sand/30 text-sand/60",
              )}
            >
              {i < current ? <Check className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                i === current ? "text-sand" : "text-sand/60",
                "sr-only sm:not-sr-only",
              )}
            >
              {step}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="h-px flex-1 bg-sand/20" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
