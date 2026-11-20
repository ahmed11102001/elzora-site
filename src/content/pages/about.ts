import type { LocalizedPage } from "./types";

// Describes the business model as documented in TASKS.md. No registration, license, address or
// support-hours claims: those are added only when they are confirmed.
export const about: LocalizedPage = {
  en: {
    title: "About ELZORA",
    description:
      "Who ELZORA is, how we plan trips to Egypt and how we work with local partner companies.",
    intro:
      "ELZORA designs tailor-made journeys through Egypt for travelers from Europe. We believe Egypt is best seen as a journey, not a checklist, so we start from what you want to experience and shape the route around it.",
    sections: [
      {
        heading: "How it works",
        list: [
          "You tell us your dates, interests, budget and travel style in the trip planner.",
          "We pass your request to the local partner companies best placed to run it, and prepare an offer.",
          "You receive a clear offer with what is included, the price and when payment is due.",
          "You decide. Nothing is booked until you accept the offer.",
        ],
      },
      {
        heading: "Local partners",
        paragraphs: [
          "Trips are built and operated by local partner companies in Egypt. We choose which partners we work with, and each offer says who runs the trip.",
        ],
      },
      {
        heading: "How we earn",
        paragraphs: [
          "ELZORA is paid a commission by its partner companies for the travelers we bring them. We say so openly because you should know how we work.",
        ],
      },
      {
        heading: "Get in touch",
        paragraphs: [
          "Questions before you plan? Write to us through the contact page, or start with the trip planner.",
        ],
      },
    ],
  },
  de: {
    title: "Über ELZORA",
    description:
      "Wer ELZORA ist, wie wir Reisen nach Ägypten planen und wie wir mit lokalen Partnerunternehmen arbeiten.",
    intro:
      "ELZORA gestaltet individuelle Reisen durch Ägypten für Reisende aus Europa. Wir sind überzeugt, dass man Ägypten am besten als Reise erlebt und nicht als Checkliste. Deshalb beginnen wir bei dem, was Sie erleben möchten, und bauen die Route darum herum.",
    sections: [
      {
        heading: "So funktioniert es",
        list: [
          "Sie nennen uns im Reiseplaner Reisedaten, Interessen, Budget und Reisestil.",
          "Wir leiten Ihre Anfrage an die lokalen Partnerunternehmen weiter, die sie am besten umsetzen können, und bereiten ein Angebot vor.",
          "Sie erhalten ein klares Angebot mit den enthaltenen Leistungen, dem Preis und der Fälligkeit der Zahlung.",
          "Sie entscheiden. Gebucht ist erst, wenn Sie das Angebot annehmen.",
        ],
      },
      {
        heading: "Lokale Partner",
        paragraphs: [
          "Die Reisen werden von lokalen Partnerunternehmen in Ägypten geplant und durchgeführt. Wir entscheiden, mit welchen Partnern wir arbeiten, und jedes Angebot nennt, wer die Reise durchführt.",
        ],
      },
      {
        heading: "Wie wir verdienen",
        paragraphs: [
          "ELZORA erhält von seinen Partnerunternehmen eine Provision für die Reisenden, die wir ihnen vermitteln. Wir sagen das offen, weil Sie wissen sollten, wie wir arbeiten.",
        ],
      },
      {
        heading: "Kontakt",
        paragraphs: [
          "Fragen, bevor Sie planen? Schreiben Sie uns über die Kontaktseite oder starten Sie direkt mit dem Reiseplaner.",
        ],
      },
    ],
  },
};
