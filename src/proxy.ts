import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAdminHost, isAdminPath } from "@/admin/config";
import { PREVIEW_COOKIE, previewSecret, verifyPreviewToken } from "@/lib/preview-token";
import { decideRoute, previewRewrite } from "@/lib/proxy-logic";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Admin dashboard: only served on the admin host.
  if (isAdminHost(request.headers.get("host"))) {
    const { handleAdminRequest } = await import("@/admin/auth/proxy-session");

    return handleAdminRequest(request);
  }

  // 2. Block admin routes on the public host.
  if (isAdminPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/not-found";

    return NextResponse.rewrite(url);
  }

  // 3. Draft preview: a trip address with a valid signed preview cookie is served by the preview page.
  const previewCookie = request.cookies.get(PREVIEW_COOKIE)?.value;
  if (previewCookie) {
    const access = verifyPreviewToken(previewCookie, previewSecret());
    const target = access ? previewRewrite(pathname, access.l) : null;

    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;

      return NextResponse.rewrite(url);
    }
  }

  // 4. Public routing and locale negotiation.
  const decision = decideRoute(pathname, request.headers.get("accept-language"));

  if (decision.type === "next") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = decision.pathname;

  if (decision.type === "rewrite") {
    return NextResponse.rewrite(url);
  }

  // 5. Preserve existing redirect behavior.
  return NextResponse.redirect(url, decision.permanent ? 308 : 307);
}

export const config = {
  // Skip Next internals, API routes and static files.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
