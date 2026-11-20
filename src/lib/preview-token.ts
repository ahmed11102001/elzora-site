// Signed, short-lived preview tokens (7.4D). The dashboard signs one; the public host verifies it and then
// starts Draft Mode. Pure (no Next imports) so it is unit tested. The secret never leaves the server.
import { createHmac, timingSafeEqual } from "node:crypto";

export const PREVIEW_TTL_SECONDS = 15 * 60;
export const PREVIEW_COOKIE = "elzora_preview";

export type PreviewPayload = {
  /** Trip id. */
  t: string;
  /** Locale of the translation being previewed. */
  l: "en" | "de";
  /** Public path to open, always "/en/…" or "/de/…" (checked on both ends: no open redirect). */
  p: string;
  /** Expiry, seconds since the epoch. */
  e: number;
};

const b64 = (value: Buffer | string) => Buffer.from(value).toString("base64url");
const mac = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest();

/** A path that stays on this site and inside a locale. */
export const isSafePreviewPath = (path: unknown): path is string =>
  typeof path === "string" &&
  /^\/(en|de)\/[A-Za-z0-9\-._~/%]*$/.test(path) &&
  !path.includes("//") &&
  !path.includes("..");

export function signPreviewToken(
  input: Omit<PreviewPayload, "e">,
  secret: string,
  nowMs: number = Date.now(),
  ttlSeconds: number = PREVIEW_TTL_SECONDS,
): string {
  if (secret.length < 16) throw new Error("PREVIEW_SECRET must be at least 16 characters");
  const payload: PreviewPayload = { ...input, e: Math.floor(nowMs / 1000) + ttlSeconds };
  const body = b64(JSON.stringify(payload));
  return `${body}.${b64(mac(body, secret))}`;
}

/** Returns the payload for a genuine, unexpired token, otherwise null (never throws on bad input). */
export function verifyPreviewToken(
  token: string | null | undefined,
  secret: string,
  nowMs: number = Date.now(),
): PreviewPayload | null {
  if (!token || secret.length < 16 || token.length > 2048) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = mac(body, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PreviewPayload;
    if (typeof payload.t !== "string" || payload.t === "") return null;
    if (payload.l !== "en" && payload.l !== "de") return null;
    if (!isSafePreviewPath(payload.p)) return null;
    if (typeof payload.e !== "number" || payload.e * 1000 <= nowMs) return null;
    return payload;
  } catch {
    return null;
  }
}

export const previewSecret = (env: Record<string, string | undefined> = process.env) =>
  env.PREVIEW_SECRET?.trim() ?? "";
