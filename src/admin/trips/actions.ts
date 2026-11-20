"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "../audit";
import { requireSession } from "../auth/session";
import { refreshPublicSite } from "../publishing/revalidate";
import { readinessContext } from "./context";
import {
  SLUG_RE,
  TripDraft,
  emptyDraft,
  emptyTranslation,
  freshState,
  locales,
  type Locale,
  type Translation,
  type TranslationDraft,
  type TripRecord,
} from "./model";
import { checkTranslation } from "./readiness";
import { getTripStore } from "./store";
import { DESTINATION_OPTIONS, STYLE_OPTIONS } from "./taxonomy";

// Every export here is a Server Action: callable from the browser by anyone who can reach the admin host,
// so each one starts with requireSession("trips.manage") and validates its input again.

export type SaveState = { error?: string };

const TripId = z.string().trim().min(1).max(100);
const LocaleSchema = z.enum(locales);
const now = () => new Date().toISOString();

const go = (id: string, params: Record<string, string> = {}): never => {
  const query = new URLSearchParams(params).toString();
  redirect(`/trips/${encodeURIComponent(id)}${query ? `?${query}` : ""}`);
};

// Order-independent comparison, so "did the content change" does not depend on key order.
const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

const contentOf = (t: Translation): TranslationDraft => {
  const { status: _s, publishedAt: _p, slugHistory: _h, ...draft } = t;
  void [_s, _p, _h];
  return draft;
};

// ---------------------------------------------------------------- create

const CreateInput = z.object({
  title: z.string().trim().min(1, "Give the trip an English title.").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Choose an English URL slug.")
    .max(80)
    .regex(SLUG_RE, "Use lowercase letters, digits and single hyphens."),
  durationDays: z.coerce.number().int().min(1, "Duration is at least 1 day.").max(90),
});

export async function createTrip(_state: SaveState, formData: FormData): Promise<SaveState> {
  const { user } = await requireSession("trips.manage");
  const parsed = CreateInput.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    durationDays: formData.get("durationDays"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const store = getTripStore();
  if (await store.slugTaken("en", parsed.data.slug))
    return { error: "Another trip already uses that English slug." };

  const stamp = now();
  const draft = emptyDraft();
  const id = crypto.randomUUID();
  const record: TripRecord = {
    ...draft,
    durationDays: parsed.data.durationDays,
    id,
    partnerId: null,
    archivedAt: null,
    createdAt: stamp,
    createdBy: user.id,
    updatedAt: stamp,
    updatedBy: user.id,
    translations: {
      en: {
        ...emptyTranslation(),
        slug: parsed.data.slug,
        title: parsed.data.title,
        ...freshState(),
      },
      de: null,
    },
  };
  if (!(await store.insert(record))) return { error: "Could not create the trip. Try again." };
  recordAudit({ action: "trip.create", userId: user.id, detail: { tripId: id } });
  return go(id, { msg: "created" });
}

// ---------------------------------------------------------------- save

const hasAll = (ids: string[], allowed: { id: string }[]) =>
  ids.every((id) => allowed.some((option) => option.id === id));

export async function saveTrip(_state: SaveState, formData: FormData): Promise<SaveState> {
  const { user } = await requireSession("trips.manage");
  const id = TripId.safeParse(formData.get("tripId"));
  if (!id.success) return { error: "Missing trip." };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "The form data could not be read. Reload the page and try again." };
  }
  const parsed = TripDraft.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(" › ");
    return { error: `${issue?.message ?? "Check the form."}${where ? ` (${where})` : ""}` };
  }
  const draft = parsed.data;

  if (!draft.translations.en.title) return { error: "The English title is required." };
  if (!hasAll(draft.styleIds, STYLE_OPTIONS)) return { error: "Unknown trip style." };
  if (!hasAll(draft.destinationIds, DESTINATION_OPTIONS)) return { error: "Unknown destination." };
  for (const locale of locales) {
    const days = draft.translations[locale]?.itinerary ?? [];
    if (
      !days.every(
        (d) => d.destinationId === "" || DESTINATION_OPTIONS.some((o) => o.id === d.destinationId),
      )
    )
      return { error: "An itinerary day uses an unknown destination." };
  }

  const store = getTripStore();
  const current = await store.get(id.data);
  if (!current) return { error: "That trip no longer exists." };
  if (current.archivedAt) return { error: "Restore the trip before editing it." };

  const stamp = now();
  const merge = (locale: Locale): Translation | null => {
    const next = draft.translations[locale];
    const previous = current.translations[locale];
    if (!next) return previous && previous.status === "draft" ? null : previous;
    if (!previous) return { ...next, ...freshState() };
    const changed = stable(contentOf(previous)) !== stable(next);
    const slugHistory =
      previous.status === "published" && previous.slug && previous.slug !== next.slug
        ? [...new Set([...previous.slugHistory, previous.slug])]
        : previous.slugHistory;
    return {
      ...next,
      status: previous.status === "review" && changed ? "draft" : previous.status,
      publishedAt: previous.publishedAt,
      slugHistory,
    };
  };

  const updated: TripRecord = {
    ...current,
    ...draft,
    translations: { en: merge("en") as Translation, de: merge("de") },
    updatedAt: stamp,
    updatedBy: user.id,
  };

  // A language that is live must stay publishable: a save may not break it.
  const context = await readinessContext(store, updated);
  for (const locale of locales) {
    if (updated.translations[locale]?.status !== "published") continue;
    const { blockers } = checkTranslation(updated, locale, "publish", context);
    if (blockers.length > 0)
      return { error: `A published language would break: ${blockers[0].message}` };
  }
  // Slugs must be unique per language, for every translation that has one.
  for (const locale of locales) {
    const slug = updated.translations[locale]?.slug;
    if (slug && context.slugTaken(locale, slug))
      return { error: `Another trip already uses the ${locale.toUpperCase()} slug "${slug}".` };
  }

  if (!(await store.replace(updated))) return { error: "That trip no longer exists." };
  recordAudit({ action: "trip.update", userId: user.id, detail: { tripId: id.data } });
  // A published language is live: its edit (or a slug change) must reach the public site now.
  if (anyPublished(updated)) refreshPublicSite(updated.id);
  const tab = formData.get("tab");
  return go(id.data, { msg: "saved", tab: tab === "de" ? "de" : "en" });
}

// ---------------------------------------------------------------- workflow (form buttons)

const WorkflowInput = z.object({ tripId: TripId, locale: LocaleSchema.optional() });

async function load(
  formData: FormData,
  permission: "trips.manage" | "trips.publish" = "trips.manage",
) {
  const { user } = await requireSession(permission);
  const input = WorkflowInput.safeParse({
    tripId: formData.get("tripId"),
    locale: formData.get("locale") ?? undefined,
  });
  if (!input.success) return redirect("/trips");
  const store = getTripStore();
  const trip = await store.get(input.data.tripId);
  if (!trip) return redirect("/trips?err=not-found");
  return { user, store, trip, locale: input.data.locale };
}

const anyPublished = (trip: TripRecord) =>
  trip.translations.en.status === "published" || trip.translations.de?.status === "published";

export async function submitForReview(formData: FormData): Promise<void> {
  const { user, store, trip, locale } = await load(formData);
  if (!locale) return go(trip.id, { err: "failed" });
  const translation = trip.translations[locale];
  if (!translation) return go(trip.id, { err: "no-translation", tab: locale });
  if (translation.status !== "draft") return go(trip.id, { err: "wrong-status", tab: locale });
  const { blockers } = checkTranslation(
    trip,
    locale,
    "review",
    await readinessContext(store, trip),
  );
  if (blockers.length > 0) return go(trip.id, { err: "not-ready", tab: locale });
  trip.translations[locale] = { ...translation, status: "review" };
  trip.updatedAt = now();
  trip.updatedBy = user.id;
  await store.replace(trip);
  recordAudit({
    action: "trip.status",
    userId: user.id,
    detail: { tripId: trip.id, locale, from: "draft", to: "review" },
  });
  return go(trip.id, { msg: "review", tab: locale });
}

export async function returnToDraft(formData: FormData): Promise<void> {
  const { user, store, trip, locale } = await load(formData);
  if (!locale) return go(trip.id, { err: "failed" });
  const translation = trip.translations[locale];
  if (!translation) return go(trip.id, { err: "no-translation", tab: locale });
  if (translation.status !== "review") return go(trip.id, { err: "wrong-status", tab: locale });
  trip.translations[locale] = { ...translation, status: "draft" };
  trip.updatedAt = now();
  trip.updatedBy = user.id;
  await store.replace(trip);
  recordAudit({
    action: "trip.status",
    userId: user.id,
    detail: { tripId: trip.id, locale, from: "review", to: "draft" },
  });
  return go(trip.id, { msg: "draft", tab: locale });
}

export async function archiveTrip(formData: FormData): Promise<void> {
  const { user, store, trip } = await load(formData);
  if (anyPublished(trip)) return go(trip.id, { err: "has-published" });
  trip.archivedAt = now();
  trip.updatedAt = trip.archivedAt;
  trip.updatedBy = user.id;
  await store.replace(trip);
  recordAudit({ action: "trip.archive", userId: user.id, detail: { tripId: trip.id } });
  return go(trip.id, { msg: "archived" });
}

export async function restoreTrip(formData: FormData): Promise<void> {
  const { user, store, trip } = await load(formData);
  trip.archivedAt = null;
  trip.updatedAt = now();
  trip.updatedBy = user.id;
  await store.replace(trip);
  recordAudit({ action: "trip.restore", userId: user.id, detail: { tripId: trip.id } });
  return go(trip.id, { msg: "restored" });
}

export async function duplicateTrip(formData: FormData): Promise<void> {
  const { user, store, trip } = await load(formData);
  const stamp = now();
  // Slugs are unique per language and a copy is a different trip, so the copy starts with no slugs
  // and as a draft in every language. Media and commercial data are carried over.
  const copy = (t: Translation | null): Translation | null =>
    t
      ? { ...structuredClone(t), slug: "", title: `${t.title} (copy)`.trim(), ...freshState() }
      : null;
  const record: TripRecord = {
    ...structuredClone(trip),
    id: crypto.randomUUID(),
    featured: false,
    archivedAt: null,
    createdAt: stamp,
    createdBy: user.id,
    updatedAt: stamp,
    updatedBy: user.id,
    translations: { en: copy(trip.translations.en) as Translation, de: copy(trip.translations.de) },
  };
  await store.insert(record);
  recordAudit({
    action: "trip.duplicate",
    userId: user.id,
    detail: { tripId: record.id, from: trip.id },
  });
  return go(record.id, { msg: "duplicated" });
}

export async function deleteTrip(formData: FormData): Promise<void> {
  const { user, store, trip } = await load(formData);
  // Anything that was ever live is archived, never deleted: its old URLs and leads still point at it.
  if (anyPublished(trip)) return go(trip.id, { err: "has-published" });
  await store.remove(trip.id);
  recordAudit({ action: "trip.delete", userId: user.id, detail: { tripId: trip.id } });
  return redirect("/trips?msg=deleted");
}

// ---------------------------------------------------------------- publishing (7.4D)

export async function publishTranslation(formData: FormData): Promise<void> {
  // Needs trips.publish, not just trips.manage: publishing is the sensitive step.
  const { user, store, trip, locale } = await load(formData, "trips.publish");
  if (!locale) return go(trip.id, { err: "failed" });
  const translation = trip.translations[locale];
  if (!translation) return go(trip.id, { err: "no-translation", tab: locale });
  if (trip.archivedAt) return go(trip.id, { err: "archived", tab: locale });
  // Only a translation that went through review can go live.
  if (translation.status !== "review") return go(trip.id, { err: "wrong-status", tab: locale });

  // Checked again here, on the stored version: the checklist on screen may be minutes old.
  const { blockers } = checkTranslation(
    trip,
    locale,
    "publish",
    await readinessContext(store, trip),
  );
  if (blockers.length > 0) return go(trip.id, { err: "not-ready", tab: locale });

  const stamp = now();
  trip.translations[locale] = { ...translation, status: "published", publishedAt: stamp };
  trip.updatedAt = stamp;
  trip.updatedBy = user.id;
  if (!(await store.replace(trip))) return go(trip.id, { err: "slug-conflict", tab: locale });
  recordAudit({
    action: "trip.publish",
    userId: user.id,
    detail: { tripId: trip.id, locale, slug: translation.slug },
  });
  refreshPublicSite(trip.id);
  return go(trip.id, { msg: "published", tab: locale });
}

export async function unpublishTranslation(formData: FormData): Promise<void> {
  const { user, store, trip, locale } = await load(formData, "trips.publish");
  if (!locale) return go(trip.id, { err: "failed" });
  const translation = trip.translations[locale];
  if (!translation) return go(trip.id, { err: "no-translation", tab: locale });
  if (translation.status !== "published") return go(trip.id, { err: "wrong-status", tab: locale });

  // Back to draft: it stays out of the site until it is reviewed and published again. The slug history is
  // kept, so old URLs never get reused by another trip.
  trip.translations[locale] = { ...translation, status: "draft", publishedAt: null };
  trip.updatedAt = now();
  trip.updatedBy = user.id;
  await store.replace(trip);
  recordAudit({
    action: "trip.unpublish",
    userId: user.id,
    detail: { tripId: trip.id, locale, slug: translation.slug },
  });
  refreshPublicSite(trip.id);
  return go(trip.id, { msg: "unpublished", tab: locale });
}
