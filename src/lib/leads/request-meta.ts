import { createHash } from "node:crypto";

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for / x-real-ip). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Rate-limit key. The IP is salted and hashed so the database never holds raw addresses.
 * Set LEADS_HASH_SALT to a long random string in production (without it the hash is guessable).
 */
export function rateLimitKey(
  scope: string,
  ip: string,
  salt = process.env.LEADS_HASH_SALT ?? "",
): string {
  return `${scope}:${createHash("sha256").update(`${salt}|${ip}`).digest("hex").slice(0, 32)}`;
}
