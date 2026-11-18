import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import { CLIPS } from "./clips";
import { GIZA_STATS } from "./copy";
import { stationPositions } from "./map-data";
import {
  COLLAPSE_DURATION,
  REVEAL_DURATION,
  computeSchedule,
  type StationConfig,
} from "./stations";

type GSAP = typeof GsapType;

export type BuildOptions = {
  gsap: GSAP;
  /** Leave out to build the timeline without linking it to scroll (used by tests). */
  ScrollTrigger?: typeof ScrollTriggerType;
  /** The stage element: everything is looked up inside it with data-* attributes. */
  root: HTMLElement;
  stations: StationConfig[];
  /** Scroll distance per timeline unit, as % of the viewport height. */
  scrollPerUnit: number;
  /** Cheaper effects for phones: no brightness filter on the photos. */
  lite?: boolean;
  format: (n: number, decimals: number) => string;
  onProgress?: (progress: number) => void;
};

/** Index of the last station whose camera flight has started at `time` (-1 before the first). */
export function stationIndexAt(time: number, times: { go: number }[]) {
  let index = -1;
  times.forEach((t, i) => {
    if (time >= t.go) index = i;
  });
  return index;
}

/**
 * Builds the whole journey as one GSAP timeline, driven by the scroll position (pinned stage).
 * Each station adds the same four things with its own style: camera flight, photo reveal,
 * photo motion and text presentation (see StationConfig).
 */
export function buildJourney(o: BuildOptions) {
  const { gsap, root } = o;
  const schedule = computeSchedule(o.stations);
  const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
  const one = (selector: string) => {
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`Journey: missing element ${selector}`);
    return el;
  };
  const camTo = (px: number, py: number, s: number) => ({
    scale: s,
    x: 380 - s * px,
    y: 360 - s * py,
  });
  const dim = (value: string) => (o.lite ? {} : { filter: value });

  const cam = one('[data-el="cam"]');
  const labels = one('[data-el="labels"]');
  const hint = one('[data-el="hint"]');
  const title = one('[data-el="title"]');
  const nileMain = one('[data-nile="main"]');
  const nileBranches = all('[data-nile="branch"]');
  const finale = one('[data-el="finale"]');
  const rings = all("[data-ring]");

  gsap.set(cam, { svgOrigin: "0 0" });
  gsap.set([nileMain, ...nileBranches], { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(finale, { autoAlpha: 0 });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: o.ScrollTrigger
      ? {
          trigger: root,
          start: "top top",
          end: `+=${schedule.total * o.scrollPerUnit}%`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          onUpdate: (self: { progress: number }) => o.onProgress?.(self.progress),
        }
      : undefined,
  });

  // Intro: the title leaves and the Nile draws itself.
  tl.to(hint, { opacity: 0, duration: 2 }, 1)
    .to(title, { opacity: 0, y: -30, duration: 4 }, 3)
    .to(nileMain, { strokeDashoffset: 0, duration: 10 }, 5)
    .to(nileBranches, { strokeDashoffset: 0, duration: 4 }, 15);

  o.stations.forEach((station, i) => {
    const t = schedule.times[i];
    const pos = stationPositions[station.id];
    const sel = `[data-scene="${station.id}"]`;
    const scene = one(sel);
    const motion = one(`${sel} [data-motion]`);
    const clip = CLIPS[station.reveal];
    const hold = station.hold;
    const motionDuration = hold + REVEAL_DURATION;
    const r = t.reveal;

    // 1. camera flight on the map
    tl.to(
      cam,
      { ...camTo(pos.x, pos.y, station.zoom), ease: station.ease, duration: station.travel },
      t.go,
    );
    if (i === 0) tl.to(labels, { opacity: 0, duration: 3 }, t.go);
    tl.fromTo(
      one(`[data-ring="${station.id}"]`),
      { attr: { r: 3 }, opacity: 1 },
      { attr: { r: 16 }, opacity: 0, duration: 5 },
      r - 1,
    );

    // 2. the photo opens
    tl.fromTo(
      scene,
      { clipPath: clip.from },
      { clipPath: clip.full, ease: clip.enter, duration: REVEAL_DURATION },
      r,
    );

    // 3. the photo moves
    switch (station.motion) {
      case "tilt":
        tl.fromTo(
          motion,
          { scale: 1.2, yPercent: 5, ...dim("brightness(0.55)") },
          { scale: 1.1, yPercent: -5, ...dim("brightness(1)"), duration: motionDuration },
          r,
        );
        break;
      case "dawn": {
        const warm = one(`${sel} [data-warm]`);
        tl.fromTo(
          motion,
          { scale: 1.35, ...dim("brightness(0.3) saturate(0.6)") },
          { scale: 1, ...dim("brightness(1) saturate(1.12)"), duration: motionDuration },
          r,
        )
          .fromTo(warm, { opacity: 0 }, { opacity: 1, duration: motionDuration * 0.8 }, r + 6)
          .to(motion, { yPercent: -3, duration: motionDuration * 0.9 }, r + 6);
        break;
      }
      case "rise":
        tl.fromTo(
          motion,
          { scale: 1.08, yPercent: 6, ...dim("brightness(0.6)") },
          { scale: 1.2, yPercent: -4, ...dim("brightness(1)"), duration: motionDuration },
          r,
        );
        break;
      case "drift":
        tl.fromTo(
          motion,
          { scale: 1.18, xPercent: -4, ...dim("brightness(0.6)") },
          { scale: 1.18, xPercent: 4, ...dim("brightness(1)"), duration: motionDuration },
          r,
        );
        break;
      case "push":
        tl.fromTo(
          motion,
          { scale: 1, transformOrigin: "50% 35%", ...dim("brightness(0.5)") },
          { scale: 1.22, ...dim("brightness(1)"), duration: motionDuration },
          r,
        );
        break;
    }

    // 4. the text
    const ex = `[data-ex="${station.id}"]`;
    switch (station.explain) {
      case "editorial": {
        const card = one(`${ex} [data-part="card"]`);
        const page = one(`${ex} [data-part="page"]`);
        tl.fromTo(card, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 2.5 }, r + 7).to(
          card,
          { opacity: 0, y: -20, duration: 2.5 },
          r + 18,
        );
        tl.fromTo(
          page,
          { opacity: 0, y: 80, rotation: -8 },
          { opacity: 1, y: 0, rotation: -3, duration: 4 },
          r + 10,
        ).to(page, { opacity: 0, y: -40, duration: 3 }, r + 16);
        break;
      }
      case "stats": {
        const card = one(`${ex} [data-part="card"]`);
        const second = one(`${ex} [data-part="second"]`);
        const n1 = one(`${ex} [data-part="n1"]`);
        const n2 = one(`${ex} [data-part="n2"]`);
        const counter = { a: 0, b: 0 };
        tl.fromTo(card, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 2.5 }, r + 10).to(
          card,
          { opacity: 0, y: -20, duration: 2.5 },
          r + 19,
        );
        tl.to(
          counter,
          {
            a: GIZA_STATS.years,
            b: GIZA_STATS.blocksMillions,
            duration: 5,
            onUpdate: () => {
              n1.textContent = `${o.format(Math.round(counter.a), 0)}+`;
              n2.textContent = `${o.format(counter.b, 1)} M`;
            },
          },
          r + 11,
        );
        tl.fromTo(second, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 2.5 }, r + 23).to(
          second,
          { opacity: 0, y: -20, duration: 2.5 },
          r + 32,
        );
        break;
      }
      case "stack": {
        const chip = one(`${ex} [data-part="chip"]`);
        const minis = all(`${ex} [data-part="mini"]`);
        tl.fromTo(chip, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 2.5 }, r + 6).to(
          chip,
          { opacity: 0, duration: 2 },
          r + 24,
        );
        tl.fromTo(
          minis,
          { opacity: 0, x: 40 },
          { opacity: 1, x: 0, stagger: 3.5, duration: 2.5 },
          r + 11,
        ).to(minis, { opacity: 0, x: 40, stagger: 0.4, duration: 2 }, r + 24.5);
        break;
      }
      case "quote": {
        const quote = one(`${ex} [data-part="quote"]`);
        tl.fromTo(
          quote,
          { opacity: 0, scale: 0.96 },
          { opacity: 1, scale: 1, duration: 4 },
          r + 7,
        ).to(quote, { opacity: 0, duration: 3 }, r + 16);
        break;
      }
      case "kinetic": {
        const block = one(`${ex} [data-part="kinetic"]`);
        const heading = one(`${ex} [data-part="kinetic"] h3`);
        tl.fromTo(block, { opacity: 0 }, { opacity: 1, duration: 3 }, r + 6)
          .fromTo(
            heading,
            { letterSpacing: "0.5em" },
            { letterSpacing: "0.08em", duration: 7 },
            r + 6,
          )
          .to(block, { opacity: 0, duration: 3 }, r + 16);
        break;
      }
    }

    // 5. the photo closes
    tl.fromTo(
      scene,
      { clipPath: clip.full },
      { clipPath: clip.exit, ease: clip.leave, duration: COLLAPSE_DURATION },
      t.collapse,
    );
  });

  // Finale: back to the whole map, all stops light up, call to action.
  const f = schedule.finale;
  tl.to(cam, { scale: 1, x: 0, y: 0, ease: "power2.inOut", duration: 10 }, f)
    .to(labels, { opacity: 1, duration: 4 }, f + 4)
    .fromTo(
      rings,
      { attr: { r: 3 }, opacity: 1 },
      { attr: { r: 16 }, opacity: 0, duration: 4, stagger: 0.6 },
      f + 6,
    )
    .to(finale, { autoAlpha: 1, duration: 4 }, f + 6)
    .to({}, { duration: 0 }, schedule.total);

  return { timeline: tl, scrollTrigger: tl.scrollTrigger ?? null, schedule };
}
