// First-touch attribution (UTM + referrer + landing page). Client-safe, no personal data.
// It is captured on the visitor's first page view and kept in sessionStorage for the tab session,
// so a visitor who lands on a campaign page and opens the planner a few pages later is still
// attributed to the campaign. Form answers are NEVER stored in the browser.

export type Attribution = {
  source?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export const ATTRIBUTION_STORAGE_KEY = "elzora:attribution";

const clip = (value: string | null | undefined, max: number) => {
  const text = (value ?? "")
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, max);
  return text || undefined;
};

/** Reads utm_* from a query string and builds the attribution for this page view. */
export function readAttribution(input: {
  search: string;
  pathname: string;
  referrer: string;
  ownHost: string;
}): Attribution {
  const params = new URLSearchParams(input.search);
  const utmSource = clip(params.get("utm_source"), 100);

  let referrer: string | undefined;
  let referrerHost: string | undefined;
  try {
    if (input.referrer) {
      const url = new URL(input.referrer);
      if (url.host !== input.ownHost) {
        referrerHost = url.hostname;
        // Origin + path only: query strings in referrers can carry tokens or personal data.
        referrer = clip(`${url.origin}${url.pathname}`, 300);
      }
    }
  } catch {
    // Malformed referrer: ignore.
  }

  return {
    source: utmSource ?? referrerHost ?? "direct",
    landingPage: clip(input.pathname, 300),
    referrer,
    utmSource,
    utmMedium: clip(params.get("utm_medium"), 100),
    utmCampaign: clip(params.get("utm_campaign"), 150),
    utmContent: clip(params.get("utm_content"), 150),
    utmTerm: clip(params.get("utm_term"), 150),
  };
}

const hasUtm = (a: Attribution) => Boolean(a.utmSource || a.utmMedium || a.utmCampaign);

/**
 * First touch wins. The only exception: a stored visit without any campaign data is upgraded when
 * a later page view in the same session carries UTM parameters.
 */
export function mergeAttribution(stored: Attribution | null, current: Attribution): Attribution {
  if (!stored) return current;
  if (!hasUtm(stored) && hasUtm(current)) return current;
  return stored;
}

export function loadAttribution(storage: Pick<Storage, "getItem">): Attribution {
  try {
    const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

export function captureAttribution(
  storage: Pick<Storage, "getItem" | "setItem">,
  current: Attribution,
): Attribution {
  const stored = (() => {
    try {
      const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Attribution) : null;
    } catch {
      return null;
    }
  })();
  const merged = mergeAttribution(stored, current);
  if (merged !== stored) {
    try {
      storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Storage blocked (private mode): attribution is simply not preserved.
    }
  }
  return merged;
}
