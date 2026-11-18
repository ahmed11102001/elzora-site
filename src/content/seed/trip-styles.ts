import { L, type TripStyleInput } from "../schema";

// Placeholder copy for review. German translations come in Phase 10.
export const tripStyles: TripStyleInput[] = [
  {
    id: "classic",
    title: L("Classic Egypt", "Klassisches Ägypten"),
    summary: L(
      "The great sites in one journey: the pyramids, the temples of Luxor and the Nile.",
      "Die großen Stätten auf einer Reise: die Pyramiden, die Tempel von Luxor und der Nil.",
    ),
    image: "giza-pyramids",
    status: "review",
  },
  {
    id: "nile-cruise",
    title: L("Nile Cruise", "Nilkreuzfahrt"),
    summary: L(
      "Sail between Luxor and Aswan, with the temples of the Nile valley along the way.",
      "Fahren Sie zwischen Luxor und Assuan auf dem Nil, mit den Tempeln des Niltals am Weg.",
    ),
    image: "aswan-nile",
    status: "review",
  },
  {
    id: "red-sea",
    title: L("Red Sea", "Rotes Meer"),
    summary: L(
      "Coral reefs, diving and beach time on Egypt’s eastern coast.",
      "Korallenriffe, Tauchen und Strandtage an Ägyptens Ostküste.",
    ),
    status: "review",
  },
  {
    id: "desert-siwa",
    title: L("Desert & Siwa", "Wüste & Siwa"),
    summary: L(
      "Dunes, oases and star-filled nights in the Western Desert.",
      "Dünen, Oasen und Sternennächte in der Westlichen Wüste.",
    ),
    status: "review",
  },
  {
    id: "family",
    title: L("Family Journeys", "Familienreisen"),
    summary: L(
      "Egypt’s highlights at a pace that works for children.",
      "Ägyptens Höhepunkte in einem Tempo, das für Kinder passt.",
    ),
    status: "review",
  },
  {
    id: "honeymoon",
    title: L("Honeymoon", "Flitterwochen"),
    summary: L(
      "Quiet moments, private experiences and sunrise over ancient sites.",
      "Ruhige Momente, private Erlebnisse und Sonnenaufgang über antiken Stätten.",
    ),
    image: "luxor-balloons",
    status: "review",
  },
];
