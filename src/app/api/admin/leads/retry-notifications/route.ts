import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/leads/admin-auth";
import { retryPendingNotifications } from "@/lib/leads/notifications";
import { noStore, notifyDeps } from "@/lib/leads/server";

// POST /api/admin/leads/retry-notifications — re-sends emails that failed or were never configured.
// Same Bearer token as the export. Safe to call repeatedly (Resend idempotency keys prevent duplicates).
export async function POST(request: Request) {
  const access = authorizeAdmin(request.headers);
  if (access === "disabled") return new Response("Not found", { status: 404, headers: noStore });
  if (access === "unauthorized") {
    return new Response("Unauthorized", {
      status: 401,
      headers: { ...noStore, "WWW-Authenticate": 'Bearer realm="elzora-admin"' },
    });
  }
  try {
    const processed = await retryPendingNotifications(notifyDeps());
    return NextResponse.json({ ok: true, processed }, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: noStore });
  }
}
