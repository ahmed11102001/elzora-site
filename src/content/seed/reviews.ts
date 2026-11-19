import type { ReviewInput } from "../schema";

// SAMPLE REVIEWS for pre-launch review of the layout only. They are NOT from real travelers and are
// marked verified/published so the section renders. Delete them (or replace them with real,
// consented reviews) before launch: publishing invented reviews is misleading and can be illegal.
export const reviews: ReviewInput[] = [
  {
    id: "sample-review-1",
    author: "Anna M.",
    country: "DE",
    rating: 5,
    text: {
      en: "Sample review text. Everything was clear from the first message, and the guide knew exactly when to arrive at each temple.",
      de: "Beispieltext. Von der ersten Nachricht an war alles klar, und der Guide wusste genau, wann wir an jedem Tempel sein sollten.",
    },
    tripId: "classic-egypt-8-days",
    date: "2026-09-15",
    verified: true,
    status: "published",
  },
  {
    id: "sample-review-2",
    author: "James T.",
    country: "GB",
    rating: 5,
    text: {
      en: "Sample review text. A relaxed pace, honest advice and a Nile cruise we would happily do again.",
      de: "Beispieltext. Ein entspanntes Tempo, ehrliche Beratung und eine Nilkreuzfahrt, die wir gern wiederholen würden.",
    },
    date: "2026-10-02",
    verified: true,
    status: "published",
  },
];
