import { L, type FaqInput } from "../schema";

// Deliberately cautious placeholder answers. They need a legal and factual review before publishing.
export const faqs: FaqInput[] = [
  {
    id: "is-egypt-safe",
    category: "safety",
    question: L("Is Egypt safe for tourists?"),
    answer: L(
      "Egypt welcomes millions of visitors every year and the main tourist areas are well established. Conditions can change, so check your own government’s current travel advice before you book and again before you travel. Ask us about your route and we will share what we know.",
    ),
    status: "review",
  },
  {
    id: "visa",
    category: "visa",
    question: L("Do I need a visa?"),
    answer: L(
      "Most European travelers need a visa to enter Egypt. Depending on your nationality it can be bought on arrival or online as an e-visa. Rules and fees change, so please confirm with the official Egyptian sources or your embassy before you travel.",
    ),
    status: "review",
  },
  {
    id: "best-time",
    category: "timing",
    question: L("When is the best time to visit?"),
    answer: L(
      "October to April is the most comfortable time for the pyramids and the Nile valley. Summers are very hot in Luxor and Aswan. The Red Sea is warm all year. Tell us when you can travel and we will suggest the best route for that season.",
    ),
    status: "review",
  },
  {
    id: "payments",
    category: "payments",
    question: L("How and when do I pay?"),
    answer: L(
      "Every offer states what is included, the price and when payment is due before you commit to anything. Payment methods are confirmed together with the offer.",
    ),
    status: "review",
  },
  {
    id: "cancellation",
    category: "cancellation",
    question: L("What if I need to cancel?"),
    answer: L(
      "Cancellation terms depend on the program and are written into each offer. Read them before you confirm, and ask us if anything is unclear.",
    ),
    status: "review",
  },
  {
    id: "tipping",
    category: "practical",
    question: L("Do I need to tip?"),
    answer: L(
      "Tipping is customary in Egypt for guides, drivers and service staff. Your guide can suggest sensible amounts for your trip.",
    ),
    status: "review",
  },
];
