// Server-side Cloudflare Turnstile verification. The secret key never leaves the server.
// Behaviour:
//   secret set                       -> a valid token is required.
//   no secret, development/test      -> skipped (a warning is logged once). Use Cloudflare's test keys
//                                       to exercise the full flow locally, see .env.example.
//   no secret, production            -> fails closed ("unavailable") unless TURNSTILE_DISABLED=true,
//                                       which is an explicit, logged opt-out and not recommended.

export type TurnstileOutcome = "ok" | "failed" | "unavailable" | "skipped";

type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
let warned = false;

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp: string | undefined,
  options: { env?: Env; fetchImpl?: Fetch; idempotencyKey?: string } = {},
): Promise<TurnstileOutcome> {
  const env = options.env ?? process.env;
  const secret = env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (env.NODE_ENV === "production") {
      if (env.TURNSTILE_DISABLED === "true") {
        if (!warned) console.warn("[leads] Turnstile verification is explicitly disabled.");
        warned = true;
        return "skipped";
      }
      console.error("[leads] TURNSTILE_SECRET_KEY is missing in production; refusing submissions.");
      return "unavailable";
    }
    if (!warned)
      console.warn("[leads] TURNSTILE_SECRET_KEY not set; skipping Turnstile (dev only).");
    warned = true;
    return "skipped";
  }

  if (!token) return "failed";

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
    if (options.idempotencyKey) body.set("idempotency_key", options.idempotencyKey);
    const response = await (options.fetchImpl ?? fetch)(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return "unavailable";
    const result = (await response.json()) as { success?: boolean };
    return result.success === true ? "ok" : "failed";
  } catch {
    return "unavailable";
  }
}
