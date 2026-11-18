import { L, type TripStyleInput } from "../schema";

// Placeholder copy for review. German translations come in Phase 10.
export const tripStyles: TripStyleInput[] = [
  {
    id: "classic",
    title: L("Classic Egypt"),
    summary: L("The great sites in one journey: the pyramids, the temples of Luxor and the Nile."),
    image: "giza-pyramids",
    status: "review",
  },
  {
    id: "nile-cruise",
    title: L("Nile Cruise"),
    summary: L("Sail between Luxor and Aswan, with the temples of the Nile valley along the way."),
    image: "aswan-nile",
    status: "review",
  },
  {
    id: "red-sea",
    title: L("Red Sea"),
    summary: L("Coral reefs, diving and beach time on Egypt’s eastern coast."),
    status: "review",
  },
  {
    id: "desert-siwa",
    title: L("Desert & Siwa"),
    summary: L("Dunes, oases and star-filled nights in the Western Desert."),
    status: "review",
  },
  {
    id: "family",
    title: L("Family Journeys"),
    summary: L("Egypt’s highlights at a pace that works for children."),
    status: "review",
  },
  {
    id: "honeymoon",
    title: L("Honeymoon"),
    summary: L("Quiet moments, private experiences and sunrise over ancient sites."),
    image: "luxor-balloons",
    status: "review",
  },
];
