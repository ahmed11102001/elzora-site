import { cn } from "@/lib/utils";
import { Container } from "./Container";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  /** default: page background · deep: darker band · sand: light band (dark text) */
  tone?: "default" | "deep" | "sand";
  className?: string;
  children?: React.ReactNode;
};

export function Section({
  id,
  eyebrow,
  title,
  description,
  tone = "default",
  className,
  children,
}: SectionProps) {
  const light = tone === "sand";
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-24",
        tone === "deep" && "bg-ink-deep",
        light && "bg-sand text-ink",
        className,
      )}
    >
      <Container>
        {(eyebrow || title || description) && (
          <header className="mb-10 max-w-2xl">
            {eyebrow && (
              <p
                className={cn(
                  "mb-3 text-xs font-semibold tracking-[0.3em] uppercase",
                  light ? "text-ink/70" : "text-gold",
                )}
              >
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
                {title}
              </h2>
            )}
            {description && (
              <p className={cn("mt-4 text-lg", light ? "text-ink/80" : "text-sand/80")}>
                {description}
              </p>
            )}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
