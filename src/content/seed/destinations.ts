import { L, type DestinationInput } from "../schema";

// Placeholder copy for review. Facts must be re-checked before publishing.
export const destinations: DestinationInput[] = [
  {
    id: "giza",
    name: L("Giza"),
    tagline: L("Where the pyramids meet the desert"),
    summary: L(
      "The Giza plateau is home to the three great pyramids and the Sphinx, on the edge of modern Cairo. The Great Pyramid was built for Pharaoh Khufu and is the only one of the ancient Seven Wonders still standing.",
    ),
    facts: [
      { label: L("Great Pyramid built"), value: L("around 2560 BC") },
      { label: L("Length of the Sphinx"), value: L("about 73 m") },
    ],
    image: "giza-pyramids",
    status: "review",
  },
  {
    id: "luxor",
    name: L("Luxor"),
    tagline: L("A city built on ancient Thebes"),
    summary: L(
      "Luxor sits on the site of ancient Thebes. On the east bank are Karnak and Luxor Temple, on the west bank the Valley of the Kings and the terraced temple of Queen Hatshepsut. Hot-air balloons drift over the valley at sunrise.",
    ),
    facts: [{ label: L("Columns in Karnak’s Great Hypostyle Hall"), value: L("134") }],
    image: "luxor-balloons",
    status: "review",
  },
  {
    id: "alexandria",
    name: L("Alexandria"),
    tagline: L("Egypt’s Mediterranean pearl"),
    summary: L(
      "Founded by Alexander the Great, Alexandria was one of the great cities of the ancient world and home to its most famous library. Today the Bibliotheca Alexandrina, a modern library and cultural center, stands on the waterfront.",
    ),
    facts: [
      { label: L("Founded"), value: L("331 BC") },
      { label: L("Bibliotheca Alexandrina opened"), value: L("2002") },
    ],
    image: "library-exterior", // license not confirmed yet, see assets/images.json
    status: "review",
  },
  {
    id: "aswan",
    name: L("Aswan"),
    tagline: L("Where the Nile slows down"),
    summary: L(
      "Aswan is the Nile at its most relaxed: granite islets, palm groves, Nubian villages and felucca sails. It is also the usual starting point for the trip to Abu Simbel.",
    ),
    facts: [],
    image: "aswan-nile",
    status: "review",
  },
  {
    id: "abu-simbel",
    name: L("Abu Simbel"),
    tagline: L("Ramses II, carved into the cliff"),
    summary: L(
      "Two temples cut into the rock by Ramses II, guarded by colossal seated statues. When the Aswan High Dam threatened to flood them, they were moved block by block to higher ground.",
    ),
    facts: [
      { label: L("Height of the seated statues"), value: L("about 20 m") },
      { label: L("Temples relocated"), value: L("1964–1968") },
    ],
    image: "abu-simbel",
    status: "review",
  },
];
