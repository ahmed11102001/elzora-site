import { can } from "@/admin/auth/permissions";
import { getSession } from "@/admin/auth/session";
import { recordAudit } from "@/admin/audit";
import { adminDatabaseConfigured } from "@/admin/db/sql";
import { parseLeadFilter } from "@/admin/leads/model";
import { leadsToCsv } from "@/lib/leads/csv";
import { postgresStorage } from "@/lib/leads/storage";

// CSV of the leads (personal data). Needs the export permission and a verified session; anything else
// answers 404 so the address reveals nothing. Every export is written to the audit log.
export async function GET(request: Request) {
  const session = await getSession();
  if (session.state !== "ok" || !can(session.role, "leads.export") || !adminDatabaseConfigured())
    return new Response("Not found", { status: 404 });

  const filter = parseLeadFilter(Object.fromEntries(new URL(request.url).searchParams));
  const all = await postgresStorage.listForExport(5000);
  const leads = all.filter(
    (lead) =>
      (!filter.status || lead.status === filter.status) &&
      (!filter.locale || lead.locale === filter.locale) &&
      (!filter.country || lead.country === filter.country) &&
      (!filter.trip || lead.tripSlug === filter.trip),
  );

  recordAudit({
    action: "lead.export",
    userId: session.user.id,
    detail: { count: leads.length, status: filter.status ?? "all" },
  });
  return new Response(leadsToCsv(leads), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="elzora-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
