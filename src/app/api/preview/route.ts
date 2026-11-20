import { cookies, draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE, previewSecret, verifyPreviewToken } from "@/lib/preview-token";

// Starts a draft preview on the PUBLIC host. Needs a token signed by the dashboard (15 minutes).
// The token is in the address, so the response is never cached and sends no referrer.
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function GET(request: NextRequest) {
  const secret = previewSecret();
  const payload = secret
    ? verifyPreviewToken(request.nextUrl.searchParams.get("token"), secret)
    : null;
  // Same answer for "no secret configured" and "bad token": nothing to learn from the difference.
  if (!payload) return new NextResponse("Not found", { status: 404, headers });

  (await draftMode()).enable();
  (await cookies()).set(PREVIEW_COOKIE, request.nextUrl.searchParams.get("token") ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(1, payload.e - Math.floor(Date.now() / 1000)),
  });
  return NextResponse.redirect(new URL(payload.p, request.url), { headers });
}
