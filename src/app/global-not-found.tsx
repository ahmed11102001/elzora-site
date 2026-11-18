import type { Metadata } from "next";
import { cormorant, inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 | ELZORA",
};

// Used for every URL that matches no route. It bypasses the [lang] layout, so it has its own
// <html>, cannot know the visitor's locale and therefore shows both languages.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-gold uppercase">404</p>
        <h1 className="font-display text-5xl font-semibold sm:text-6xl">Page not found</h1>
        <p className="text-sand/80">The page you are looking for does not exist.</p>
        <p className="text-sand/80" lang="de">
          Die gesuchte Seite existiert nicht.
        </p>
        <div className="mt-2 flex gap-3">
          {/* Plain <a> on purpose: a full page load leaves this standalone 404 shell. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/en"
            className="rounded-full bg-gold px-6 py-3 font-semibold text-ink transition-colors hover:bg-sand"
          >
            Home
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/de"
            lang="de"
            className="rounded-full border border-sand/50 px-6 py-3 font-semibold text-sand transition-colors hover:border-gold hover:text-gold"
          >
            Startseite
          </a>
        </div>
      </body>
    </html>
  );
}
