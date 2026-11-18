import type { Dictionary } from "@/i18n/dictionaries";
import { siteName } from "@/lib/site";
import { Container } from "@/components/ui/Container";

export function Footer({ dict }: { dict: Dictionary }) {
  return (
    <footer className="border-t border-sand/10 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <Container className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-xl font-semibold tracking-[0.18em] text-sand">{siteName}</p>
        <p className="text-sand/70">{dict.footer.tagline}</p>
        <p className="text-sand/50">
          © {siteName}. {dict.footer.rights}
        </p>
      </Container>
    </footer>
  );
}
