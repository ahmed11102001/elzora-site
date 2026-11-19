"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "../audit";
import { checkLimit } from "./login-limit";
import { getSession } from "./session";
import { createSupabase } from "./supabase";

export type FormState = { error?: string };

const LIMITED = "Too many attempts. Please wait a few minutes and try again.";
const UNAVAILABLE = "Sign-in is temporarily unavailable. Please try again shortly.";
const NOT_CONFIGURED = "The dashboard is not configured yet (Supabase settings are missing).";

const credentials = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(200),
});

export async function signIn(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter your e-mail address and password." };
  const { email, password } = parsed.data;

  const supabase = await createSupabase();
  if (!supabase) return { error: NOT_CONFIGURED };

  const limit = await checkLimit("login", email, await headers());
  if (limit === "limited") {
    recordAudit({ action: "auth.login.blocked" });
    return { error: LIMITED };
  }
  if (limit === "unavailable") return { error: UNAVAILABLE };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    recordAudit({ action: "auth.login.failure" });
    // One message for every failure: never reveal whether an account exists.
    return { error: "The e-mail address or password is not correct." };
  }
  recordAudit({ action: "auth.login.success", userId: data.user.id });
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabase();
  const session = await getSession();
  await supabase?.auth.signOut();
  if ("user" in session) recordAudit({ action: "auth.logout", userId: session.user.id });
  redirect("/login");
}

export type EnrollState = FormState & { factorId?: string; qr?: string; secret?: string };

/** Starts TOTP enrolment: creates an unverified factor and returns the QR code and the manual key. */
export async function startEnrollment(): Promise<EnrollState> {
  const session = await getSession();
  if (session.state !== "needs_mfa_enroll")
    return { error: "Two-step verification is already set up." };
  const supabase = await createSupabase();
  if (!supabase) return { error: NOT_CONFIGURED };

  // Remove factors left unverified by an earlier, abandoned attempt.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
  });
  if (error || !data) return { error: "Could not start the setup. Please try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

const code = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app.");

async function limitMfa(userId: string): Promise<string | null> {
  const result = await checkLimit("mfa", userId, await headers());
  if (result === "limited") return LIMITED;
  if (result === "unavailable") return UNAVAILABLE;
  return null;
}

/** Confirms a new factor (first-time setup) or answers the challenge for an existing one. */
export async function verifyCode(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (session.state !== "needs_mfa_enroll" && session.state !== "needs_mfa_verify") redirect("/");
  const parsed = code.safeParse(formData.get("code"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const blocked = await limitMfa(session.user.id);
  if (blocked) return { error: blocked };

  const supabase = await createSupabase();
  if (!supabase) return { error: NOT_CONFIGURED };

  let factorId = String(formData.get("factorId") ?? "");
  if (session.state === "needs_mfa_verify") {
    // Never trust a factor id from the browser for sign-in: use the account's verified factor.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    factorId = factors?.totp?.[0]?.id ?? "";
  }
  if (!factorId) return { error: "Start the setup again." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: parsed.data });
  if (error) {
    recordAudit({ action: "auth.mfa.failure", userId: session.user.id });
    return { error: "That code is not correct. Check the time on your phone and try again." };
  }
  recordAudit({
    action: session.state === "needs_mfa_enroll" ? "auth.mfa.enrolled" : "auth.mfa.verified",
    userId: session.user.id,
  });
  redirect("/");
}
