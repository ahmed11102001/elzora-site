"use server";

import { redirect } from "next/navigation";
import { requireSession } from "../auth/session";
import { recordAudit } from "../audit";
import { FollowUpInput, NoteInput, StatusInput } from "./model";
import { addNote, changeStatus, setFollowUp } from "./store";

// Every export here is a Server Action: callable by anyone who can reach the admin host, so each one starts
// with requireSession("leads.manage") and validates its input again. Audit events carry ids, never personal data.

const go = (id: string, params: Record<string, string>): never => {
  redirect(`/leads/${encodeURIComponent(id)}?${new URLSearchParams(params).toString()}`);
};
const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function changeLeadStatus(formData: FormData): Promise<void> {
  const { user } = await requireSession("leads.manage");
  const parsed = StatusInput.safeParse({
    id: text(formData, "id"),
    status: text(formData, "status"),
  });
  if (!parsed.success) return go(text(formData, "id"), { err: "invalid" });

  const result = await changeStatus(parsed.data.id, parsed.data.status, user.id);
  if (result === "missing") return go(parsed.data.id, { err: "missing" });
  if (result === "changed")
    recordAudit({
      action: "lead.status",
      userId: user.id,
      detail: { leadId: parsed.data.id, to: parsed.data.status },
    });
  return go(parsed.data.id, { msg: result === "changed" ? "status" : "same" });
}

export async function saveLeadFollowUp(formData: FormData): Promise<void> {
  const { user } = await requireSession("leads.manage");
  const parsed = FollowUpInput.safeParse({
    id: text(formData, "id"),
    date: text(formData, "date"),
  });
  if (!parsed.success) return go(text(formData, "id"), { err: "date" });

  if (!(await setFollowUp(parsed.data.id, parsed.data.date)))
    return go(parsed.data.id, { err: "missing" });
  recordAudit({
    action: "lead.followup",
    userId: user.id,
    detail: { leadId: parsed.data.id, cleared: parsed.data.date === null },
  });
  return go(parsed.data.id, { msg: parsed.data.date ? "followup" : "followup-cleared" });
}

export async function addLeadNote(formData: FormData): Promise<void> {
  const { user } = await requireSession("leads.manage");
  const parsed = NoteInput.safeParse({ id: text(formData, "id"), text: text(formData, "text") });
  if (!parsed.success) return go(text(formData, "id"), { err: "note" });

  if (!(await addNote(parsed.data.id, parsed.data.text, user.id)))
    return go(parsed.data.id, { err: "missing" });
  recordAudit({ action: "lead.note", userId: user.id, detail: { leadId: parsed.data.id } });
  return go(parsed.data.id, { msg: "note" });
}
