import type { Locale } from "@/i18n/config";
import { renderTeamEmail, renderTravelerEmail, type TravelerEmailCopy } from "./emails";
import { buildWhatsAppUrl } from "./whatsapp";
import type { LeadStorage, StoredLead } from "./types";

// Emails go out through Resend's HTTP API (no SDK needed). The lead is already saved when this runs,
// so a failure here only records why, in the database, and the lead stays valid. Failed or missing
// notifications are picked up again by retryPendingNotifications (see the admin retry endpoint).
// Resend's Idempotency-Key makes a retry safe: the same email is never delivered twice.

export type OutgoingEmail = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
};
export type SendResult = { ok: true } | { ok: false; reason: string };
export type EmailSender = (email: OutgoingEmail) => Promise<SendResult>;

type Env = Record<string, string | undefined>;

export function createResendSender(
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): EmailSender | null {
  const apiKey = env.RESEND_API_KEY;
  const from = env.LEADS_EMAIL_FROM;
  if (!apiKey || !from) return null;

  return async (email) => {
    try {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": email.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok ? { ok: true } : { ok: false, reason: `http_${response.status}` };
    } catch {
      return { ok: false, reason: "network" };
    }
  };
}

export type NotifyDeps = {
  storage: LeadStorage;
  /** null when Resend is not configured. */
  send: EmailSender | null;
  teamInbox?: string;
  whatsappNumber?: string;
  copyFor: (locale: Locale) => Promise<TravelerEmailCopy>;
  log?: (message: string, details: Record<string, string | number>) => void;
};

const defaultLog: NonNullable<NotifyDeps["log"]> = (message, details) =>
  console.error(`[leads] ${message}`, details);

/** Sends the team notification and the traveler confirmation. Never throws. */
export async function notifyLead(lead: StoredLead, deps: NotifyDeps): Promise<void> {
  const log = deps.log ?? defaultLog;

  const run = async (kind: "team" | "traveler", job: () => Promise<SendResult>) => {
    if ((kind === "team" ? lead.teamNotifiedAt : lead.travelerNotifiedAt) !== null) return;
    let result: SendResult;
    try {
      result = await job();
    } catch {
      result = { ok: false, reason: "render_error" };
    }
    try {
      await deps.storage.recordNotification(lead.id, kind, result);
    } catch {
      log("could not record notification outcome", { leadId: lead.id, kind });
    }
    // Reference code and kind only: no personal data in logs.
    if (!result.ok)
      log("notification failed", { ref: lead.referenceCode, kind, reason: result.reason });
  };

  const notConfigured: SendResult = { ok: false, reason: "not_configured" };

  await run("team", async () => {
    if (!deps.send || !deps.teamInbox) return notConfigured;
    const email = renderTeamEmail(lead);
    return deps.send({
      to: deps.teamInbox
        .split(",")
        .map((address) => address.trim())
        .filter(Boolean),
      ...email,
      replyTo: lead.email,
      idempotencyKey: `lead-${lead.id}-team`,
    });
  });

  await run("traveler", async () => {
    if (!deps.send) return notConfigured;
    const copy = await deps.copyFor(lead.locale);
    const whatsappUrl = buildWhatsAppUrl(
      deps.whatsappNumber,
      copy.whatsappMessage.replace("{reference}", lead.referenceCode),
    );
    const email = renderTravelerEmail(lead, copy, whatsappUrl);
    return deps.send({
      to: [lead.email],
      ...email,
      idempotencyKey: `lead-${lead.id}-traveler`,
    });
  });
}

/** Re-sends notifications that never succeeded. Returns how many leads were processed. */
export async function retryPendingNotifications(deps: NotifyDeps, limit = 20): Promise<number> {
  const pending = await deps.storage.listPendingNotifications(limit);
  for (const lead of pending) await notifyLead(lead, deps);
  return pending.length;
}
