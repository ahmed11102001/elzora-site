import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/admin/ui/AuthFrame";
import { LANDING, getSession } from "@/admin/auth/session";
import { signOut } from "@/admin/auth/actions";
import { EnrollFlow, VerifyForm } from "./MfaForms";

export const metadata: Metadata = { title: "Two-step verification" };

export default async function MfaPage() {
  const session = await getSession();
  if (session.state === "ok") redirect("/");
  if (session.state !== "needs_mfa_enroll" && session.state !== "needs_mfa_verify") {
    redirect(LANDING[session.state]);
  }

  return (
    <AuthFrame title="Two-step verification" description={session.user.email ?? undefined}>
      {session.state === "needs_mfa_verify" ? <VerifyForm /> : <EnrollFlow />}
      <form action={signOut} className="mt-6 border-t border-ink/10 pt-4 text-center">
        <button
          type="submit"
          className="text-sm text-ink/60 underline underline-offset-4 hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </AuthFrame>
  );
}
