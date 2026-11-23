import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/admin/auth/session";
import { adminDatabaseConfigured } from "@/admin/db/sql";
import { addLeadNote, changeLeadStatus, saveLeadFollowUp } from "@/admin/leads/actions";
import {
  LEAD_STATUSES,
  NOTE_MAX,
  STATUS_LABEL,
  STATUS_TONE,
  followUpState,
  todayUtc,
} from "@/admin/leads/model";
import { getLead } from "@/admin/leads/store";
import { Badge, Card, PageHeader, buttonClass } from "@/admin/ui/primitives";

export const metadata: Metadata = { title: "Lead", robots: { index: false, follow: false } };

const NOTICES: Record<string, string> = {
  status: "Status updated.",
  same: "The lead already has that status.",
  followup: "Follow-up date saved.",
  "followup-cleared": "Follow-up date cleared.",
  note: "Note added.",
};
const ERRORS: Record<string, string> = {
  invalid: "That change was not valid.",
  date: "Choose a valid date.",
  note: "Write a note (up to 2,000 characters).",
  missing: "This lead no longer exists.",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const stamp = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
const control = "min-h-11 w-full rounded-lg border border-ink/25 bg-white px-3 text-sm";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-ink/55 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">
        {children || <span className="text-ink/45">—</span>}
      </dd>
    </div>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSession("leads.manage");
  if (!adminDatabaseConfigured()) notFound();
  const { id } = await params;
  const query = await searchParams;
  const detail = await getLead(id);
  if (!detail) notFound();
  const { lead, activity, nextFollowUpOn, tripTitle } = detail;

  const notice = NOTICES[first(query.msg) ?? ""];
  const error = ERRORS[first(query.err) ?? ""];
  const state = followUpState(nextFollowUpOn, lead.status, todayUtc());
  const dates =
    lead.dateFlexibility === "specific"
      ? `${lead.arrivalDate} to ${lead.departureDate}`
      : lead.dateFlexibility === "flexible"
        ? `Flexible${lead.flexibleWhen ? `: ${lead.flexibleWhen}` : ""}`
        : "Not decided";

  return (
    <>
      <PageHeader
        title={lead.fullName}
        description={`${lead.referenceCode} · received ${stamp(lead.createdAt.toISOString())}`}
        actions={
          <Link href="/leads" className={buttonClass("ghost")}>
            All leads
          </Link>
        }
      />
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="font-display text-2xl font-semibold">Request</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Row label="Email">
                <a href={`mailto:${lead.email}`} className="underline">
                  {lead.email}
                </a>
              </Row>
              <Row label="Phone">{lead.phone}</Row>
              <Row label="Country · language">
                {lead.country} · {lead.locale.toUpperCase()}
              </Row>
              <Row label="Requested trip">
                {tripTitle ?? lead.tripSlug ?? ""}
                {lead.tripSlug && tripTitle && (
                  <span className="text-ink/55"> ({lead.tripSlug})</span>
                )}
              </Row>
              <Row label="Dates">{dates}</Row>
              <Row label="Travelers">
                {lead.adults} adult{lead.adults === 1 ? "" : "s"}
                {lead.children > 0 &&
                  `, ${lead.children} child${lead.children === 1 ? "" : "ren"} (ages ${lead.childrenAges.join(", ")})`}
              </Row>
              <Row label="Interests">{lead.interests.join(", ")}</Row>
              <Row label="Duration">{lead.duration}</Row>
              <Row label="Budget per person">{lead.budget}</Row>
            </dl>
            {lead.notes && (
              <div className="mt-5">
                <h3 className="text-xs tracking-wider text-ink/55 uppercase">Traveler’s message</h3>
                <p className="mt-1 text-sm whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-2xl font-semibold">Where it came from</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Row label="Source">{lead.source}</Row>
              <Row label="Landing page">{lead.landingPage}</Row>
              <Row label="UTM source">{lead.utmSource}</Row>
              <Row label="UTM medium">{lead.utmMedium}</Row>
              <Row label="UTM campaign">{lead.utmCampaign}</Row>
              <Row label="UTM content · term">
                {[lead.utmContent, lead.utmTerm].filter(Boolean).join(" · ")}
              </Row>
              <Row label="Google Ads click ID (gclid)">{lead.gclid}</Row>
              <Row label="Meta click ID (fbclid)">{lead.fbclid}</Row>
              <Row label="Referrer">{lead.referrer}</Row>
              <Row label="Consent">
                version {lead.consentVersion}, {stamp(lead.consentedAt.toISOString())}
              </Row>
              <Row label="Emails">
                team {lead.teamNotifiedAt ? "sent" : "pending"} · traveler{" "}
                {lead.travelerNotifiedAt ? "sent" : "pending"}
              </Row>
            </dl>
          </Card>

          <Card>
            <h2 className="font-display text-2xl font-semibold">Timeline</h2>
            <ol className="mt-4 space-y-4">
              {activity.map((item) => (
                <li key={item.id} className="border-l-2 border-ink/15 pl-4 text-sm">
                  <p className="text-xs text-ink/55">
                    {stamp(item.createdAt)}
                    {item.actorId && (item.actorId === user.id ? " · you" : " · team member")}
                  </p>
                  {item.kind === "created" && <p>Request received.</p>}
                  {item.kind === "status_change" && item.toStatus && (
                    <p>
                      Status {item.fromStatus ? `${STATUS_LABEL[item.fromStatus]} → ` : "set to "}
                      <strong>{STATUS_LABEL[item.toStatus]}</strong>
                    </p>
                  )}
                  {item.kind === "assignment" && <p>Assigned to a partner.</p>}
                  {item.kind === "note" && <p className="whitespace-pre-wrap">{item.text}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-2xl font-semibold">Status</h2>
            <p className="mt-2">
              <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
              {lead.firstContactedAt && (
                <span className="ml-2 text-xs text-ink/55">
                  first contact {stamp(lead.firstContactedAt.toISOString())}
                </span>
              )}
            </p>
            <form action={changeLeadStatus} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={lead.id} />
              <label className="grid gap-1 text-xs font-semibold text-ink/70">
                Move to
                <select name="status" defaultValue={lead.status} className={control}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={buttonClass()}>
                Update status
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="font-display text-2xl font-semibold">Follow-up</h2>
            {state && (
              <p className="mt-2">
                <Badge tone={state === "upcoming" ? "neutral" : "warn"}>
                  {state === "overdue" ? "Overdue" : state === "today" ? "Due today" : "Scheduled"}
                </Badge>
              </p>
            )}
            <form action={saveLeadFollowUp} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={lead.id} />
              <label className="grid gap-1 text-xs font-semibold text-ink/70">
                Next follow-up
                <input
                  type="date"
                  name="date"
                  defaultValue={nextFollowUpOn ?? ""}
                  className={control}
                />
              </label>
              <button type="submit" className={buttonClass("ghost")}>
                Save date
              </button>
              <p className="text-xs text-ink/55">Leave empty and save to clear it.</p>
            </form>
          </Card>

          <Card>
            <h2 className="font-display text-2xl font-semibold">Private note</h2>
            <form action={addLeadNote} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={lead.id} />
              <label className="grid gap-1 text-xs font-semibold text-ink/70">
                Note (never shown to the traveler)
                <textarea
                  name="text"
                  rows={4}
                  maxLength={NOTE_MAX}
                  required
                  className={`${control} py-2`}
                />
              </label>
              <button type="submit" className={buttonClass("ghost")}>
                Add note
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
