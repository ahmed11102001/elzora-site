import type { Metadata } from "next";
import { requireSession } from "@/admin/auth/session";
import { EmptyState, PageHeader } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "SEO" };

export default async function Page() {
  await requireSession("trips.manage");
  return (
    <>
      <PageHeader title="SEO" description="Search settings for trips." />
      <EmptyState title="Coming in 7.4B">
        SEO title, description, slug and social image are edited inside each trip. A site-wide SEO
        overview comes after trips exist.
      </EmptyState>
    </>
  );
}
