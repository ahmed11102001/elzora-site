import type { Metadata } from "next";
import { requireSession } from "@/admin/auth/session";
import { EmptyState, PageHeader } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "Trips" };

export default async function Page() {
  await requireSession("trips.manage");
  return (
    <>
      <PageHeader title="Trips" description="Create and manage trips." />
      <EmptyState title="Coming in 7.4B">
        Trip list, the editor (English and German), daily itinerary, photos and SEO fields arrive in
        the next milestone. Nothing is stored yet.
      </EmptyState>
    </>
  );
}
