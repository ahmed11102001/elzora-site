import { cn } from "@/lib/utils";

export function Chip({
  tone = "gold",
  className,
  children,
}: {
  tone?: "gold" | "neutral";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        tone === "gold" ? "border-gold/50 text-gold" : "border-sand/25 text-sand/80",
        className,
      )}
    >
      {children}
    </span>
  );
}
