import type { Metadata } from "next";
import { AuthFrame } from "@/admin/ui/AuthFrame";
import { signOut } from "@/admin/auth/actions";
import { buttonClass } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "Not authorized" };

export default function ForbiddenPage() {
  return (
    <AuthFrame
      title="Not authorized"
      description="This account does not have access to the dashboard, or lacks the permission for that page."
    >
      <form action={signOut}>
        <button type="submit" className={buttonClass("ghost")}>
          Sign out
        </button>
      </form>
    </AuthFrame>
  );
}
