import { cn } from "@/lib/utils";
import { Container } from "./Container";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  /** default: page background · sand: warm alternate band · deep: dark indigo band (light text) */
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
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-24",
        tone === "sand" && "bg-surface-2",
        tone === "deep" && "dark-zone bg-surface",
        className,
      )}
    >
      <Container>
        {(eyebrow || title || description) && (
          <header className="mb-10 max-w-2xl">
            {eyebrow && (
              <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-accent uppercase">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
                {title}
              </h2>
            )}
            {description && <p className="mt-4 text-lg text-fg/80">{description}</p>}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
