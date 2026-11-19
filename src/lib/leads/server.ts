import "server-only";
import { after } from "next/server";
import { getDictionary } from "@/i18n/dictionaries";
import { clientIp, rateLimitKey } from "./request-meta";
import { createResendSender, notifyLead, type NotifyDeps } from "./notifications";
import { postgresStorage } from "./storage";
import { submitLead, type SubmitDeps } from "./submit";
import { verifyTurnstile } from "./turnstile";

// Wires the framework-free lead logic to the real database, Turnstile and Resend.

export const MAX_BODY_BYTES = 32 * 1024;

export const noStore = { "Cache-Control": "no-store" } as const;

export function notifyDeps(): NotifyDeps {
  return {
    storage: postgresStorage,
    send: createResendSender(),
    teamInbox: process.env.LEADS_NOTIFY_TO,
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    copyFor: async (locale) => (await getDictionary(locale)).planner.email,
  };
}

export function submitDeps(): SubmitDeps {
  return {
    storage: postgresStorage,
    verifyTurnstile: (token, ip, idempotencyKey) => verifyTurnstile(token, ip, { idempotencyKey }),
    // Runs after the response is sent; notifyLead never throws and records failures in the database.
    notify: (lead) => after(() => notifyLead(lead, notifyDeps())),
    log: (event, details) => console.info(`[leads] ${event}`, details ?? {}),
  };
}

/** Rejects cross-site browser posts. Requests without an Origin header (curl, server-to-server) pass. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    const own = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return (
      host === own ||
      host === new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").host
    );
  } catch {
    return false;
  }
}

export { clientIp, rateLimitKey, submitLead };
