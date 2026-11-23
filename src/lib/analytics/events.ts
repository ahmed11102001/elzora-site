// The event map and the rules for sending an event. Pure: the browser pieces (gtag, fbq) are passed in,
// so the rules can be unit tested without a browser.
//
// Event          Fires when
// view_journey      the scroll journey crosses the middle of the screen (once per page view)
// journey_station_N the visitor reaches station N (1 Alexandria ... 5 Abu Simbel), once each
// planner_start     the trip planner opens (once per page view)
// planner_step_N    step N of the planner is shown (once each)
// lead_submit       a trip request was saved by the server (once per reference code)
// whatsapp_click    a link to WhatsApp was clicked
//
// Events never carry personal data: no name, email, phone or free text. Only the keys below are sent.

import { hasAnalyticsTool, type TrackingConfig } from "./config";
import type { ConsentChoice } from "../consent/consent";

export type AnalyticsEvent =
  | "view_journey"
  | `journey_station_${1 | 2 | 3 | 4 | 5}`
  | "planner_start"
  | `planner_step_${1 | 2 | 3 | 4 | 5 | 6 | 7}`
  | "lead_submit"
  | "whatsapp_click";

const EVENT_NAME =
  /^(view_journey|journey_station_[1-5]|planner_start|planner_step_[1-7]|lead_submit|whatsapp_click)$/;
export const isAnalyticsEvent = (name: string): name is AnalyticsEvent => EVENT_NAME.test(name);

export const PARAM_KEYS = ["locale", "location", "trip", "source"] as const;
export type EventParams = Partial<Record<(typeof PARAM_KEYS)[number], string>>;

const looksPersonal = (text: string) => text.includes("@") || (text.match(/\d/g)?.length ?? 0) >= 7;

/** Keeps only the allowed keys, trims values, and drops anything that looks like an email or a phone. */
export function sanitizeParams(params: EventParams | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!params) return out;
  for (const key of PARAM_KEYS) {
    const value = params[key];
    if (typeof value !== "string") continue;
    const text = value
      .replace(/\p{Cc}/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 100);
    if (text && !looksPersonal(text)) out[key] = text;
  }
  return out;
}

export type Gtag = (...args: unknown[]) => void;
export type Fbq = (...args: unknown[]) => void;

export type Sinks = {
  consent: ConsentChoice;
  config: TrackingConfig;
  /** Set once gtag.js was added to the page. */
  gtag?: Gtag;
  /** Set once the Meta Pixel was added to the page. */
  fbq?: Fbq;
};

/**
 * Sends one event to every tool that is configured AND allowed. A tool whose category is refused gets
 * nothing, not even an anonymous ping.
 */
export function sendEvent(sinks: Sinks, event: AnalyticsEvent, params?: EventParams): void {
  if (!isAnalyticsEvent(event)) return;
  const clean = sanitizeParams(params);
  const { consent, config, gtag, fbq } = sinks;

  if (consent.analytics && hasAnalyticsTool(config) && gtag) {
    gtag("event", event, { ...clean, send_to: config.ga4 });
  }
  if (consent.marketing) {
    if (event === "lead_submit" && config.ads && config.adsLeadLabel && gtag) {
      gtag("event", "conversion", { send_to: `${config.ads}/${config.adsLeadLabel}` });
    }
    if (config.meta && fbq) {
      if (event === "lead_submit") fbq("track", "Lead");
      if (event === "whatsapp_click") fbq("track", "Contact");
    }
  }
}

export type PageViewState = { ga: string | null; meta: string | null };

/** Page views: once per path and tool, and only for a tool that is allowed and loaded. */
export function sendPageView(sinks: Sinks, state: PageViewState, path: string): void {
  const { consent, config, gtag, fbq } = sinks;
  if (consent.analytics && hasAnalyticsTool(config) && gtag && state.ga !== path) {
    state.ga = path;
    gtag("event", "page_view", {
      send_to: config.ga4,
      page_path: path,
      page_location: typeof location === "undefined" ? undefined : location.href,
    });
  }
  if (consent.marketing && config.meta && fbq && state.meta !== path) {
    state.meta = path;
    fbq("track", "PageView");
  }
}
