import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { cormorant, inter } from "../fonts";
import "../globals.css";

// Root layout of the dashboard (a second root layout next to app/[lang]/layout.tsx). It is only ever
// reached through the admin host, and it is never indexed.
export const metadata: Metadata = {
  title: { default: "ELZORA Dashboard", template: "%s | ELZORA Dashboard" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable}`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-dvh bg-[#f7f4ee] text-ink">
        <Suspense fallback={<p className="p-8 text-sm text-ink/60">Loading…</p>}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
