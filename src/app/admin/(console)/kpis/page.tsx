import type { Metadata } from "next";
import { requireSession } from "@/admin/auth/session";
import { EmptyState, PageHeader } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "KPIs" };

export default async function Page() {
  await requireSession("kpi.read");
  return (
    <>
      <PageHeader title="KPIs" description="Operational numbers from real records." />
      <EmptyState title="Coming in 7.7">
        Leads by period, source and country, the status funnel and response time.
      </EmptyState>
    </>
  );
}
