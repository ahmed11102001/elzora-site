import type { FieldErrors, LeadInput } from "./schema";

// Browser side of the submission: one fetch wrapper plus the reference-code hand-off to the
// confirmation page. The reference code is not personal data and is public by design; it is kept in
// sessionStorage (not in the URL) so the confirmation page survives a refresh but cannot be linked to.

export type SubmitOutcome =
  | { kind: "success"; referenceCode: string; duplicate: boolean }
  | { kind: "validation"; fieldErrors: FieldErrors }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "captcha_failed" }
  | { kind: "service" } // storage/captcha unavailable or unexpected server error
  | { kind: "network" };

export async function postLead(payload: LeadInput, signal?: AbortSignal): Promise<SubmitOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    return { kind: "network" };
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON error page from a proxy: handled by status below.
  }

  if (response.ok && data.ok === true && typeof data.referenceCode === "string") {
    return {
      kind: "success",
      referenceCode: data.referenceCode,
      duplicate: data.duplicate === true,
    };
  }
  if (response.status === 422 && data.fieldErrors && typeof data.fieldErrors === "object") {
    return { kind: "validation", fieldErrors: data.fieldErrors as FieldErrors };
  }
  if (response.status === 429) {
    return {
      kind: "rate_limited",
      retryAfterSeconds: typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : 60,
    };
  }
  if (response.status === 403) return { kind: "captcha_failed" };
  return { kind: "service" };
}

const REFERENCE_KEY = "elzora:last-reference";

export function saveReference(code: string) {
  try {
    sessionStorage.setItem(REFERENCE_KEY, code);
  } catch {
    // Blocked storage: the confirmation page falls back to its generic state.
  }
}

export function readReference(): string | null {
  try {
    return sessionStorage.getItem(REFERENCE_KEY);
  } catch {
    return null;
  }
}
