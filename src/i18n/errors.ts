import type { Locale } from "./config";

// Client-safe strings for error.tsx and not-found.tsx (these cannot receive route params,
// so they read the locale from the URL and cannot import the server-only dictionaries).
export const errorStrings: Record<
  Locale,
  { title: string; retry: string; notFoundTitle: string; notFoundText: string; back: string }
> = {
  en: {
    title: "Something went wrong",
    retry: "Try again",
    notFoundTitle: "Page not found",
    notFoundText: "The page you are looking for does not exist.",
    back: "Back to home",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    retry: "Erneut versuchen",
    notFoundTitle: "Seite nicht gefunden",
    notFoundText: "Die gesuchte Seite existiert nicht.",
    back: "Zurück zur Startseite",
  },
};
