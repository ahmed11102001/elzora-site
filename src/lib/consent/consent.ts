// Cookie consent: the pure rules (no DOM, no React), so they can be unit tested.
//
// Two optional categories exist. Everything else the site uses is strictly necessary and needs no consent.
//   analytics  Google Analytics 4
//   marketing  Google Ads conversion measurement, Meta Pixel and the ad click identifiers (gclid, fbclid)
// Nothing optional runs until the visitor says yes, and "no" is as easy to give as "yes".

export type ConsentChoice = { analytics: boolean; marketing: boolean };

export type StoredConsent = ConsentChoice & {
  /** Bump when the categories change in a way that needs a new decision from everyone. */
  version: number;
  /** Epoch milliseconds when the visitor decided. */
  savedAt: number;
};

export const CONSENT_STORAGE_KEY = "elzora:consent";
export const CONSENT_VERSION = 1;
/** Ask again after about six months, so an old "yes" does not live forever. */
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

export const DENIED: ConsentChoice = { analytics: false, marketing: false };
export const GRANTED: ConsentChoice = { analytics: true, marketing: true };

/** Reads what was saved. Anything damaged, expired or from an older version counts as "no decision". */
export function parseConsent(raw: string | null | undefined, now: number): StoredConsent | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.analytics !== "boolean" ||
    typeof v.marketing !== "boolean" ||
    typeof v.savedAt !== "number" ||
    !Number.isFinite(v.savedAt) ||
    v.version !== CONSENT_VERSION
  ) {
    return null;
  }
  // A saved date in the future (clock changes, tampering) is not trusted either.
  if (v.savedAt > now + 60_000 || now - v.savedAt > CONSENT_MAX_AGE_MS) return null;
  return {
    analytics: v.analytics,
    marketing: v.marketing,
    version: CONSENT_VERSION,
    savedAt: v.savedAt,
  };
}

export function createConsent(choice: ConsentChoice, now: number): StoredConsent {
  return {
    analytics: choice.analytics === true,
    marketing: choice.marketing === true,
    version: CONSENT_VERSION,
    savedAt: now,
  };
}

type Signal = "granted" | "denied";

/** The consent signals Google tags understand (Consent Mode v2). */
export type GoogleConsentState = {
  ad_storage: Signal;
  ad_user_data: Signal;
  ad_personalization: Signal;
  analytics_storage: Signal;
  functionality_storage: Signal;
  security_storage: Signal;
};

/**
 * Maps our two categories to Consent Mode v2. Marketing covers the three advertising signals.
 * functionality and security storage are strictly necessary here (nothing is personalised).
 * No decision yet means everything optional is denied.
 */
export function toGoogleConsent(choice: ConsentChoice | null): GoogleConsentState {
  const analytics = choice?.analytics === true;
  const marketing = choice?.marketing === true;
  return {
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
    analytics_storage: analytics ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  };
}

/** True when a category that was allowed is now refused. The page must reload to stop its scripts. */
export function isWithdrawn(before: ConsentChoice | null, after: ConsentChoice | null): boolean {
  if (!before) return false;
  return (
    (before.analytics && !(after?.analytics ?? false)) ||
    (before.marketing && !(after?.marketing ?? false))
  );
}

const TRACKING_COOKIE = /^(_ga(_.+)?|_gid|_gat(_.+)?|_gcl_.+|_gac_.+|FPAU|_fbp|_fbc)$/;

/** Names of analytics and advertising cookies in a `document.cookie` string. */
export function trackingCookieNames(cookieHeader: string): string[] {
  return cookieHeader
    .split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter((name) => TRACKING_COOKIE.test(name));
}

/** Domains a cookie may have been set on: the host itself and each parent (never a bare TLD). */
export function cookieDomains(hostname: string): string[] {
  const labels = hostname.split(".").filter(Boolean);
  if (labels.length < 2 || /^\d+(\.\d+){3}$/.test(hostname)) return [hostname];
  const domains = [hostname];
  for (let i = 1; i <= labels.length - 2; i++) domains.push(`.${labels.slice(i).join(".")}`);
  domains.push(`.${hostname}`);
  return domains;
}
