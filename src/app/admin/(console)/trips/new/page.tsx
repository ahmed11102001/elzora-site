import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/admin/auth/session";
import { Card, PageHeader, buttonClass } from "@/admin/ui/primitives";
import { NewTripForm } from "@/admin/trips/NewTripForm";

export const metadata: Metadata = { title: "New trip" };

export default async function Page() {
  await requireSession("trips.manage");
  return (
    <>
      <PageHeader
        title="New trip"
        description="Start with the basics. Everything else is edited on the next screen, and nothing goes public until you publish it."
        actions={
          <Link href="/trips" className={buttonClass("ghost")}>
            Back to trips
          </Link>
        }
      />
      <Card>
        <NewTripForm />
      </Card>
    </>
  );
}
