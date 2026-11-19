import type { Metadata } from "next";
import { requireSession } from "@/admin/auth/session";
import { EmptyState, PageHeader } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "Partners" };

export default async function Page() {
  await requireSession("partners.manage");
  return (
    <>
      <PageHeader title="Partners" description="Internal partner records." />
      <EmptyState title="Coming in 7.6">
        Partner records and lead assignment. Partner data is internal and never appears on the
        website.
      </EmptyState>
    </>
  );
}
