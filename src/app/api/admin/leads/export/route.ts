import { authorizeAdmin } from "@/lib/leads/admin-auth";
import { leadsToCsv } from "@/lib/leads/csv";
import { clientIp, noStore, rateLimitKey } from "@/lib/leads/server";
import { postgresStorage } from "@/lib/leads/storage";

// GET /api/admin/leads/export — CSV of all leads. Requires `Authorization: Bearer $LEADS_ADMIN_TOKEN`.
//   curl -H "Authorization: Bearer $LEADS_ADMIN_TOKEN" https://<site>/api/admin/leads/export -o leads.csv
// Without a configured token the route answers 404, exactly like a route that does not exist.
const EXPORT_LIMIT = 50_000;

export async function GET(request: Request) {
  const access = authorizeAdmin(request.headers);
  if (access === "disabled") return new Response("Not found", { status: 404, headers: noStore });
  if (access === "unauthorized") {
    // Slow down token guessing. If the database is down this also fails closed.
    try {
      await postgresStorage.hit(rateLimitKey("admin", clientIp(request.headers)), 20, 600);
    } catch {
      // ignore: the response is a 401 either way
    }
    return new Response("Unauthorized", {
      status: 401,
      headers: { ...noStore, "WWW-Authenticate": 'Bearer realm="elzora-admin"' },
    });
  }

  try {
    const leads = await postgresStorage.listForExport(EXPORT_LIMIT);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(leadsToCsv(leads), {
      headers: {
        ...noStore,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="elzora-leads-${stamp}.csv"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Service unavailable", { status: 503, headers: noStore });
  }
}
