import { cn } from "@/lib/utils";

// Form controls for the trip editor. Same look as TextField in primitives.tsx, kept in their own file
// so the 7.4A primitives stay untouched. All are controlled by the editor (value + onChange).

const control =
  "w-full rounded-lg border bg-white px-4 text-base text-ink transition-colors outline-none " +
  "focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-gold/60";

type Common = { id: string; label: string; hint?: string; error?: string; counter?: string };

function Frame({
  id,
  label,
  hint,
  error,
  counter,
  children,
}: Common & { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-semibold text-ink">
          {label}
        </label>
        {counter && <span className="text-xs text-ink/55 tabular-nums">{counter}</span>}
      </div>
      {children}
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

const describedBy = (id: string, hint?: string, error?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function InputField({
  id,
  label,
  hint,
  error,
  counter,
  ...props
}: Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id">) {
  return (
    <Frame id={id} label={label} hint={hint} error={error} counter={counter}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "min-h-12", error ? "border-red-600" : "border-ink/25")}
        {...props}
      />
    </Frame>
  );
}

export function AreaField({
  id,
  label,
  hint,
  error,
  counter,
  ...props
}: Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id">) {
  return (
    <Frame id={id} label={label} hint={hint} error={error} counter={counter}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "min-h-24 py-3", error ? "border-red-600" : "border-ink/25")}
        {...props}
      />
    </Frame>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  children,
  ...props
}: Common & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id">) {
  return (
    <Frame id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(control, "min-h-12", error ? "border-red-600" : "border-ink/25")}
        {...props}
      >
        {children}
      </select>
    </Frame>
  );
}

export function CheckField({
  id,
  label,
  hint,
  ...props
}: { id: string; label: string; hint?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
>) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-5 shrink-0 accent-[#0B1F3A]"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      />
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-ink/60">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
