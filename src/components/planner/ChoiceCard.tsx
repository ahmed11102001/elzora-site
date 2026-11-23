import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type ChoiceCardProps = {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  text?: string;
  className?: string;
};

// A selectable card built on a real radio/checkbox: keyboard (arrows, space), grouping and screen
// reader state come from the browser. The input is visually hidden but stays focusable.
export function ChoiceCard({
  type,
  name,
  value,
  checked,
  onChange,
  title,
  text,
  className,
}: ChoiceCardProps) {
  return (
    <label className={cn("group relative block cursor-pointer", className)}>
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex min-h-16 items-center gap-4 rounded-2xl border px-4 py-3.5 transition-colors duration-200 sm:px-5",
          "border-fg/20 bg-card group-hover:border-accent/60 group-hover:bg-card",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent",
          "peer-checked:border-accent peer-checked:bg-accent/10",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base leading-snug font-semibold sm:text-lg">{title}</span>
          {text && <span className="mt-0.5 block text-sm text-fg/70">{text}</span>}
        </span>
        <span
          aria-hidden
          className={cn(
            "grid size-6 shrink-0 place-items-center border transition-colors duration-200",
            type === "radio" ? "rounded-full" : "rounded-md",
            checked ? "border-accent bg-accent text-on-accent" : "border-fg/35 text-transparent",
          )}
        >
          <Check className="size-4" />
        </span>
      </span>
    </label>
  );
}
