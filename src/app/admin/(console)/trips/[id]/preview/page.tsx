import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/admin/auth/session";
import { recordAudit } from "@/admin/audit";
import { tripPublicPath } from "@/admin/publishing/paths";
import { Card, PageHeader, buttonClass } from "@/admin/ui/primitives";
import { getTripStore } from "@/admin/trips/store";
import { siteUrl } from "@/lib/site";
import { PREVIEW_TTL_SECONDS, previewSecret, signPreviewToken } from "@/lib/preview-token";

export const metadata: Metadata = { title: "Preview trip" };

// Builds a 15-minute signed link to the PUBLIC host, where it starts Draft Mode for this one trip and
// language. Generated on the server per visit, so the token is never stored or reused.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSession("trips.manage");
  const { id } = await params;
  const { locale: rawLocale } = await searchParams;
  const locale = rawLocale === "de" ? "de" : "en";

  let tripId: string;
  try {
    tripId = decodeURIComponent(id);
  } catch {
    notFound();
  }
  const trip = await getTripStore().get(tripId);
  if (!trip) notFound();
  const translation = trip.translations[locale];
  const back = `/trips/${encodeURIComponent(trip.id)}?tab=${locale}`;

  const secret = previewSecret();
  const problem = !translation
    ? "That language has no translation yet."
    : !translation.slug
      ? "Add a URL slug first: the preview needs a page address."
      : !secret
        ? "Preview is not set up: set PREVIEW_SECRET (16 or more characters) on the server and on the public site."
        : null;

  let link = "";
  if (!problem && translation) {
    const token = signPreviewToken(
      { t: trip.id, l: locale, p: tripPublicPath(locale, translation.slug) },
      secret,
    );
    link = `${siteUrl}/api/preview?token=${token}`;
    recordAudit({ action: "trip.preview", userId: user.id, detail: { tripId: trip.id, locale } });
  }

  return (
    <>
      <PageHeader
        title="Preview"
        description={`Opens the saved ${locale === "de" ? "German" : "English"} version on the public site, drafts included.`}
        actions={
          <Link href={back} className={buttonClass("ghost")}>
            Back to trip
          </Link>
        }
      />
      <Card className="grid max-w-2xl gap-4">
        {problem ? (
          <p role="alert" className="text-sm text-red-800">
            {problem}
          </p>
        ) : (
          <>
            <p className="text-sm text-ink/75">
              The link works for {PREVIEW_TTL_SECONDS / 60} minutes and only for this trip and
              language. Preview shows the <strong>saved</strong> version, so save your changes
              first. Visitors and search engines never see it.
            </p>
            <a href={link} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
              Open preview in a new tab
            </a>
            <p className="text-xs text-ink/60">
              To leave preview, open {siteUrl}/api/preview/exit on the public site.
            </p>
          </>
        )}
      </Card>
    </>
  );
}
