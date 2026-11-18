import type { PhotoId } from "@/components/ui/Photo";
import type { stationPositions } from "./map-data";

export type StationId = keyof typeof stationPositions;

// How a scene opens and closes (clip-path shapes). Each station uses a different one.
export type RevealKind = "split" | "circle" | "curtain" | "wipe" | "window";
// How the photo moves while it is on screen.
export type MotionKind = "tilt" | "dawn" | "rise" | "drift" | "push";
// How the text is presented.
export type ExplainKind = "editorial" | "stats" | "stack" | "quote" | "kinetic";

export type StationConfig = {
  id: StationId;
  image: PhotoId;
  objectPosition: string;
  /** Map zoom while flying to the station, and how the flight eases. */
  zoom: number;
  ease: string;
  /** Timeline units. See computeSchedule. */
  travel: number;
  hold: number;
  reveal: RevealKind;
  motion: MotionKind;
  explain: ExplainKind;
};

// Stations are data: reorder, retime or swap a style here without touching the animation code.
// Every station deliberately uses a different reveal, photo motion, camera flight and text style.
export const stations: StationConfig[] = [
  {
    id: "alexandria",
    image: "library-exterior",
    objectPosition: "55% 50%",
    zoom: 3.2,
    ease: "power2.inOut",
    travel: 10,
    hold: 15,
    reveal: "split",
    motion: "tilt",
    explain: "editorial",
  },
  {
    id: "giza",
    image: "giza-pyramids",
    objectPosition: "62% 55%",
    zoom: 7,
    ease: "power3.inOut",
    travel: 12,
    hold: 31,
    reveal: "circle",
    motion: "dawn",
    explain: "stats",
  },
  {
    id: "luxor",
    image: "luxor-balloons",
    objectPosition: "50% 50%",
    zoom: 4.5,
    ease: "expo.inOut",
    travel: 12,
    hold: 22,
    reveal: "curtain",
    motion: "rise",
    explain: "stack",
  },
  {
    id: "aswan",
    image: "aswan-nile",
    objectPosition: "40% 55%",
    zoom: 2.4,
    ease: "sine.inOut",
    travel: 10,
    hold: 13,
    reveal: "wipe",
    motion: "drift",
    explain: "quote",
  },
  {
    id: "abuSimbel",
    image: "abu-simbel",
    objectPosition: "50% 40%",
    zoom: 6,
    ease: "power3.inOut",
    travel: 10,
    hold: 13,
    reveal: "window",
    motion: "push",
    explain: "kinetic",
  },
];

/** Timeline units before the first flight starts (title, hint, the Nile drawing itself). */
export const INTRO_END = 20;
export const REVEAL_DURATION = 6;
export const COLLAPSE_DURATION = 5;

export type StationTimes = { id: StationId; go: number; reveal: number; collapse: number };

/**
 * Lays the stations out one after another on the timeline.
 * go: camera starts flying · reveal: photo opens · collapse: photo closes · mark: rail position (0..1)
 */
export function computeSchedule(list: StationConfig[] = stations) {
  let t = INTRO_END;
  const times: StationTimes[] = [];
  for (const s of list) {
    const reveal = t + s.travel - 2;
    const collapse = reveal + REVEAL_DURATION + s.hold;
    times.push({ id: s.id, go: t, reveal, collapse });
    t = collapse + 1;
  }
  const finale = times[times.length - 1].collapse + 2;
  const total = finale + 13;
  const marks = [0, ...times.map((x) => (x.reveal + 10) / total)];
  return { times, finale, total, marks };
}
