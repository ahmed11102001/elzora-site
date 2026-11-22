import "server-only";
// For the public pages (7.3/7.4D): "may this request see a DRAFT of this trip?". True only when the visitor
// holds a genuine, unexpired preview cookie for exactly this trip and language. Draft Mode alone is not
// enough, so one preview link never unlocks other drafts. Reads cookies, so call it from dynamic code
// (inside <Suspense>, never inside a cached function).
import { cookies, draftMode } from "next/headers";
import {
  PREVIEW_COOKIE,
  previewSecret,
  verifyPreviewToken,
  type PreviewPayload,
} from "./preview-token";

export async function getPreviewPayload(): Promise<PreviewPayload | null> {
  if (!(await draftMode()).isEnabled) return null;
  const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
  return verifyPreviewToken(token, previewSecret());
}

export async function hasPreviewAccess(tripId: string, locale: "en" | "de"): Promise<boolean> {
  const payload = await getPreviewPayload();
  return payload !== null && payload.t === tripId && payload.l === locale;
}
