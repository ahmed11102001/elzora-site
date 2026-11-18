// Decides whether the animated journey may run. Kept separate and free of React so it is easy to read and test.

export type GateInput = {
  reducedMotion: boolean;
  saveData: boolean;
  effectiveType?: string;
  deviceMemory?: number;
};

/** Why the animated journey must not run, or null when it can. */
export function blockedReason(i: GateInput): string | null {
  if (i.reducedMotion) {
    return "the system asks for reduced motion (Windows: Settings > Accessibility > Visual effects > Animation effects; battery saver can turn it off). Add ?journey=animated to the URL to force the animation.";
  }
  if (i.saveData) return "Save-Data is on";
  if (["slow-2g", "2g", "3g"].includes(i.effectiveType ?? ""))
    return `slow connection (${i.effectiveType})`;
  if (i.deviceMemory !== undefined && i.deviceMemory <= 2)
    return `low device memory (${i.deviceMemory} GB)`;
  return null;
}

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

export function readGateInput(): GateInput {
  const nav = navigator as Navigator & { connection?: NetworkInfo; deviceMemory?: number };
  return {
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    effectiveType: nav.connection?.effectiveType,
    deviceMemory: nav.deviceMemory,
  };
}

/** ?journey=animated forces the animation (for testing), ?journey=static forces the static version. */
export function readOverride(search: string): "animated" | "static" | null {
  const value = new URLSearchParams(search).get("journey");
  return value === "animated" || value === "static" ? value : null;
}
