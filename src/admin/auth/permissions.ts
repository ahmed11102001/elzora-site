// Roles and permissions. Authorization is decided here, on the server, for every protected page and
// action. Hiding a button is never authorization.

export const PERMISSIONS = [
  "trips.manage",
  "trips.publish",
  "leads.manage",
  "leads.export",
  "partners.manage",
  "kpi.read",
  "users.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type Role = "owner" | "admin";

const GRANTS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  // Admin is added when a second person exists (document D9). Until then it grants nothing
  // dangerous: no user management. Adjust here, not in pages.
  admin: [
    "trips.manage",
    "trips.publish",
    "leads.manage",
    "leads.export",
    "partners.manage",
    "kpi.read",
  ],
};

export const can = (role: Role, permission: Permission): boolean =>
  GRANTS[role].includes(permission);

export type AuthUser = { id: string; email?: string | null; emailConfirmed: boolean };

/**
 * Which role a signed-in user has, or null when the account may not use the dashboard.
 * Today only owners exist and they come from DASHBOARD_OWNER_EMAILS. The seam for 7.4C: replace this
 * lookup with the `dashboard_users` table (user id -> role) without touching any caller.
 * An unconfirmed e-mail never counts, so a self-registered address cannot become an owner.
 */
export function roleFor(user: AuthUser, owners: string[]): Role | null {
  const email = user.email?.trim().toLowerCase();
  if (!email || !user.emailConfirmed) return null;
  return owners.includes(email) ? "owner" : null;
}
