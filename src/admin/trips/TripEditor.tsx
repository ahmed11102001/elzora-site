"use client";

import { useActionState, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Card, buttonClass } from "../ui/primitives";
import { AreaField, CheckField, InputField, SelectField } from "../ui/fields";
import { saveTrip, type SaveState } from "./actions";
import { LIMITS, SEO_GUIDE, emptyDay, emptyTranslation } from "./constants";
import type {
  BudgetCategory,
  DayDraft,
  Locale,
  MediaRef,
  TranslationDraft,
  TripDraft,
  TripStatus,
} from "./model";

// The trip editor. One client component holds the whole draft and posts it as a single JSON document
// to the saveTrip server action, which validates everything again. Status changes (review, archive,
// delete…) are separate forms rendered by the page: they are not part of "Save".

type Option = { id: string; label: string };
type PhotoOption = { id: string; credit: string; licensed: boolean };

export type TripEditorProps = {
  tripId: string;
  initial: TripDraft;
  statuses: Record<Locale, TripStatus | null>;
  initialTab: Locale;
  styles: Option[];
  destinations: Option[];
  photos: PhotoOption[];
  budgetCategories: BudgetCategory[];
  persistent: boolean;
};

const LANGUAGE: Record<Locale, string> = { en: "English", de: "German" };
const PATH_PREFIX: Record<Locale, string> = { en: "/en/trips/", de: "/de/reisen/" };
const STATUS_TONE = { draft: "neutral", review: "warn", published: "ok" } as const;
const STATUS_LABEL = { draft: "Draft", review: "In review", published: "Published" } as const;
const BUDGET_LABEL: Record<string, string> = {
  lt1000: "Under €1,000",
  "1000-1500": "€1,000 – 1,500",
  "1500-2500": "€1,500 – 2,500",
  "2500-4000": "€2,500 – 4,000",
  "4000+": "€4,000 and more",
};

const count = (value: string, max: number) => `${value.length}/${max}`;
const toLines = (items: string[]) => items.join("\n");
const fromLines = (value: string) => value.split("\n");

function CheckGroup({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                on ? "border-ink bg-ink text-sand" : "border-ink/25 bg-white text-ink",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={() =>
                  onChange(
                    on ? selected.filter((id) => id !== option.id) : [...selected, option.id],
                  )
                }
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function PhotoPicker({
  id,
  label,
  photos,
  value,
  onChange,
  allowNone,
}: {
  id: string;
  label: string;
  photos: PhotoOption[];
  value: string;
  onChange: (next: string) => void;
  allowNone: boolean;
}) {
  const chosen = photos.find((p) => p.id === value);
  return (
    <div className="grid gap-2">
      <SelectField id={id} label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {allowNone && <option value="">None</option>}
        {!allowNone && value === "" && <option value="">Choose a photo…</option>}
        {photos.map((photo) => (
          <option key={photo.id} value={photo.id}>
            {photo.id}
            {photo.licensed ? "" : " (licence not confirmed)"}
          </option>
        ))}
      </SelectField>
      {chosen && (
        <div className="flex items-center gap-3 text-xs text-ink/65">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a local file */}
          <img
            src={`/images/${chosen.id}-640.webp`}
            alt=""
            width={96}
            height={64}
            className="h-16 w-24 rounded-md object-cover"
          />
          <span>
            {chosen.credit}
            {!chosen.licensed && <Badge tone="warn">Licence not confirmed</Badge>}
          </span>
        </div>
      )}
    </div>
  );
}

export function TripEditor(props: TripEditorProps) {
  const { tripId, initial, statuses, styles, destinations, photos, budgetCategories } = props;
  const [draft, setDraft] = useState<TripDraft>(initial);
  const [tab, setTab] = useState<Locale>(props.initialTab);
  const [state, action, pending] = useActionState<SaveState, FormData>(saveTrip, {});

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);

  const patch = (changes: Partial<TripDraft>) => setDraft((d) => ({ ...d, ...changes }));
  const patchT = (locale: Locale, changes: Partial<TranslationDraft>) =>
    setDraft((d) => {
      const current = d.translations[locale];
      if (!current) return d;
      return { ...d, translations: { ...d.translations, [locale]: { ...current, ...changes } } };
    });

  const t = draft.translations[tab];
  const tStatus = statuses[tab];
  const days = t?.itinerary ?? [];

  const setDays = (locale: Locale, next: DayDraft[]) =>
    patchT(locale, { itinerary: next.map((day, index) => ({ ...day, dayNumber: index + 1 })) });
  const patchDay = (locale: Locale, index: number, changes: Partial<DayDraft>) => {
    const list = draft.translations[locale]?.itinerary ?? [];
    setDays(
      locale,
      list.map((day, i) => (i === index ? { ...day, ...changes } : day)),
    );
  };
  const moveDay = (locale: Locale, index: number, by: -1 | 1) => {
    const list = [...(draft.translations[locale]?.itinerary ?? [])];
    const target = index + by;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setDays(locale, list);
  };

  const setGallery = (gallery: MediaRef[]) => patch({ gallery });
  const mainAlt = draft.mainImage?.alt ?? { en: "", de: "" };

  const titleLen = t?.metaTitle.length ?? 0;
  const descLen = t?.metaDescription.length ?? 0;
  const lengthTone = (len: number, guide: { min: number; max: number }) =>
    len === 0
      ? "text-ink/55"
      : len < guide.min || len > guide.max
        ? "text-amber-800"
        : "text-emerald-800";

  return (
    <form action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name="payload" value={JSON.stringify(draft)} />

      {!props.persistent && (
        <p role="note" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Preview storage: changes are kept in the server’s memory and can disappear when the server
          restarts. Permanent storage arrives with the database step (7.4C).
        </p>
      )}

      {/* ------------------------------------------------ shared basics */}
      <Card className="grid gap-5">
        <h2 className="font-display text-2xl font-semibold">Basics</h2>
        <p className="-mt-3 text-sm text-ink/65">Shared by both languages.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <InputField
            id="durationDays"
            label="Duration (days)"
            type="number"
            inputMode="numeric"
            min={1}
            max={90}
            value={draft.durationDays}
            onChange={(e) => patch({ durationDays: Number(e.target.value) || 0 })}
          />
          <InputField
            id="priceFromEUR"
            label="Price from (EUR)"
            type="number"
            inputMode="decimal"
            min={0}
            value={draft.priceFromEUR ?? ""}
            hint="Leave empty until a partner confirms a price."
            onChange={(e) =>
              patch({ priceFromEUR: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
          <SelectField
            id="budgetCategory"
            label="Budget category"
            value={draft.budgetCategory}
            onChange={(e) => patch({ budgetCategory: e.target.value as BudgetCategory | "" })}
          >
            <option value="">Not set</option>
            {budgetCategories.map((b) => (
              <option key={b} value={b}>
                {BUDGET_LABEL[b] ?? b}
              </option>
            ))}
          </SelectField>
        </div>
        <CheckField
          id="flexibleDuration"
          label="Flexible duration"
          hint="The itinerary may have a different number of days than the duration above."
          checked={draft.flexibleDuration}
          onChange={(e) => patch({ flexibleDuration: e.target.checked })}
        />
        <CheckGroup
          legend="Trip styles"
          options={styles}
          selected={draft.styleIds}
          onChange={(styleIds) => patch({ styleIds })}
        />
        <CheckGroup
          legend="Destinations"
          options={destinations}
          selected={draft.destinationIds}
          onChange={(destinationIds) => patch({ destinationIds })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckField
            id="featured"
            label="Featured trip"
            hint="Eligible for the home page and the top of the trip list."
            checked={draft.featured}
            onChange={(e) => patch({ featured: e.target.checked })}
          />
          <InputField
            id="sortOrder"
            label="Sort order"
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            hint="Lower numbers come first."
            value={draft.sortOrder}
            onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })}
          />
        </div>
      </Card>

      {/* ------------------------------------------------ images */}
      <Card className="grid gap-5">
        <h2 className="font-display text-2xl font-semibold">Images</h2>
        <p className="-mt-3 text-sm text-ink/65">
          Choose from the site’s photo library. Uploading new photos arrives with storage in 7.4C.
          Every published image needs alt text in each language.
        </p>
        <PhotoPicker
          id="mainImage"
          label="Main image"
          photos={photos}
          allowNone
          value={draft.mainImage?.photoId ?? ""}
          onChange={(photoId) =>
            patch({
              mainImage: photoId
                ? {
                    photoId: photoId as MediaRef["photoId"],
                    alt: draft.mainImage?.alt ?? { en: "", de: "" },
                  }
                : null,
            })
          }
        />
        {draft.mainImage && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["en", "de"] as const).map((locale) => (
              <InputField
                key={locale}
                id={`mainAlt-${locale}`}
                label={`Main image alt text (${LANGUAGE[locale]})`}
                value={mainAlt[locale]}
                maxLength={LIMITS.alt}
                counter={count(mainAlt[locale], LIMITS.alt)}
                onChange={(e) =>
                  patch({
                    mainImage: draft.mainImage
                      ? { ...draft.mainImage, alt: { ...mainAlt, [locale]: e.target.value } }
                      : null,
                  })
                }
              />
            ))}
          </div>
        )}

        <div className="grid gap-4">
          <h3 className="text-sm font-semibold">
            Gallery ({draft.gallery.length}/{LIMITS.gallery})
          </h3>
          {draft.gallery.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-ink/10 p-4">
              <PhotoPicker
                id={`gallery-${index}`}
                label={`Gallery image ${index + 1}`}
                photos={photos}
                allowNone={false}
                value={item.photoId}
                onChange={(photoId) =>
                  setGallery(
                    draft.gallery.map((g, i) =>
                      i === index ? { ...g, photoId: photoId as MediaRef["photoId"] } : g,
                    ),
                  )
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {(["en", "de"] as const).map((locale) => (
                  <InputField
                    key={locale}
                    id={`gallery-${index}-alt-${locale}`}
                    label={`Alt text (${LANGUAGE[locale]})`}
                    value={item.alt[locale]}
                    maxLength={LIMITS.alt}
                    onChange={(e) =>
                      setGallery(
                        draft.gallery.map((g, i) =>
                          i === index ? { ...g, alt: { ...g.alt, [locale]: e.target.value } } : g,
                        ),
                      )
                    }
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClass("ghost")}
                  disabled={index === 0}
                  onClick={() => {
                    const list = [...draft.gallery];
                    [list[index - 1], list[index]] = [list[index], list[index - 1]];
                    setGallery(list);
                  }}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className={buttonClass("ghost")}
                  onClick={() => setGallery(draft.gallery.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div>
            <button
              type="button"
              className={buttonClass("ghost")}
              disabled={draft.gallery.length >= LIMITS.gallery || photos.length === 0}
              onClick={() =>
                setGallery([
                  ...draft.gallery,
                  { photoId: photos[0].id as MediaRef["photoId"], alt: { en: "", de: "" } },
                ])
              }
            >
              Add gallery image
            </button>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------ language tabs */}
      <Card className="grid gap-5">
        <div role="tablist" aria-label="Language" className="flex flex-wrap gap-2">
          {(["en", "de"] as const).map((locale) => {
            const status = statuses[locale];
            const exists = draft.translations[locale] !== null;
            return (
              <button
                key={locale}
                type="button"
                role="tab"
                id={`tab-${locale}`}
                aria-selected={tab === locale}
                aria-controls="translation-panel"
                onClick={() => setTab(locale)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold",
                  tab === locale
                    ? "border-ink bg-ink text-sand"
                    : "border-ink/25 bg-white text-ink",
                )}
              >
                {LANGUAGE[locale]}
                {exists && status ? (
                  <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                ) : (
                  <Badge tone="soon">{exists ? "New" : "Not added"}</Badge>
                )}
              </button>
            );
          })}
        </div>

        <div
          id="translation-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="grid gap-5"
        >
          {!t && (
            <div className="grid gap-3 rounded-xl border border-dashed border-ink/25 p-5">
              <p className="text-sm text-ink/70">
                There is no {LANGUAGE[tab]} translation yet. The trip stays English-only until you
                add one and publish it.
              </p>
              <div>
                <button
                  type="button"
                  className={buttonClass()}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      translations: { ...d.translations, [tab]: emptyTranslation() },
                    }))
                  }
                >
                  Add {LANGUAGE[tab]} translation
                </button>
              </div>
            </div>
          )}

          {t && (
            <>
              <InputField
                id={`title-${tab}`}
                label={`Title (${LANGUAGE[tab]})`}
                value={t.title}
                maxLength={LIMITS.title}
                counter={count(t.title, LIMITS.title)}
                onChange={(e) => patchT(tab, { title: e.target.value })}
              />
              <InputField
                id={`subtitle-${tab}`}
                label="Subtitle"
                value={t.subtitle}
                maxLength={LIMITS.subtitle}
                counter={count(t.subtitle, LIMITS.subtitle)}
                onChange={(e) => patchT(tab, { subtitle: e.target.value })}
              />
              <AreaField
                id={`summary-${tab}`}
                label="Summary"
                hint="Shown on trip cards and in the trip header."
                rows={3}
                value={t.summary}
                maxLength={LIMITS.summary}
                counter={count(t.summary, LIMITS.summary)}
                onChange={(e) => patchT(tab, { summary: e.target.value })}
              />
              <AreaField
                id={`description-${tab}`}
                label="Description"
                rows={8}
                value={t.description}
                maxLength={LIMITS.description}
                counter={count(t.description, LIMITS.description)}
                onChange={(e) => patchT(tab, { description: e.target.value })}
              />
              <AreaField
                id={`highlights-${tab}`}
                label="Highlights"
                hint="One per line."
                rows={5}
                value={toLines(t.highlights)}
                onChange={(e) => patchT(tab, { highlights: fromLines(e.target.value) })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <AreaField
                  id={`inclusions-${tab}`}
                  label="Included"
                  hint="One per line. Leave empty until the real program is confirmed."
                  rows={5}
                  value={toLines(t.inclusions)}
                  onChange={(e) => patchT(tab, { inclusions: fromLines(e.target.value) })}
                />
                <AreaField
                  id={`exclusions-${tab}`}
                  label="Not included"
                  hint="One per line."
                  rows={5}
                  value={toLines(t.exclusions)}
                  onChange={(e) => patchT(tab, { exclusions: fromLines(e.target.value) })}
                />
              </div>
              <InputField
                id={`priceNote-${tab}`}
                label="Price note"
                hint="For example “per person, based on two travelers”. Only with a confirmed price."
                value={t.priceNote}
                maxLength={LIMITS.priceNote}
                onChange={(e) => patchT(tab, { priceNote: e.target.value })}
              />

              {/* ---------------- itinerary */}
              <section aria-labelledby={`itinerary-title-${tab}`} className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id={`itinerary-title-${tab}`} className="font-display text-xl font-semibold">
                    Day-by-day itinerary ({days.length}
                    {draft.flexibleDuration ? "" : ` of ${draft.durationDays}`})
                  </h3>
                  {tab === "de" && draft.translations.en.itinerary.length > 0 && (
                    <button
                      type="button"
                      className={buttonClass("ghost")}
                      onClick={() =>
                        setDays(
                          "de",
                          draft.translations.en.itinerary.map((d) => ({
                            ...emptyDay(d.dayNumber),
                            destinationId: d.destinationId,
                          })),
                        )
                      }
                    >
                      Copy day structure from English
                    </button>
                  )}
                </div>
                {days.map((day, index) => (
                  <div key={index} className="grid gap-3 rounded-xl border border-ink/10 p-4">
                    <p className="text-sm font-semibold text-ink/70">Day {day.dayNumber}</p>
                    <InputField
                      id={`day-${tab}-${index}-title`}
                      label="Title"
                      value={day.title}
                      maxLength={LIMITS.dayTitle}
                      onChange={(e) => patchDay(tab, index, { title: e.target.value })}
                    />
                    <AreaField
                      id={`day-${tab}-${index}-description`}
                      label="Description"
                      rows={3}
                      value={day.description}
                      maxLength={LIMITS.dayDescription}
                      onChange={(e) => patchDay(tab, index, { description: e.target.value })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField
                        id={`day-${tab}-${index}-destination`}
                        label="Destination"
                        value={day.destinationId}
                        onChange={(e) => patchDay(tab, index, { destinationId: e.target.value })}
                      >
                        <option value="">None</option>
                        {destinations.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </SelectField>
                      <AreaField
                        id={`day-${tab}-${index}-highlights`}
                        label="Day highlights (optional)"
                        hint="One per line."
                        rows={2}
                        value={toLines(day.highlights)}
                        onChange={(e) =>
                          patchDay(tab, index, { highlights: fromLines(e.target.value) })
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={buttonClass("ghost")}
                        disabled={index === 0}
                        onClick={() => moveDay(tab, index, -1)}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className={buttonClass("ghost")}
                        disabled={index === days.length - 1}
                        onClick={() => moveDay(tab, index, 1)}
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        className={buttonClass("ghost")}
                        onClick={() =>
                          setDays(
                            tab,
                            days.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove day
                      </button>
                    </div>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    className={buttonClass("ghost")}
                    disabled={days.length >= LIMITS.days}
                    onClick={() => setDays(tab, [...days, emptyDay(days.length + 1)])}
                  >
                    Add day
                  </button>
                </div>
              </section>

              {/* ---------------- SEO */}
              <section aria-labelledby={`seo-title-${tab}`} className="grid gap-4">
                <h3 id={`seo-title-${tab}`} className="font-display text-xl font-semibold">
                  Search appearance ({LANGUAGE[tab]})
                </h3>
                <InputField
                  id={`slug-${tab}`}
                  label="URL slug"
                  hint={`Public address: ${PATH_PREFIX[tab]}${t.slug || "your-slug"}. Each language has its own slug. Changing the slug of a live page creates a redirect.`}
                  value={t.slug}
                  maxLength={LIMITS.slug}
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(e) => patchT(tab, { slug: e.target.value.toLowerCase() })}
                />
                <InputField
                  id={`metaTitle-${tab}`}
                  label="SEO title"
                  value={t.metaTitle}
                  maxLength={LIMITS.metaTitle}
                  counter={`${titleLen} (aim for ${SEO_GUIDE.title.min}–${SEO_GUIDE.title.max})`}
                  onChange={(e) => patchT(tab, { metaTitle: e.target.value })}
                />
                <AreaField
                  id={`metaDescription-${tab}`}
                  label="SEO description"
                  rows={3}
                  value={t.metaDescription}
                  maxLength={LIMITS.metaDescription}
                  counter={`${descLen} (aim for ${SEO_GUIDE.description.min}–${SEO_GUIDE.description.max})`}
                  onChange={(e) => patchT(tab, { metaDescription: e.target.value })}
                />
                <p className="-mt-2 text-xs">
                  <span className={lengthTone(titleLen, SEO_GUIDE.title)}>Title length</span> ·{" "}
                  <span className={lengthTone(descLen, SEO_GUIDE.description)}>
                    Description length
                  </span>{" "}
                  <span className="text-ink/55">(guidance only, it never blocks saving)</span>
                </p>
                <PhotoPicker
                  id={`ogImage-${tab}`}
                  label="Social sharing image (Open Graph)"
                  photos={photos}
                  allowNone
                  value={t.ogImage}
                  onChange={(ogImage) =>
                    patchT(tab, { ogImage: ogImage as TranslationDraft["ogImage"] })
                  }
                />
                <InputField
                  id={`canonical-${tab}`}
                  label="Canonical address override"
                  hint="Almost always empty. Only for a page whose content lives on another address."
                  value={t.canonicalOverride}
                  maxLength={LIMITS.canonical}
                  inputMode="url"
                  onChange={(e) => patchT(tab, { canonicalOverride: e.target.value })}
                />
                <CheckField
                  id={`noindex-${tab}`}
                  label="Hide this page from search engines (noindex)"
                  checked={t.noindex}
                  onChange={(e) => patchT(tab, { noindex: e.target.checked })}
                />
                <div
                  aria-label="Search result preview"
                  className="rounded-xl border border-ink/10 bg-[#f7f4ee] p-4"
                >
                  <p className="text-xs text-ink/55">Preview</p>
                  <p className="mt-1 truncate text-lg text-[#1a0dab]">
                    {t.metaTitle || t.title || "Page title"}
                  </p>
                  <p className="truncate text-sm text-emerald-800">
                    {PATH_PREFIX[tab]}
                    {t.slug || "your-slug"}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink/75">
                    {t.metaDescription || t.summary || "The description search engines may show."}
                  </p>
                </div>
              </section>

              {tab === "de" && draft.translations.de && tStatus === "draft" && (
                <div>
                  <button
                    type="button"
                    className={buttonClass("ghost")}
                    onClick={() =>
                      setDraft((d) => ({ ...d, translations: { ...d.translations, de: null } }))
                    }
                  >
                    Remove German translation
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------ save bar */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 bg-[#f7f4ee]/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-8 sm:px-8">
        <div aria-live="polite" className="text-sm">
          {state.error ? (
            <span role="alert" className="text-red-700">
              {state.error}
            </span>
          ) : dirty ? (
            <span className="text-amber-800">Unsaved changes</span>
          ) : (
            <span className="text-ink/60">All changes saved</span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || !dirty}
          aria-busy={pending}
          className={buttonClass()}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
