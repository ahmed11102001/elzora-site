import "server-only";
import { clientIp, rateLimitKey } from "@/lib/leads/request-meta";
import { postgresStorage } from "@/lib/leads/storage";
import { StorageUnavailableError } from "@/lib/leads/types";

// Brute-force protection for login and the second factor, on top of Supabase's own limits. It reuses
// the shared `lead_rate_limits` table (salted hashes, never raw addresses).
// In production it fails closed: no database, no sign-in. In development it is skipped so the
// dashboard can be tried without DATABASE_URL.

export type LimitResult = "ok" | "limited" | "unavailable";

export async function checkLimit(
  scope: string,
  subject: string,
  headers: Headers,
  limit = 8,
  windowSeconds = 600,
): Promise<LimitResult> {
  try {
    const keys = [
      rateLimitKey(`admin:${scope}:ip`, clientIp(headers)),
      rateLimitKey(`admin:${scope}:id`, subject.toLowerCase()),
    ];
    for (const key of keys) {
      const result = await postgresStorage.hit(key, limit, windowSeconds);
      if (!result.allowed) return "limited";
    }
    return "ok";
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && error instanceof StorageUnavailableError)
      return "ok";
    return "unavailable";
  }
}
