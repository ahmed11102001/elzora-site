import type { Metadata } from "next";
import { requireSession } from "@/admin/auth/session";
import { EmptyState, PageHeader } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "Leads" };

export default async function Page() {
  await requireSession("leads.manage");
  return (
    <>
      <PageHeader title="Leads" description="Requests from the trip planner." />
      <EmptyState title="Coming in 7.5">
        Inbox, status workflow, private notes and export. Until then, requests are visible through
        the existing CSV export.
      </EmptyState>
    </>
  );
}
