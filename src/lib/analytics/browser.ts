// Browser side of tracking: sets Google Consent Mode v2 defaults, adds the tools only after consent,
// and exposes track(). Client-only; every function is a no-op on the server.
//
// Order of events on a page:
//   1. initConsentMode(): dataLayer + gtag stub + consent "default: denied". No network request.
//   2. applyConsent(choice): consent "update", then, if allowed, the tool scripts are added.
// A visitor who has not decided (or said no) never causes a request to Google or Meta.
//
// Consent Mode "basic" is used on purpose: the Google tag is not even loaded until a category is allowed.

import {
  cookieDomains,
  toGoogleConsent,
  trackingCookieNames,
  type ConsentChoice,
} from "../consent/consent";
import {
  hasAnalyticsTool,
  hasMarketingTool,
  trackingConfig,
  trackingEnabled,
  type TrackingConfig,
} from "./config";
import {
  sendEvent,
  sendPageView,
  type AnalyticsEvent,
  type EventParams,
  type Fbq,
  type Gtag,
  type PageViewState,
} from "./events";

type TrackWindow = Window & {
  dataLayer?: unknown[];
  gtag?: Gtag;
  fbq?: Fbq & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean };
  _fbq?: unknown;
};

const runtime = {
  consent: { analytics: false, marketing: false } as ConsentChoice,
  gtagScript: false,
  gaConfigured: false,
  adsConfigured: false,
  fbqLoaded: false,
  defaultsSet: false,
  pageViews: { ga: null, meta: null } as PageViewState,
  fired: new Set<string>(),
};

const win = () => (typeof window === "undefined" ? null : (window as TrackWindow));

function addScript(src: string) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/** Step 1. Safe to call many times. Sends nothing anywhere. */
export function initConsentMode(): void {
  const w = win();
  if (!w || !trackingEnabled || runtime.defaultsSet) return;
  runtime.defaultsSet = true;
  w.dataLayer = w.dataLayer ?? [];
  // gtag.js needs the real `arguments` object in the queue, not an array.
  w.gtag =
    w.gtag ??
    function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
  w.gtag("consent", "default", { ...toGoogleConsent(null), wait_for_update: 500 });
  w.gtag("set", "ads_data_redaction", true);
  w.gtag("set", "url_passthrough", false);
}

function loadGoogle(config: TrackingConfig) {
  const w = win();
  if (!w || runtime.gtagScript) return;
  runtime.gtagScript = true;
  w.gtag?.("js", new Date());
  addScript(
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.ga4 || config.ads)}`,
  );
}

function loadMeta(config: TrackingConfig) {
  const w = win();
  if (!w || runtime.fbqLoaded) return;
  runtime.fbqLoaded = true;
  // Meta's standard loader, written out so no inline script is needed.
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as NonNullable<TrackWindow["fbq"]> & { queue: unknown[] };
  fbq.queue = [];
  fbq.loaded = true;
  w.fbq = fbq;
  w._fbq = fbq;
  addScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", config.meta);
}

/** Step 2. Call whenever the stored decision changes (and once at start with the stored decision). */
export function applyConsent(choice: ConsentChoice | null): void {
  const w = win();
  if (!w || !trackingEnabled) return;
  initConsentMode();
  const config = trackingConfig;
  const next: ConsentChoice = {
    analytics: choice?.analytics === true && hasAnalyticsTool(config),
    marketing: choice?.marketing === true && hasMarketingTool(config),
  };
  runtime.consent = next;

  w.gtag?.("consent", "update", toGoogleConsent(choice));

  const googleAllowed = (next.analytics && config.ga4) || (next.marketing && config.ads);
  if (googleAllowed) loadGoogle(config);

  if (next.analytics && config.ga4 && !runtime.gaConfigured) {
    runtime.gaConfigured = true;
    // Page views are sent by trackPageView (a single-page app has no page loads after the first).
    w.gtag?.("config", config.ga4, { send_page_view: false });
  }
  if (next.marketing && config.ads && !runtime.adsConfigured) {
    runtime.adsConfigured = true;
    w.gtag?.("config", config.ads);
  }
  if (next.marketing && config.meta) loadMeta(config);
}

const sinks = () => {
  const w = win();
  return {
    consent: runtime.consent,
    config: trackingConfig,
    gtag: runtime.gtagScript ? w?.gtag : undefined,
    fbq: runtime.fbqLoaded ? w?.fbq : undefined,
  };
};

/** Sends an event if, and only if, the matching tool is configured and allowed. Otherwise does nothing. */
export function track(event: AnalyticsEvent, params?: EventParams): void {
  if (!win() || !trackingEnabled) return;
  sendEvent(sinks(), event, params);
}

/** Like track, but only the first time for this key during the page view (React Strict Mode, Back, re-renders). */
export function trackOnce(event: AnalyticsEvent, params?: EventParams, key: string = event): void {
  if (!win() || !trackingEnabled || runtime.fired.has(key)) return;
  runtime.fired.add(key);
  track(event, params);
}

/** Call on every route change and after consent changes; it never sends the same path twice per tool. */
export function trackPageView(path: string): void {
  if (!win() || !trackingEnabled) return;
  sendPageView(sinks(), runtime.pageViews, path);
}

/** Best effort: removes analytics and advertising cookies after a visitor withdraws consent. */
export function clearTrackingCookies(): void {
  if (typeof document === "undefined") return;
  const names = trackingCookieNames(document.cookie);
  for (const name of names) {
    for (const domain of cookieDomains(location.hostname)) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    }
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}
