import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/admin/ui/AuthFrame";
import { LANDING, getSession } from "@/admin/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await getSession();
  if (session.state === "ok") redirect("/");
  if (session.state !== "anonymous" && session.state !== "unconfigured")
    redirect(LANDING[session.state]);

  return (
    <AuthFrame
      title="Sign in"
      description="Dashboard access is limited to authorized team members."
    >
      {session.state === "unconfigured" ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The dashboard is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY (see the README, section Dashboard).
        </p>
      ) : (
        <LoginForm />
      )}
    </AuthFrame>
  );
}
