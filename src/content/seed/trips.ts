import { L, type TripInput } from "../schema";

// Outlines only, written as placeholders for review. No prices until partners confirm them, and
// inclusions stay empty until the real programs exist.
export const trips: TripInput[] = [
  {
    id: "classic-egypt-8-days",
    title: L("Classic Egypt: Cairo, Luxor & Aswan"),
    summary: L(
      "Eight days from the pyramids of Giza to the temples of Luxor and the Nile at Aswan.",
    ),
    styleIds: ["classic"],
    destinationIds: ["giza", "luxor", "aswan"],
    durationDays: 8,
    highlights: [
      L("The Pyramids of Giza and the Sphinx"),
      L("Karnak and Luxor Temple"),
      L("The Valley of the Kings and Hatshepsut’s temple"),
      L("A felucca ride on the Nile at Aswan"),
    ],
    itinerary: [
      {
        day: 1,
        title: L("Arrive in Cairo"),
        description: L("Meet your guide at the airport and transfer to your hotel."),
        destinationId: "giza",
      },
      {
        day: 2,
        title: L("Pyramids and Sphinx"),
        description: L("A full day on the Giza plateau with an Egyptologist guide."),
        destinationId: "giza",
      },
      {
        day: 3,
        title: L("Fly to Luxor"),
        description: L("Fly south and spend the afternoon at your own pace."),
        destinationId: "luxor",
      },
      {
        day: 4,
        title: L("Karnak and Luxor Temple"),
        description: L("The east bank: Karnak by day, Luxor Temple at dusk."),
        destinationId: "luxor",
      },
      {
        day: 5,
        title: L("The West Bank"),
        description: L("The Valley of the Kings and the temple of Queen Hatshepsut."),
        destinationId: "luxor",
      },
      {
        day: 6,
        title: L("On to Aswan"),
        description: L("Travel up the Nile valley to Aswan."),
        destinationId: "aswan",
      },
      {
        day: 7,
        title: L("Aswan and the Nile"),
        description: L("Granite islets, a felucca ride and an optional day trip to Abu Simbel."),
        destinationId: "aswan",
      },
      {
        day: 8,
        title: L("Departure"),
        description: L("Transfer to the airport for your flight home."),
      },
    ],
    image: "giza-pyramids",
    status: "review",
  },
  {
    id: "nile-cruise-5-days",
    title: L("Nile Cruise: Luxor to Aswan"),
    summary: L(
      "Five days sailing the Nile between Luxor and Aswan, with the great temples along the river.",
    ),
    styleIds: ["nile-cruise", "classic"],
    destinationIds: ["luxor", "aswan"],
    durationDays: 5,
    highlights: [
      L("Karnak and the West Bank of Luxor"),
      L("The temples of Edfu and Kom Ombo"),
      L("Sunset on the Nile"),
      L("Aswan by felucca"),
    ],
    itinerary: [
      {
        day: 1,
        title: L("Luxor: board and Karnak"),
        description: L("Board your boat and visit Karnak."),
        destinationId: "luxor",
      },
      {
        day: 2,
        title: L("West Bank and sailing"),
        description: L("The Valley of the Kings, then sail south."),
        destinationId: "luxor",
      },
      {
        day: 3,
        title: L("Edfu and Kom Ombo"),
        description: L("Visit the temples of Edfu and Kom Ombo on the way to Aswan."),
      },
      {
        day: 4,
        title: L("Aswan"),
        description: L(
          "A felucca ride among the granite islets and an optional trip to Abu Simbel.",
        ),
        destinationId: "aswan",
      },
      {
        day: 5,
        title: L("Disembark"),
        description: L("Breakfast on board, then transfer to the airport or station."),
        destinationId: "aswan",
      },
    ],
    image: "aswan-nile",
    status: "review",
  },
  {
    id: "alexandria-and-pyramids-4-days",
    title: L("Pyramids & Alexandria"),
    summary: L("A short city break: the pyramids of Giza and Egypt’s Mediterranean city."),
    styleIds: ["classic", "family"],
    destinationIds: ["giza", "alexandria"],
    durationDays: 4,
    highlights: [
      L("The Pyramids of Giza and the Sphinx"),
      L("The Alexandria waterfront"),
      L("The Bibliotheca Alexandrina"),
    ],
    itinerary: [
      {
        day: 1,
        title: L("Arrive in Cairo"),
        description: L("Meet your guide and transfer to your hotel."),
        destinationId: "giza",
      },
      {
        day: 2,
        title: L("Pyramids and Sphinx"),
        description: L("A day on the Giza plateau."),
        destinationId: "giza",
      },
      {
        day: 3,
        title: L("Alexandria"),
        description: L(
          "Travel to the coast and explore the waterfront and the Bibliotheca Alexandrina.",
        ),
        destinationId: "alexandria",
      },
      {
        day: 4,
        title: L("Departure"),
        description: L("Transfer to the airport for your flight home."),
      },
    ],
    image: "giza-pyramids",
    status: "review",
  },
];
