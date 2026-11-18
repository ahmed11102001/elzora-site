import { L, type FaqInput } from "../schema";

// Deliberately cautious placeholder answers. They need a legal and factual review before publishing.
export const faqs: FaqInput[] = [
  {
    id: "is-egypt-safe",
    category: "safety",
    question: L("Is Egypt safe for tourists?", "Ist Ägypten für Touristen sicher?"),
    answer: L(
      "Egypt welcomes millions of visitors every year and the main tourist areas are well established. Conditions can change, so check your own government’s current travel advice before you book and again before you travel. Ask us about your route and we will share what we know.",
      "Jedes Jahr besuchen Millionen von Gästen Ägypten, und die wichtigsten Touristenregionen sind gut etabliert. Die Lage kann sich ändern: Prüfen Sie daher vor der Buchung und noch einmal vor der Abreise die aktuellen Reisehinweise Ihres Landes. Fragen Sie uns nach Ihrer Route, wir teilen gern, was wir wissen.",
    ),
    status: "review",
  },
  {
    id: "visa",
    category: "visa",
    question: L("Do I need a visa?", "Brauche ich ein Visum?"),
    answer: L(
      "Most European travelers need a visa to enter Egypt. Depending on your nationality it can be bought on arrival or online as an e-visa. Rules and fees change, so please confirm with the official Egyptian sources or your embassy before you travel.",
      "Die meisten europäischen Reisenden benötigen für die Einreise nach Ägypten ein Visum. Je nach Staatsangehörigkeit kann es bei der Ankunft oder online als E-Visum erworben werden. Regeln und Gebühren ändern sich, bitte prüfen Sie sie vor der Reise bei den offiziellen ägyptischen Stellen oder Ihrer Botschaft.",
    ),
    status: "review",
  },
  {
    id: "best-time",
    category: "timing",
    question: L("When is the best time to visit?", "Wann ist die beste Reisezeit?"),
    answer: L(
      "October to April is the most comfortable time for the pyramids and the Nile valley. Summers are very hot in Luxor and Aswan. The Red Sea is warm all year. Tell us when you can travel and we will suggest the best route for that season.",
      "Von Oktober bis April ist es an den Pyramiden und im Niltal am angenehmsten. Die Sommer sind in Luxor und Assuan sehr heiß. Das Rote Meer ist das ganze Jahr über warm. Sagen Sie uns, wann Sie reisen können, und wir schlagen die beste Route für diese Jahreszeit vor.",
    ),
    status: "review",
  },
  {
    id: "payments",
    category: "payments",
    question: L("How and when do I pay?", "Wie und wann bezahle ich?"),
    answer: L(
      "Every offer states what is included, the price and when payment is due before you commit to anything. Payment methods are confirmed together with the offer.",
      "Jedes Angebot nennt vorab, was enthalten ist, den Preis und wann die Zahlung fällig ist, bevor Sie sich zu etwas verpflichten. Die Zahlungsmethoden werden gemeinsam mit dem Angebot bestätigt.",
    ),
    status: "review",
  },
  {
    id: "cancellation",
    category: "cancellation",
    question: L("What if I need to cancel?", "Was, wenn ich stornieren muss?"),
    answer: L(
      "Cancellation terms depend on the program and are written into each offer. Read them before you confirm, and ask us if anything is unclear.",
      "Die Stornobedingungen hängen vom Programm ab und sind in jedem Angebot festgehalten. Lesen Sie sie, bevor Sie zusagen, und fragen Sie uns, wenn etwas unklar ist.",
    ),
    status: "review",
  },
  {
    id: "tipping",
    category: "practical",
    question: L("Do I need to tip?", "Muss ich Trinkgeld geben?"),
    answer: L(
      "Tipping is customary in Egypt for guides, drivers and service staff. Your guide can suggest sensible amounts for your trip.",
      "In Ägypten ist Trinkgeld für Guides, Fahrer und Servicepersonal üblich. Ihr Guide kann Ihnen sinnvolle Beträge für Ihre Reise nennen.",
    ),
    status: "review",
  },
];
