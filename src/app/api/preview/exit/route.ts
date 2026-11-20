import { cookies, draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview-token";

// Ends the preview: Draft Mode off, preview cookie gone.
export async function GET(request: NextRequest) {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_COOKIE);
  return NextResponse.redirect(new URL("/", request.url), {
    headers: { "Cache-Control": "no-store" },
  });
}
