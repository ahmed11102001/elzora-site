import { createHash, timingSafeEqual } from "node:crypto";

// There is no user/admin system in this project, so the lead export and the notification retry
// are gated by ONE shared secret (LEADS_ADMIN_TOKEN) sent as `Authorization: Bearer <token>`.
//  - Not configured (or shorter than 32 characters): the endpoints behave as if they did not exist.
//  - Never accepted in a URL, so it cannot end up in access logs or browser history.
// Deployment prerequisite: also protect /api/admin/* at the platform level (for example Vercel
// Deployment Protection / firewall rules) and rotate the token when a team member leaves.

export const MIN_TOKEN_LENGTH = 32;
export type AdminAccess = "ok" | "disabled" | "unauthorized";

const digest = (value: string) => createHash("sha256").update(value).digest();

export function authorizeAdmin(
  headers: Headers,
  token: string | undefined = process.env.LEADS_ADMIN_TOKEN,
): AdminAccess {
  if (!token || token.length < MIN_TOKEN_LENGTH) return "disabled";
  const header = headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return "unauthorized";
  return timingSafeEqual(digest(match[1].trim()), digest(token)) ? "ok" : "unauthorized";
}
