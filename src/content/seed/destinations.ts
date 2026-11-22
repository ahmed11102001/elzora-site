import { L, type DestinationInput } from "../schema";

// Placeholder copy for review. Facts must be re-checked before publishing. The German text is a first
// draft and needs a native review before launch (plan decision 6).
export const destinations: DestinationInput[] = [
  {
    id: "giza",
    name: L("Giza", "Gizeh"),
    tagline: L("Where the pyramids meet the desert", "Wo die Pyramiden auf die Wüste treffen"),
    summary: L(
      "The Giza plateau is home to the three great pyramids and the Sphinx, on the edge of modern Cairo. The Great Pyramid was built for Pharaoh Khufu and is the only one of the ancient Seven Wonders still standing.",
      "Auf dem Plateau von Gizeh stehen die drei großen Pyramiden und die Sphinx, am Rand des modernen Kairo. Die Cheops-Pyramide wurde für Pharao Cheops erbaut und ist das einzige der antiken Sieben Weltwunder, das noch steht.",
    ),
    facts: [
      {
        label: L("Great Pyramid built", "Cheops-Pyramide erbaut"),
        value: L("around 2560 BC", "um 2560 v. Chr."),
      },
      { label: L("Length of the Sphinx", "Länge der Sphinx"), value: L("about 73 m", "etwa 73 m") },
    ],
    image: "giza-pyramids",
    status: "review",
  },
  {
    id: "luxor",
    name: L("Luxor", "Luxor"),
    tagline: L("A city built on ancient Thebes", "Eine Stadt auf dem Boden des antiken Theben"),
    summary: L(
      "Luxor sits on the site of ancient Thebes. On the east bank are Karnak and Luxor Temple, on the west bank the Valley of the Kings and the terraced temple of Queen Hatshepsut. Hot-air balloons drift over the valley at sunrise.",
      "Luxor liegt an der Stelle des antiken Theben. Am Ostufer stehen Karnak und der Luxor-Tempel, am Westufer das Tal der Könige und der Terrassentempel der Königin Hatschepsut. Bei Sonnenaufgang schweben Heißluftballons über dem Tal.",
    ),
    facts: [
      {
        label: L(
          "Columns in Karnak’s Great Hypostyle Hall",
          "Säulen in Karnaks großer Säulenhalle",
        ),
        value: L("134", "134"),
      },
    ],
    image: "luxor-balloons",
    status: "review",
  },
  {
    id: "alexandria",
    name: L("Alexandria", "Alexandria"),
    tagline: L("Egypt’s Mediterranean pearl", "Ägyptens Perle am Mittelmeer"),
    summary: L(
      "Founded by Alexander the Great, Alexandria was one of the great cities of the ancient world and home to its most famous library. Today the Bibliotheca Alexandrina, a modern library and cultural center, stands on the waterfront.",
      "Von Alexander dem Großen gegründet, war Alexandria eine der großen Städte der Antike und Heimat ihrer berühmtesten Bibliothek. Heute steht am Hafen die Bibliotheca Alexandrina, eine moderne Bibliothek und ein Kulturzentrum.",
    ),
    facts: [
      { label: L("Founded", "Gegründet"), value: L("331 BC", "331 v. Chr.") },
      {
        label: L("Bibliotheca Alexandrina opened", "Bibliotheca Alexandrina eröffnet"),
        value: L("2002", "2002"),
      },
    ],
    image: "library-exterior", // license not confirmed yet, see assets/images.json
    status: "review",
  },
  {
    id: "aswan",
    name: L("Aswan", "Assuan"),
    tagline: L("Where the Nile slows down", "Wo der Nil ruhiger wird"),
    summary: L(
      "Aswan is the Nile at its most relaxed: granite islets, palm groves, Nubian villages and felucca sails. It is also the usual starting point for the trip to Abu Simbel.",
      "Assuan zeigt den Nil von seiner ruhigsten Seite: Granitinseln, Palmenhaine, nubische Dörfer und Feluken-Segel. Von hier aus starten auch die meisten Ausflüge nach Abu Simbel.",
    ),
    facts: [],
    image: "aswan-nile",
    status: "review",
  },
  {
    id: "abu-simbel",
    name: L("Abu Simbel", "Abu Simbel"),
    tagline: L("Ramses II, carved into the cliff", "Ramses II., in den Fels gehauen"),
    summary: L(
      "Two temples cut into the rock by Ramses II, guarded by colossal seated statues. When the Aswan High Dam threatened to flood them, they were moved block by block to higher ground.",
      "Zwei Tempel, von Ramses II. in den Fels gehauen und von kolossalen Sitzfiguren bewacht. Als der Assuan-Staudamm sie zu überfluten drohte, wurden sie Block für Block an einen höher gelegenen Ort versetzt.",
    ),
    facts: [
      {
        label: L("Height of the seated statues", "Höhe der Sitzfiguren"),
        value: L("about 20 m", "etwa 20 m"),
      },
      { label: L("Temples relocated", "Tempel versetzt"), value: L("1964–1968", "1964–1968") },
    ],
    image: "abu-simbel",
    status: "review",
  },
];
