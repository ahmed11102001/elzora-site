import type { Ref } from "react";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { CLIPS } from "./clips";
import { stationText, type JourneyCopy } from "./copy";
import { EGYPT_PATH, MAP_VIEWBOX, NILE_BRANCHES, NILE_MAIN, stationPositions } from "./map-data";
import { stations, type StationConfig } from "./stations";

export type StageProps = {
  lang: Locale;
  copy: JourneyCopy;
  variant: "desktop" | "mobile";
  /** Photos are only mounted for stations up to this index, so images load one station ahead. */
  mountedUpTo: number;
  railIndex: number;
  onRail: (stationIndex: number) => void;
  onSkip: () => void;
  stageRef?: Ref<HTMLDivElement>;
  format: (n: number, decimals: number) => string;
};

const glass =
  "border-gold/45 bg-ink/80 rounded-2xl border backdrop-blur group-data-[variant=mobile]/stage:backdrop-blur-none";
const shadow = "[text-shadow:0_2px_24px_rgba(5,13,26,.85)]";
const eyebrowClass = "text-gold text-xs font-semibold tracking-[0.3em] uppercase";
const leftEdge = "left-[clamp(16px,5vw,64px)]";
const rightEdge = "right-[clamp(16px,5vw,64px)]";
const cardBottom = "bottom-[calc(72px+env(safe-area-inset-bottom,0px))]";

function Scene({ station, mounted }: { station: StationConfig; mounted: boolean }) {
  return (
    <div
      data-scene={station.id}
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      style={{ clipPath: CLIPS[station.reveal].from }}
    >
      <div data-motion className="absolute -inset-[3%] will-change-transform">
        {mounted && (
          <Photo
            id={station.image}
            alt=""
            eager
            sizes="100vw"
            className="h-full"
            imgStyle={{ objectPosition: station.objectPosition }}
          />
        )}
      </div>
      <div
        data-warm
        className="absolute inset-0 bg-gradient-to-b from-[#d98a5b]/10 to-[#f6c667]/75 opacity-0 mix-blend-soft-light"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,13,26,.6),transparent_26%),linear-gradient(to_top,rgba(5,13,26,.78),transparent_42%)]" />
    </div>
  );
}

function Explain({
  station,
  props,
  mounted,
}: {
  station: StationConfig;
  props: StageProps;
  mounted: boolean;
}) {
  const t = stationText(props.copy, station.id, props.lang);
  const header = (
    <>
      <p className={eyebrowClass}>{t.eyebrow}</p>
      <h3
        className={`mt-2 font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] font-semibold ${shadow}`}
      >
        {t.title}
      </h3>
    </>
  );

  switch (station.explain) {
    case "editorial": {
      const photo = t.extras[0];
      return (
        <div data-ex={station.id}>
          <article
            data-part="card"
            className={`absolute z-10 w-[min(560px,calc(100vw-32px))] opacity-0 ${cardBottom} ${leftEdge}`}
          >
            {header}
            <p className="mt-3 max-w-md [text-shadow:0_1px_12px_rgba(5,13,26,.85)]">{t.text}</p>
          </article>
          <div
            data-part="page"
            className="absolute right-[clamp(16px,6vw,96px)] bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-10 w-[min(260px,36vw)] overflow-hidden rounded-md border-[6px] border-sand opacity-0 shadow-2xl max-sm:top-[calc(130px+env(safe-area-inset-top,0px))] max-sm:bottom-auto max-sm:w-[30vw]"
          >
            {mounted && <Photo id={photo.image} alt={photo.alt} eager sizes="260px" />}
          </div>
        </div>
      );
    }
    case "stats": {
      const second = t.extras[0];
      return (
        <div data-ex={station.id}>
          <article
            data-part="card"
            className={`${glass} absolute z-10 w-[min(340px,calc(100vw-32px))] p-5 opacity-0 ${cardBottom} ${leftEdge}`}
          >
            <p className={eyebrowClass}>{t.eyebrow}</p>
            <h3 className="my-1.5 font-display text-2xl font-semibold">{t.title}</h3>
            <div className="my-2.5 flex gap-5">
              <div>
                <b data-part="n1" className="block font-display text-3xl font-semibold text-gold">
                  {props.format(0, 0)}+
                </b>
                <span className="text-xs tracking-wide uppercase opacity-85">
                  {props.copy.stops.giza.statYears}
                </span>
              </div>
              <div>
                <b data-part="n2" className="block font-display text-3xl font-semibold text-gold">
                  {props.format(0, 1)} M
                </b>
                <span className="text-xs tracking-wide uppercase opacity-85">
                  {props.copy.stops.giza.statBlocks}
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed opacity-90">{t.text}</p>
          </article>
          <article
            data-part="second"
            className={`${glass} absolute z-10 w-[min(340px,calc(100vw-32px))] p-5 opacity-0 ${cardBottom} ${rightEdge} max-sm:right-4`}
          >
            {mounted && (
              <Photo
                id={second.image}
                alt={second.alt}
                eager
                sizes="340px"
                className="mb-2.5 h-28 rounded-lg"
              />
            )}
            <p className={eyebrowClass}>{t.eyebrow}</p>
            <h3 className="my-1.5 font-display text-2xl font-semibold">{second.title}</h3>
            <p className="text-sm leading-relaxed opacity-90">{second.text}</p>
          </article>
        </div>
      );
    }
    case "stack":
      return (
        <div data-ex={station.id}>
          <div
            data-part="chip"
            className={`${glass} absolute top-[calc(86px+env(safe-area-inset-top,0px))] z-10 rounded-full px-3.5 py-2 text-sm opacity-0 max-sm:text-xs ${leftEdge}`}
          >
            <b className="font-semibold text-gold">{t.eyebrow}</b> · {t.title}
          </div>
          <div className="absolute top-1/2 right-[clamp(16px,4vw,56px)] z-10 flex w-[min(300px,calc(100vw-32px))] -translate-y-1/2 flex-col gap-3 max-sm:top-auto max-sm:right-4 max-sm:bottom-[calc(72px+env(safe-area-inset-bottom,0px))] max-sm:translate-y-0">
            {t.extras.map((item) => (
              <div
                key={item.title}
                data-part="mini"
                className={`${glass} flex items-center gap-3 rounded-xl p-2 opacity-0`}
              >
                {mounted ? (
                  <Photo
                    id={item.image}
                    alt={item.alt}
                    eager
                    sizes="72px"
                    className="size-[72px] shrink-0 rounded-lg max-sm:size-[52px]"
                  />
                ) : (
                  <div className="size-[72px] shrink-0 max-sm:size-[52px]" />
                )}
                <div>
                  <b className="block font-display text-lg font-semibold text-gold">{item.title}</b>
                  <span className="text-xs leading-snug opacity-90">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "quote":
      return (
        <div data-ex={station.id}>
          <div
            data-part="quote"
            className="absolute inset-x-0 bottom-[calc(14%+env(safe-area-inset-bottom,0px))] z-10 px-6 text-center opacity-0"
          >
            <h3
              className={`font-display text-[clamp(1.8rem,5.5vw,4rem)] leading-[1.1] font-medium italic ${shadow}`}
            >
              {t.title}
            </h3>
            <p className="mt-2.5 [text-shadow:0_1px_12px_rgba(5,13,26,.9)]">{t.text}</p>
          </div>
        </div>
      );
    case "kinetic":
      return (
        <div data-ex={station.id}>
          <div
            data-part="kinetic"
            className="absolute inset-x-0 bottom-[calc(12%+env(safe-area-inset-bottom,0px))] z-10 px-6 text-center opacity-0"
          >
            <h3 className="font-display text-[clamp(3rem,12vw,9rem)] leading-none font-semibold tracking-[0.08em] text-sand/0 uppercase [-webkit-text-stroke:1.5px_var(--color-sand)]">
              {t.title}
            </h3>
            <p className="mt-2.5 [text-shadow:0_1px_12px_rgba(5,13,26,.9)]">{t.text}</p>
          </div>
        </div>
      );
  }
}

/** The pinned stage. Pure markup: the timeline in timeline.ts animates it through data-* attributes. */
export function JourneyStage({ stageRef, ...props }: StageProps) {
  const { copy, variant, mountedUpTo } = props;

  return (
    <div
      ref={stageRef}
      data-variant={variant}
      className="group/stage relative isolate h-svh overflow-hidden bg-ink"
    >
      <button
        type="button"
        onClick={props.onSkip}
        className="absolute right-4 bottom-4 z-30 rounded-full border border-sand/50 px-4 py-2 text-sm font-medium text-sand hover:border-gold hover:text-gold max-sm:right-auto max-sm:left-4"
      >
        {copy.ui.skip}
      </button>

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink-deep via-ink to-[#13335a]"
      />

      <svg
        data-el="map"
        viewBox={MAP_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
        className="absolute inset-0 size-full"
      >
        <g data-el="cam">
          <path
            d={EGYPT_PATH}
            className="fill-gold/10 stroke-gold"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <g
            className="fill-none stroke-teal"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path data-nile="main" pathLength={1} d={NILE_MAIN} />
            {NILE_BRANCHES.map((d) => (
              <path key={d} data-nile="branch" pathLength={1} d={d} />
            ))}
          </g>
          {stations.map((s) => {
            const p = stationPositions[s.id];
            return (
              <g key={s.id}>
                <circle cx={p.x} cy={p.y} r={3.6} className="fill-gold" />
                <circle
                  data-ring={s.id}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  className="fill-none stroke-gold"
                  strokeWidth={1.2}
                />
              </g>
            );
          })}
          <g data-el="labels">
            {stations.map((s) => {
              const p = stationPositions[s.id];
              return (
                <text
                  key={s.id}
                  x={p.x + 10}
                  y={p.y + 4}
                  fontSize={13}
                  className="fill-sand font-sans"
                >
                  {copy.stations[s.id]}
                </text>
              );
            })}
          </g>
        </g>
      </svg>

      {stations.map((s, i) => (
        <Scene key={s.id} station={s} mounted={i <= mountedUpTo} />
      ))}

      <div
        data-el="title"
        className="pointer-events-none absolute inset-0 grid place-content-center px-6 text-center"
      >
        <h2 id="journey-title" className="font-display text-4xl font-semibold sm:text-5xl">
          {copy.title}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-sand/80">{copy.subtitle}</p>
      </div>
      <p
        data-el="hint"
        className="absolute inset-x-0 bottom-7 text-center text-xs tracking-[0.2em] uppercase opacity-75"
      >
        {copy.ui.scroll}
      </p>

      {stations.map((s, i) => (
        <Explain key={s.id} station={s} props={props} mounted={i <= mountedUpTo} />
      ))}

      <div
        data-el="finale"
        className="invisible absolute inset-0 z-30 grid place-content-center justify-items-center gap-4 px-6 text-center opacity-0"
      >
        <h2
          className={`font-display text-[clamp(2.2rem,6vw,4.4rem)] leading-[1.05] font-semibold ${shadow}`}
        >
          {copy.finale.title}
        </h2>
        <p className="opacity-90">{copy.finale.text}</p>
        <Button href={`/${props.lang}#planner`}>{copy.finale.cta}</Button>
      </div>

      <nav aria-label={copy.ui.rail} className="absolute top-1/2 right-3.5 z-20 -translate-y-1/2">
        <ul className="flex flex-col gap-4">
          {stations.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => props.onRail(i)}
                aria-current={props.railIndex === i ? "step" : undefined}
                className={`flex items-center gap-2.5 text-[0.7rem] tracking-widest uppercase after:size-[9px] after:rounded-full after:border-[1.5px] after:border-gold after:content-[''] ${
                  props.railIndex === i ? "opacity-100 after:bg-gold" : "opacity-60"
                }`}
              >
                <span className="max-sm:hidden">{copy.stations[s.id]}</span>
                <span className="sr-only sm:hidden">{copy.stations[s.id]}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
