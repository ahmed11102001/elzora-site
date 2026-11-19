import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminHost, isAdminPath } from "@/admin/config";
import { defaultLocale, hasLocale, locales, type Locale } from "@/i18n/config";

/** Picks the best supported locale from the Accept-Language header. */
function negotiateLocale(header: string | null): Locale {
  if (!header) return defaultLocale;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((item) => item.tag && !Number.isNaN(item.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    const base = tag.split("-")[0];
    if (hasLocale(base)) return base;
  }
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dashboard (Phase 7.4A). Served only on the admin host; the public host never reaches /admin.
  if (isAdminHost(request.headers.get("host"))) {
    const { handleAdminRequest } = await import("@/admin/auth/proxy-session");
    return handleAdminRequest(request);
  }
  if (isAdminPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/not-found"; // no such route: answers with the normal 404 page
    return NextResponse.rewrite(url);
  }

  const hasPrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasPrefix) return NextResponse.next();

  const locale = negotiateLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, API routes and any path with a file extension (robots.txt, sitemap.xml, images…)
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
