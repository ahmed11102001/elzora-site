// Which measurement tools are configured. Every ID is optional; an empty or malformed one switches that
// tool off. With no tool configured the site sets nothing optional and shows no cookie banner.

export type TrackingConfig = {
  /** Google Analytics 4 measurement ID, "G-XXXXXXXXXX". */
  ga4: string;
  /** Google Ads conversion ID, "AW-123456789". */
  ads: string;
  /** Label of the Ads "lead" conversion action. Without it Ads is only configured, not counting leads. */
  adsLeadLabel: string;
  /** Meta (Facebook) Pixel ID, digits only. */
  meta: string;
};

const patterns = {
  ga4: /^G-[A-Z0-9]{6,20}$/,
  ads: /^AW-\d{6,15}$/,
  adsLeadLabel: /^[A-Za-z0-9_-]{6,40}$/,
  meta: /^\d{8,20}$/,
} as const;

const clean = (value: string | undefined, pattern: RegExp) => {
  const text = (value ?? "").trim();
  return pattern.test(text) ? text : "";
};

export function resolveTrackingConfig(
  raw: Partial<Record<keyof TrackingConfig, string | undefined>>,
) {
  const ads = clean(raw.ads, patterns.ads);
  return {
    ga4: clean(raw.ga4, patterns.ga4),
    ads,
    // A label means nothing without the Ads ID it belongs to.
    adsLeadLabel: ads ? clean(raw.adsLeadLabel, patterns.adsLeadLabel) : "",
    meta: clean(raw.meta, patterns.meta),
  } satisfies TrackingConfig;
}

export const hasAnalyticsTool = (c: TrackingConfig) => Boolean(c.ga4);
export const hasMarketingTool = (c: TrackingConfig) => Boolean(c.ads || c.meta);
export const isTrackingConfigured = (c: TrackingConfig) =>
  hasAnalyticsTool(c) || hasMarketingTool(c);

// NEXT_PUBLIC_* values are inlined at build time, so each one has to be read by its full name.
export const trackingConfig: TrackingConfig = resolveTrackingConfig({
  ga4: process.env.NEXT_PUBLIC_GA4_ID,
  ads: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
  adsLeadLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL,
  meta: process.env.NEXT_PUBLIC_META_PIXEL_ID,
});

export const trackingEnabled = isTrackingConfigured(trackingConfig);
