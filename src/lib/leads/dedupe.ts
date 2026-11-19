import { createHash } from "node:crypto";
import type { ValidLead } from "./schema";

/**
 * Fingerprint of the answers that define an inquiry. Two submissions with the same fingerprint
 * within a short window are the same inquiry (double click, back button, resubmit), so the second
 * one gets the first reference code instead of creating a second lead. Notes are left out on purpose.
 */
export function dedupeHash(lead: ValidLead): string {
  const canonical = JSON.stringify([
    lead.email,
    lead.fullName.toLowerCase(),
    lead.dateMode,
    lead.arrival ?? null,
    lead.departure ?? null,
    lead.flexibleWhen ?? null,
    lead.adults,
    lead.children,
    lead.childrenAges,
    lead.interests,
    lead.duration,
    lead.budget,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
