import "server-only";
// For the public data layer (7.3): "may this request see the DRAFT of this trip?". True only when the
// visitor holds a genuine preview cookie for exactly this trip and language. Draft Mode alone is not
// enough, so one preview link never unlocks other drafts. Reads cookies, so call it from dynamic code
// (not inside a cached scope).
import { cookies, draftMode } from "next/headers";
import { PREVIEW_COOKIE, previewSecret, verifyPreviewToken } from "./preview-token";

export async function hasPreviewAccess(tripId: string, locale: "en" | "de"): Promise<boolean> {
  if (!(await draftMode()).isEnabled) return false;
  const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
  const payload = verifyPreviewToken(token, previewSecret());
  return payload !== null && payload.t === tripId && payload.l === locale;
}
