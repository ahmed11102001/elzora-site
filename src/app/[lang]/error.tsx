"use client";

import { usePathname } from "next/navigation";
import { defaultLocale, hasLocale } from "@/i18n/config";
import { errorStrings } from "@/i18n/errors";
import { Container } from "@/components/ui/Container";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const segment = usePathname().split("/")[1] ?? "";
  const strings = errorStrings[hasLocale(segment) ? segment : defaultLocale];

  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center gap-5 py-24">
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">{strings.title}</h1>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-gold px-6 py-3 font-semibold text-ink transition-colors hover:bg-sand"
      >
        {strings.retry}
      </button>
    </Container>
  );
}
