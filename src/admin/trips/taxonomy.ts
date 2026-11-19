// Code-managed taxonomies the editor offers (plan section 6.5: no dashboard CRUD for these).
// Read straight from the seed files so the dashboard sees every option, whatever its status.
import manifest from "@/content/images.generated.json";
import { destinations } from "@/content/seed/destinations";
import { tripStyles } from "@/content/seed/trip-styles";

export type Option = { id: string; label: string };

export const STYLE_OPTIONS: Option[] = tripStyles.map((s) => ({ id: s.id, label: s.title.en }));
export const DESTINATION_OPTIONS: Option[] = destinations.map((d) => ({
  id: d.id,
  label: d.name.en,
}));

export type PhotoOption = { id: string; credit: string; licensed: boolean };

/** Photos that exist in the image pipeline. 7.4C replaces this with media_assets and signed uploads. */
export const PHOTO_OPTIONS: PhotoOption[] = Object.entries(manifest).map(([id, entry]) => ({
  id,
  credit: entry.credit,
  licensed: entry.status === "ok",
}));

export const photoLicensed = (id: string): "ok" | "unconfirmed" | "unknown" => {
  const entry = (manifest as Record<string, { status: string }>)[id];
  if (!entry) return "unknown";
  return entry.status === "ok" ? "ok" : "unconfirmed";
};

/** Small preview used in the editor. The files come from `npm run images` and are served on every host. */
export const photoThumb = (id: string) => `/images/${id}-640.webp`;
