import { can } from "@/admin/auth/permissions";
import { requireSession } from "@/admin/auth/session";
import { NAV } from "@/admin/shell/nav";
import { Shell } from "@/admin/shell/Shell";

// First line of defence only: layouts do not re-run on client navigation, so every page and every
// server action calls requireSession(permission) again.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireSession();
  const items = NAV.filter((item) => !item.permission || can(role, item.permission));
  return (
    <Shell
      items={items}
      email={user.email ?? "Unknown"}
      roleLabel={role === "owner" ? "Owner" : "Admin"}
    >
      {children}
    </Shell>
  );
}
