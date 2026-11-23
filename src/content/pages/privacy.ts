import type { LocalizedPage } from "./types";

// Temporary working text (see pagesStatus). Items marked "to be confirmed" need real business data.
export const privacy: LocalizedPage = {
  en: {
    title: "Privacy Policy",
    description:
      "How ELZORA handles the personal data you send when you ask for a trip, and your rights.",
    updated: "2026-11-23",
    intro:
      "This page explains what personal data we collect when you use this website and send a trip request, why we collect it, who receives it and what rights you have. It is a working draft: details marked as “to be confirmed” will be completed before the website goes live.",
    sections: [
      {
        heading: "Who is responsible",
        paragraphs: [
          "ELZORA is the working name of this website. The legal name, postal address and contact email of the operator, who is responsible for your data, will be published here and in the legal notice (Imprint) before launch.",
          "Until then you can reach us through the contact page.",
        ],
      },
      {
        heading: "What data we process",
        paragraphs: ["When you send a trip request through the trip planner, we process:"],
        list: [
          "Your name, email address, country of residence and, if you give it, your phone number",
          "Your travel plans: dates or a flexible timeframe, the number of adults and children (and the children’s ages), interests, trip length, budget range and any notes you write",
          "The language of the website you used",
          "Which page or campaign brought you here (campaign parameters, the website you came from and the first page you opened), so we can understand which channels work",
          "If you allow marketing cookies and came from a Google or Meta ad: the ad click identifier in the link (gclid or fbclid), saved with your request",
          "The date and version of the consent you gave, and a reference code for your request",
        ],
        after: [
          "When you only browse the site, our hosting provider processes technical data such as your IP address, browser type and the time of the request in server logs. This is needed to deliver and secure the website.",
          "To limit spam we use a salted hash of your IP address to limit how often requests can be sent. We do not store the plain address for this purpose.",
        ],
      },
      {
        heading: "Why we use your data, and the legal basis",
        list: [
          "To answer your request and prepare an offer: steps at your request before a contract (Art. 6(1)(b) GDPR)",
          "To send you the confirmation email and follow up on your request (Art. 6(1)(b) GDPR)",
          "To protect the website and the form against abuse with a bot check and rate limiting (legitimate interest, Art. 6(1)(f) GDPR)",
          "To understand which campaigns lead to requests (legitimate interest, Art. 6(1)(f) GDPR; to be reviewed together with our cookie and consent setup)",
          "To measure how the site is used and whether ads lead to requests, with optional analytics and marketing tools (Google Analytics, Google Ads, Meta Pixel), only if you consent in the cookie banner (Art. 6(1)(a) GDPR; storage on your device under § 25 TDDDG). You can withdraw it at any time with “Cookie settings” in the footer.",
          "Where we ask for your consent, for example when you submit the planner form, we rely on it (Art. 6(1)(a) GDPR). You can withdraw it at any time with effect for the future.",
        ],
      },
      {
        heading: "Who receives your data",
        paragraphs: [
          "We use service providers who process data on our behalf. The list will be confirmed before launch. Currently planned:",
        ],
        list: [
          "Hosting of the website (provider to be confirmed)",
          "Supabase, for the database that stores your request",
          "Resend, to send emails (the confirmation to you and the notification to our team)",
          "Cloudflare Turnstile, to check that a request comes from a person",
          "Google (Google Analytics and Google Ads) and Meta (Meta Pixel), only if you allow analytics or marketing cookies",
        ],
      },
      {
        heading: "Sharing with partner companies",
        paragraphs: [
          "ELZORA does not run the tours itself. To prepare an offer we may pass the details of your request to local partner companies in Egypt that organise and operate trips. We share only what is needed for your request, and only with partners who have agreed to use it solely to prepare your offer.",
          "Egypt is outside the European Economic Area. Before data is shared with a partner, we make sure an appropriate safeguard is in place for the transfer (details to be confirmed).",
        ],
      },
      {
        heading: "How long we keep your data",
        paragraphs: [
          "We keep your request only as long as we need it to answer you, prepare an offer and handle follow-up questions, and then delete or anonymise it. The exact retention period will be set and published here before launch.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You have the right to access, correct and delete your data, to restrict or object to its processing, to receive it in a portable format and to withdraw your consent. You can also complain to a data protection supervisory authority.",
          "To use these rights, contact us through the contact page and quote the reference code of your request.",
        ],
      },
      {
        heading: "Cookies and similar technologies",
        paragraphs: [
          "How we use cookies and your browser’s storage is described in the Cookie Policy.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: ["We may update this policy. The date at the top shows the latest version."],
      },
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    description:
      "Wie ELZORA mit den personenbezogenen Daten umgeht, die Sie bei einer Reiseanfrage senden, und welche Rechte Sie haben.",
    updated: "2026-11-23",
    intro:
      "Diese Seite erklärt, welche personenbezogenen Daten wir erheben, wenn Sie diese Website nutzen und eine Reiseanfrage senden, warum wir sie erheben, wer sie erhält und welche Rechte Sie haben. Es ist ein Arbeitsentwurf: Angaben, die als „noch zu bestätigen“ gekennzeichnet sind, werden vor dem Start der Website ergänzt.",
    sections: [
      {
        heading: "Verantwortlicher",
        paragraphs: [
          "ELZORA ist der Arbeitsname dieser Website. Der vollständige Name, die Postanschrift und die E-Mail-Adresse des Betreibers, der für Ihre Daten verantwortlich ist, werden vor dem Start hier und im Impressum veröffentlicht.",
          "Bis dahin erreichen Sie uns über die Kontaktseite.",
        ],
      },
      {
        heading: "Welche Daten wir verarbeiten",
        paragraphs: ["Wenn Sie über den Reiseplaner eine Reiseanfrage senden, verarbeiten wir:"],
        list: [
          "Ihren Namen, Ihre E-Mail-Adresse, Ihr Wohnsitzland und, wenn Sie sie angeben, Ihre Telefonnummer",
          "Ihre Reisepläne: Reisedaten oder einen flexiblen Zeitraum, die Anzahl der Erwachsenen und Kinder (und das Alter der Kinder), Interessen, Reisedauer, Budgetrahmen und Ihre Anmerkungen",
          "Die Sprache der Website, die Sie genutzt haben",
          "Über welche Seite oder Kampagne Sie zu uns gekommen sind (Kampagnenparameter, die Website, von der Sie kamen, und die erste geöffnete Seite), damit wir verstehen, welche Kanäle funktionieren",
          "Wenn Sie Marketing-Cookies erlauben und über eine Google- oder Meta-Anzeige gekommen sind: die Klick-Kennung der Anzeige im Link (gclid oder fbclid), gespeichert mit Ihrer Anfrage",
          "Datum und Version Ihrer Einwilligung sowie einen Referenzcode für Ihre Anfrage",
        ],
        after: [
          "Wenn Sie die Website nur ansehen, verarbeitet unser Hosting-Anbieter technische Daten wie Ihre IP-Adresse, den Browsertyp und den Zeitpunkt der Anfrage in Server-Protokollen. Das ist nötig, um die Website auszuliefern und abzusichern.",
          "Zur Eindämmung von Spam verwenden wir einen mit einem Schlüssel versehenen Hashwert Ihrer IP-Adresse, um zu begrenzen, wie oft Anfragen gesendet werden können. Die IP-Adresse selbst speichern wir dafür nicht im Klartext.",
        ],
      },
      {
        heading: "Zwecke und Rechtsgrundlagen",
        list: [
          "Beantwortung Ihrer Anfrage und Erstellung eines Angebots: Maßnahmen auf Ihre Anfrage vor Vertragsschluss (Art. 6 Abs. 1 lit. b DSGVO)",
          "Versand der Bestätigung per E-Mail und Nachverfolgung Ihrer Anfrage (Art. 6 Abs. 1 lit. b DSGVO)",
          "Schutz der Website und des Formulars vor Missbrauch durch Bot-Prüfung und Begrenzung der Anfragehäufigkeit (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO)",
          "Auswertung, welche Kampagnen zu Anfragen führen (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO; wird zusammen mit unserer Cookie- und Einwilligungslösung geprüft)",
          "Messung, wie die Website genutzt wird und ob Anzeigen zu Anfragen führen, mit optionalen Analyse- und Marketing-Werkzeugen (Google Analytics, Google Ads, Meta-Pixel), nur wenn Sie im Cookie-Banner einwilligen (Art. 6 Abs. 1 lit. a DSGVO; Speicherung auf Ihrem Gerät nach § 25 TDDDG). Sie können die Einwilligung jederzeit über „Cookie-Einstellungen“ in der Fußzeile widerrufen.",
          "Wo wir um Ihre Einwilligung bitten, etwa beim Absenden des Reiseplaners, stützen wir uns darauf (Art. 6 Abs. 1 lit. a DSGVO). Sie können sie jederzeit mit Wirkung für die Zukunft widerrufen.",
        ],
      },
      {
        heading: "Wer Ihre Daten erhält",
        paragraphs: [
          "Wir setzen Dienstleister ein, die Daten in unserem Auftrag verarbeiten. Die Liste wird vor dem Start bestätigt. Derzeit vorgesehen sind:",
        ],
        list: [
          "Hosting der Website (Anbieter noch zu bestätigen)",
          "Supabase für die Datenbank, in der Ihre Anfrage gespeichert wird",
          "Resend für den E-Mail-Versand (Bestätigung an Sie und Benachrichtigung an unser Team)",
          "Cloudflare Turnstile, um zu prüfen, ob eine Anfrage von einer Person stammt",
          "Google (Google Analytics und Google Ads) und Meta (Meta-Pixel), nur wenn Sie Analyse- oder Marketing-Cookies erlauben",
        ],
      },
      {
        heading: "Weitergabe an Partnerunternehmen",
        paragraphs: [
          "ELZORA führt die Reisen nicht selbst durch. Um ein Angebot vorzubereiten, können wir die Angaben Ihrer Anfrage an lokale Partnerunternehmen in Ägypten weitergeben, die Reisen organisieren und durchführen. Wir geben nur weiter, was für Ihre Anfrage nötig ist, und nur an Partner, die zugesagt haben, die Daten ausschließlich zur Vorbereitung Ihres Angebots zu verwenden.",
          "Ägypten liegt außerhalb des Europäischen Wirtschaftsraums. Bevor Daten an einen Partner gehen, stellen wir sicher, dass für die Übermittlung geeignete Garantien bestehen (Einzelheiten noch zu bestätigen).",
        ],
      },
      {
        heading: "Speicherdauer",
        paragraphs: [
          "Wir speichern Ihre Anfrage nur so lange, wie wir sie brauchen, um Ihnen zu antworten, ein Angebot vorzubereiten und Rückfragen zu klären. Danach löschen oder anonymisieren wir sie. Die genaue Aufbewahrungsfrist legen wir vor dem Start fest und veröffentlichen sie hier.",
        ],
      },
      {
        heading: "Ihre Rechte",
        paragraphs: [
          "Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten, auf Einschränkung der Verarbeitung und Widerspruch, auf Datenübertragbarkeit sowie auf Widerruf Ihrer Einwilligung. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.",
          "Um Ihre Rechte auszuüben, kontaktieren Sie uns über die Kontaktseite und nennen Sie den Referenzcode Ihrer Anfrage.",
        ],
      },
      {
        heading: "Cookies und ähnliche Technologien",
        paragraphs: [
          "Wie wir Cookies und den Speicher Ihres Browsers nutzen, steht in der Cookie-Richtlinie.",
        ],
      },
      {
        heading: "Änderungen",
        paragraphs: [
          "Wir können diese Erklärung aktualisieren. Das Datum oben zeigt die aktuelle Fassung.",
        ],
      },
    ],
  },
};
