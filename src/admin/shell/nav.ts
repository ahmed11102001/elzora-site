// Dashboard navigation. Links are relative to the admin host (it is served at its own root).
// `soon` items are visible so the Owner sees the roadmap, but not clickable until their milestone ships.
import type { Permission } from "../auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  permission?: Permission;
  soon?: string; // milestone that delivers it
};

export const NAV: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/trips", label: "Trips", permission: "trips.manage" },
  { href: "/leads", label: "Leads", permission: "leads.manage" },
  { href: "/partners", label: "Partners", permission: "partners.manage", soon: "7.6" },
  { href: "/kpis", label: "KPIs", permission: "kpi.read" },
  { href: "/seo", label: "SEO", permission: "trips.manage" },
  { href: "/settings", label: "Settings" },
];
