import type { LocalizedPage } from "./types";

// Temporary working text (see pagesStatus). Describes what the code does today: no analytics or
// marketing, attribution and the reference code in sessionStorage, Turnstile on the form. Update it
// together with Phase 9 (tracking and consent).
export const cookies: LocalizedPage = {
  en: {
    title: "Cookie Policy",
    description: "What this website stores in your browser, and why.",
    updated: "2026-11-20",
    intro:
      "This page explains which cookies and similar browser storage this website uses. It is a working draft: it will be updated when analytics or marketing tools are added, and those will ask for your consent first.",
    sections: [
      {
        heading: "Cookies we set",
        paragraphs: [
          "This website itself does not set cookies for analytics, advertising or tracking. It does not remember your language in a cookie: the language is part of the web address.",
        ],
      },
      {
        heading: "Browser storage we use",
        paragraphs: [
          "While you use the site, we keep small pieces of information in your browser’s session storage. It is cleared when you close the tab:",
        ],
        list: [
          "The campaign details of your visit (campaign parameters, the website you came from and the first page you opened), so that a trip request can be linked to the campaign that led to it",
          "After you send a request, its reference code (no other personal data), so the confirmation page still works after a refresh",
        ],
        after: [
          "Your answers in the trip planner stay in your browser’s memory only while you fill in the form. They are not written to cookies or browser storage.",
        ],
      },
      {
        heading: "Bot protection",
        paragraphs: [
          "The trip request form is protected by Cloudflare Turnstile, which tells people from bots. Turnstile may use cookies or similar technologies of its own for this. It is used only to protect the form.",
        ],
      },
      {
        heading: "Analytics and marketing",
        paragraphs: [
          "We do not use analytics or advertising cookies at the moment. If this changes, we will ask for your consent before they are set and update this page.",
        ],
      },
      {
        heading: "Managing storage",
        paragraphs: [
          "You can delete cookies and site data in your browser settings. If you block the bot check, you may not be able to send the trip request form.",
        ],
      },
    ],
  },
  de: {
    title: "Cookie-Richtlinie",
    description: "Was diese Website in Ihrem Browser speichert und warum.",
    updated: "2026-11-20",
    intro:
      "Diese Seite erklärt, welche Cookies und ähnliche Speicher im Browser diese Website verwendet. Es ist ein Arbeitsentwurf: Er wird aktualisiert, wenn Analyse- oder Marketing-Werkzeuge hinzukommen, und diese holen zuvor Ihre Einwilligung ein.",
    sections: [
      {
        heading: "Cookies, die wir setzen",
        paragraphs: [
          "Diese Website selbst setzt keine Cookies für Analyse, Werbung oder Tracking. Ihre Sprache merkt sie sich nicht in einem Cookie: Die Sprache ist Teil der Webadresse.",
        ],
      },
      {
        heading: "Speicher im Browser",
        paragraphs: [
          "Während Sie die Website nutzen, speichern wir kleine Informationen im Sitzungsspeicher (Session Storage) Ihres Browsers. Er wird geleert, wenn Sie den Tab schließen:",
        ],
        list: [
          "Die Kampagnendaten Ihres Besuchs (Kampagnenparameter, die Website, von der Sie kamen, und die erste geöffnete Seite), damit eine Reiseanfrage der Kampagne zugeordnet werden kann, die dazu geführt hat",
          "Nach dem Senden einer Anfrage deren Referenzcode (keine weiteren personenbezogenen Daten), damit die Bestätigungsseite auch nach einem Neuladen funktioniert",
        ],
        after: [
          "Ihre Antworten im Reiseplaner bleiben nur im Arbeitsspeicher Ihres Browsers, solange Sie das Formular ausfüllen. Sie werden nicht in Cookies oder im Browser-Speicher abgelegt.",
        ],
      },
      {
        heading: "Schutz vor Bots",
        paragraphs: [
          "Das Formular für Reiseanfragen wird durch Cloudflare Turnstile geschützt, das Menschen von Bots unterscheidet. Turnstile kann dafür eigene Cookies oder ähnliche Technologien nutzen. Es dient ausschließlich dem Schutz des Formulars.",
        ],
      },
      {
        heading: "Analyse und Marketing",
        paragraphs: [
          "Derzeit setzen wir keine Analyse- oder Werbe-Cookies ein. Ändert sich das, holen wir Ihre Einwilligung ein, bevor sie gesetzt werden, und aktualisieren diese Seite.",
        ],
      },
      {
        heading: "Speicher verwalten",
        paragraphs: [
          "Sie können Cookies und Websitedaten in den Einstellungen Ihres Browsers löschen. Wenn Sie die Bot-Prüfung blockieren, können Sie das Formular für Reiseanfragen möglicherweise nicht absenden.",
        ],
      },
    ],
  },
};
