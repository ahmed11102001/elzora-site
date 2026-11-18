import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { Card, CardBody } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Container } from "@/components/ui/Container";
import { Photo } from "@/components/ui/Photo";
import { stationText } from "./copy";
import { stations } from "./stations";

// The journey without animation: every station as a card, in order. It is server-rendered, so the
// text is in the HTML for search engines and no-JavaScript visitors, and it is what visitors with
// reduced motion, Save-Data, a slow connection or a low-memory device see.
export function StaticJourney({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.journey;

  return (
    <Container className="pb-20">
      <ol className="grid gap-8 md:grid-cols-2">
        {stations.map((station) => {
          const s = stationText(t, station.id, lang);
          // The first extra of Alexandria is just a second photo of the same place.
          const extras = station.id === "alexandria" ? [] : s.extras;
          return (
            <li key={station.id} className="md:last:col-span-2">
              <Card className="h-full">
                <div className="aspect-[16/9]">
                  <Photo
                    id={station.image}
                    alt=""
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="h-full"
                    imgStyle={{ objectPosition: station.objectPosition }}
                  />
                </div>
                <CardBody className="space-y-3">
                  <p className="text-xs font-semibold tracking-[0.3em] text-gold uppercase">
                    {s.eyebrow}
                  </p>
                  <h3 className="font-display text-3xl font-semibold">{s.title}</h3>
                  <p className="text-sand/80">{s.text}</p>
                  {s.facts.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {s.facts.map((fact) => (
                        <li key={fact}>
                          <Chip>{fact}</Chip>
                        </li>
                      ))}
                    </ul>
                  )}
                  {extras.length > 0 && (
                    <ul className="space-y-3 border-t border-sand/10 pt-4">
                      {extras.map((extra) => (
                        <li key={extra.title} className="flex items-center gap-3">
                          <Photo
                            id={extra.image}
                            alt={extra.alt}
                            sizes="72px"
                            className="size-16 shrink-0 rounded-lg"
                          />
                          <div>
                            <p className="font-display text-lg font-semibold text-gold">
                              {extra.title}
                            </p>
                            <p className="text-sm text-sand/75">{extra.text}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            </li>
          );
        })}
      </ol>
    </Container>
  );
}
