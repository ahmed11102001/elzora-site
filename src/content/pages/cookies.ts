import type { LocalizedPage } from "./types";

// Temporary working text (see pagesStatus). Describes what the code does: optional analytics and
// marketing tools (Phase 9) that load only after consent, the saved cookie choice in localStorage,
// attribution and the reference code in sessionStorage, Turnstile on the form. Check the cookie names
// and lifetimes against the providers' current documentation, and have it reviewed, before launch.
export const cookies: LocalizedPage = {
  en: {
    title: "Cookie Policy",
    description: "What this website stores in your browser, and why.",
    updated: "2026-11-23",
    intro:
      "This page explains which cookies and similar browser storage this website uses. Optional analytics and marketing cookies are used only if you agree. This page is a working draft and will be reviewed before launch.",
    sections: [
      {
        heading: "Cookies we set",
        paragraphs: [
          "Without your consent, this website sets no cookies for analytics, advertising or tracking. It does not remember your language in a cookie: the language is part of the web address. Optional cookies are described under “Analytics and marketing” below.",
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
          "If you allowed marketing cookies: the ad click identifier of your visit (gclid or fbclid), so a trip request can be linked to the ad that led to it",
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
        heading: "Your cookie choice",
        paragraphs: [
          "When you decide in the cookie banner, we save your choice in your browser’s local storage for up to six months, so we do not ask on every page. You can change it at any time with “Cookie settings” in the footer. Accepting and rejecting are equally easy.",
        ],
      },
      {
        heading: "Analytics and marketing (only with your consent)",
        paragraphs: [
          "If you allow them, we use the tools below. Until you agree, none of them is loaded and nothing is sent to them.",
        ],
        list: [
          "Analytics: Google Analytics 4 (Google Ireland Limited) counts page views and the steps people take in the trip planner. It sets cookies such as _ga and _ga_<ID>, which typically last up to two years.",
          "Marketing: Google Ads measures whether an ad led to a trip request. It sets cookies such as _gcl_au, which typically last up to 90 days.",
          "Marketing: the Meta Pixel (Meta Platforms Ireland Limited) measures whether an ad led to a trip request. It sets cookies such as _fbp, which typically last up to 90 days.",
        ],
        after: [
          "We do not send your name, email address or phone number to these tools. The events only describe what happened, for example that a step of the planner was opened or that a request was sent.",
          "If you withdraw your consent, the page reloads and these cookies are deleted where your browser allows it.",
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
    updated: "2026-11-23",
    intro:
      "Diese Seite erklärt, welche Cookies und ähnliche Speicher im Browser diese Website verwendet. Optionale Analyse- und Marketing-Cookies verwenden wir nur, wenn Sie zustimmen. Diese Seite ist ein Arbeitsentwurf und wird vor dem Start geprüft.",
    sections: [
      {
        heading: "Cookies, die wir setzen",
        paragraphs: [
          "Ohne Ihre Einwilligung setzt diese Website keine Cookies für Analyse, Werbung oder Tracking. Ihre Sprache merkt sie sich nicht in einem Cookie: Die Sprache ist Teil der Webadresse. Optionale Cookies beschreiben wir unten unter „Analyse und Marketing“.",
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
          "Wenn Sie Marketing-Cookies erlaubt haben: die Klick-Kennung der Anzeige Ihres Besuchs (gclid oder fbclid), damit eine Reiseanfrage der Anzeige zugeordnet werden kann, die dazu geführt hat",
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
        heading: "Ihre Cookie-Auswahl",
        paragraphs: [
          "Wenn Sie im Cookie-Banner entscheiden, speichern wir Ihre Auswahl bis zu sechs Monate im lokalen Speicher (Local Storage) Ihres Browsers, damit wir nicht auf jeder Seite erneut fragen. Sie können sie jederzeit über „Cookie-Einstellungen“ in der Fußzeile ändern. Zustimmen und Ablehnen sind gleich einfach.",
        ],
      },
      {
        heading: "Analyse und Marketing (nur mit Ihrer Einwilligung)",
        paragraphs: [
          "Wenn Sie zustimmen, nutzen wir die folgenden Werkzeuge. Solange Sie nicht zustimmen, wird keines davon geladen, und es werden keine Daten an sie gesendet.",
        ],
        list: [
          "Analyse: Google Analytics 4 (Google Ireland Limited) zählt Seitenaufrufe und die Schritte im Reiseplaner. Es setzt Cookies wie _ga und _ga_<ID>, die in der Regel bis zu zwei Jahre gespeichert bleiben.",
          "Marketing: Google Ads misst, ob eine Anzeige zu einer Reiseanfrage geführt hat. Es setzt Cookies wie _gcl_au, die in der Regel bis zu 90 Tage gespeichert bleiben.",
          "Marketing: Der Meta-Pixel (Meta Platforms Ireland Limited) misst, ob eine Anzeige zu einer Reiseanfrage geführt hat. Er setzt Cookies wie _fbp, die in der Regel bis zu 90 Tage gespeichert bleiben.",
        ],
        after: [
          "An diese Werkzeuge senden wir weder Ihren Namen noch Ihre E-Mail-Adresse oder Telefonnummer. Die Ereignisse beschreiben nur, was passiert ist, zum Beispiel dass ein Schritt des Planers geöffnet oder eine Anfrage gesendet wurde.",
          "Wenn Sie Ihre Einwilligung widerrufen, wird die Seite neu geladen und diese Cookies werden gelöscht, soweit Ihr Browser es zulässt.",
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
