import type { Dictionary } from "@/i18n/dictionaries";
import { Container } from "@/components/ui/Container";
import { EgyptMapOutline } from "./EgyptMapOutline";
import { stationPositions } from "./map-data";

// First screen of the journey section: title + route map. It is both the placeholder shown while the
// animated version loads. The animated stage starts on the same picture, so the swap is hardly visible.
export function JourneyIntro({ dict }: { dict: Dictionary }) {
  const t = dict.journey;
  const stations = (Object.keys(stationPositions) as (keyof typeof stationPositions)[]).map(
    (id) => ({
      id,
      ...stationPositions[id],
      label: t.stations[id],
    }),
  );

  return (
    <Container className="flex min-h-svh flex-col items-center justify-center gap-8 py-16 text-center">
      <div>
        <h2 id="journey-title" className="font-display text-4xl font-semibold sm:text-5xl">
          {t.title}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-fg/80">{t.subtitle}</p>
      </div>
      <EgyptMapOutline label={t.mapLabel} stations={stations} className="max-h-[60svh] max-w-lg" />
    </Container>
  );
}
