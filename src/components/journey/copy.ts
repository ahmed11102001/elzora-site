import type { PhotoId } from "@/components/ui/Photo";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { StationId } from "./stations";

export type JourneyCopy = Dictionary["journey"];

export type StationText = {
  eyebrow: string;
  title: string;
  text: string;
  /** Short facts, shown as chips in the static version. */
  facts: string[];
  /** Extra places or objects that belong to the station. */
  extras: { title: string; text: string; image: PhotoId; alt: string }[];
  photoAlt?: string;
};

// Numbers shown in the Giza counters (also used by the animation).
export const GIZA_STATS = { years: 4500, blocksMillions: 2.3 };

export const formatNumber = (n: number, lang: Locale, decimals = 0) =>
  n.toLocaleString(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Image ids are structure (not translated), the words come from the dictionary.
const luxorImages: PhotoId[] = ["karnak-columns", "luxor-temple-dusk", "karnak-obelisk"];

/** Plain text for one station: used by the static version and as the source for the animated one. */
export function stationText(t: JourneyCopy, id: StationId, lang: Locale): StationText {
  const eyebrow = t.stations[id];
  switch (id) {
    case "alexandria":
      return {
        eyebrow,
        ...t.stops.alexandria,
        facts: [],
        extras: [{ title: "", text: "", image: "library-hall", alt: t.stops.alexandria.photoAlt }],
      };
    case "giza": {
      const g = t.stops.giza;
      return {
        eyebrow,
        title: g.title,
        text: g.text,
        facts: [
          `${formatNumber(GIZA_STATS.years, lang)}+ ${g.statYears}`,
          `${formatNumber(GIZA_STATS.blocksMillions, lang, 1)} M ${g.statBlocks}`,
        ],
        extras: [{ title: g.secondTitle, text: g.secondText, image: "sphinx", alt: g.secondAlt }],
      };
    }
    case "luxor": {
      const l = t.stops.luxor;
      return {
        eyebrow,
        title: l.title,
        text: l.text,
        facts: [],
        extras: l.items.map((item, i) => ({ ...item, image: luxorImages[i] })),
      };
    }
    case "aswan":
      return { eyebrow, ...t.stops.aswan, facts: [], extras: [] };
    case "abuSimbel":
      return { eyebrow, ...t.stops.abuSimbel, facts: [], extras: [] };
  }
}
