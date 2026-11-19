import "server-only";
import { redirect } from "next/navigation";
import { ownerEmails } from "../config";
import { recordAudit } from "../audit";
import { can, roleFor, type AuthUser, type Permission, type Role } from "./permissions";
import { createSupabase } from "./supabase";

export type Session =
  | { state: "unconfigured" }
  | { state: "anonymous" }
  | { state: "forbidden"; user: AuthUser }
  | { state: "needs_mfa_enroll" | "needs_mfa_verify"; user: AuthUser; role: Role }
  | { state: "ok"; user: AuthUser; role: Role };

/**
 * Where the visitor stands. Uses getUser(), which asks Supabase to validate the token, never the
 * unverified cookie contents. Every dashboard user needs a second factor (TOTP): a password alone
 * never opens the dashboard.
 */
export async function getSession(): Promise<Session> {
  const supabase = await createSupabase();
  if (!supabase) return { state: "unconfigured" };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { state: "anonymous" };

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    emailConfirmed: Boolean(data.user.email_confirmed_at),
  };
  const role = roleFor(user, ownerEmails());
  if (!role) return { state: "forbidden", user };

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") return { state: "ok", user, role };
  return { state: aal?.nextLevel === "aal2" ? "needs_mfa_verify" : "needs_mfa_enroll", user, role };
}

/** Where each non-"ok" state belongs. Paths are relative to the admin host. */
export const LANDING: Record<Exclude<Session["state"], "ok">, string> = {
  unconfigured: "/login",
  anonymous: "/login",
  forbidden: "/forbidden",
  needs_mfa_enroll: "/mfa",
  needs_mfa_verify: "/mfa",
};

/**
 * Call at the top of EVERY dashboard page and server action (layouts do not re-run on client
 * navigation, so a layout check alone is not enough). Redirects when the visitor may not be here and
 * returns the user and role otherwise. Pass a permission for anything beyond viewing the overview.
 */
export async function requireSession(permission?: Permission) {
  const session = await getSession();
  if (session.state !== "ok") {
    if (session.state === "forbidden")
      recordAudit({ action: "auth.forbidden", userId: session.user.id });
    redirect(LANDING[session.state]);
  }
  if (permission && !can(session.role, permission)) redirect("/forbidden");
  return { user: session.user, role: session.role };
}
