import { cn } from "@/lib/utils";

// Placeholder block for content that comes from the CMS. Not used for the journey section.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-sand/10 motion-reduce:animate-none", className)}
    />
  );
}
