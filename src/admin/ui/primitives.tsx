import { cn } from "@/lib/utils";

// Small building blocks for the dashboard. Deliberately separate from the public components so the
// dashboard can be extracted into its own app later without dragging the website along.

export const buttonClass = (variant: "primary" | "ghost" | "danger" = "primary") =>
  cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-ink text-sand hover:bg-ink-deep",
    variant === "ghost" && "border border-ink/20 bg-white text-ink hover:border-ink/40",
    variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
  );

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink/65">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "soon";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-ink/10 text-ink",
        tone === "ok" && "bg-emerald-100 text-emerald-800",
        tone === "warn" && "bg-amber-100 text-amber-900",
        tone === "soon" && "bg-gold/25 text-ink",
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card className="border-dashed text-center">
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-xl text-sm text-ink/65">{children}</div>}
    </Card>
  );
}

export function TextField({
  label,
  error,
  hint,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          "min-h-12 w-full rounded-lg border bg-white px-4 text-base text-ink transition-colors outline-none",
          "focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-gold/60",
          error ? "border-red-600" : "border-ink/25",
        )}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
