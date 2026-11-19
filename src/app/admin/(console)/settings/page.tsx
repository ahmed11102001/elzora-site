import type { Metadata } from "next";
import { requireSession } from "@/admin/auth/session";
import { signOut } from "@/admin/auth/actions";
import { Badge, Card, PageHeader, buttonClass } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, role } = await requireSession();
  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account. Team management arrives with the Admin role."
      />
      <Card className="grid gap-4 sm:max-w-xl">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink/60 uppercase">E-mail</p>
          <p>{user.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink/60 uppercase">Role</p>
          <p className="capitalize">{role}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink/60 uppercase">
            Two-step verification
          </p>
          <Badge tone="ok">On</Badge>
        </div>
        <form action={signOut}>
          <button type="submit" className={buttonClass("ghost")}>
            Sign out
          </button>
        </form>
      </Card>
    </>
  );
}
