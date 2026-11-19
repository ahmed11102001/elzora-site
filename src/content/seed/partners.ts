import type { PartnerInput } from "../schema";

// INTERNAL registry, never rendered. Only the aggregate "all licenses verified" flag reaches a page
// (the "Licensed local partners" trust item).
//
// SAMPLE DATA for pre-launch review: this placeholder partner is marked verified only so the trust
// item shows while the site is being reviewed. Replace it with real partners (and only mark
// licenseVerified: true once the license has really been checked) before launch.
export const partners: PartnerInput[] = [
  {
    id: "sample-partner",
    internalName: "Sample partner (placeholder, replace before launch)",
    licenseVerified: true,
  },
];
