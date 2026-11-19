# ELZORA site

Working name: **ELZORA** (final brand and domain to be decided). Egypt tour lead-gen site for
European travelers, English and German first.

**Stack:** Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript (strict) ·
Tailwind CSS 4 · ESLint · Prettier. The master plan is in [`TASKS.md`](./TASKS.md).

## Requirements

- Node.js 22 or newer (`.nvmrc`)
- npm

## Getting started (Windows PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. It redirects to `/en` or `/de` from the browser language.

## Scripts

| Script                 | What it does                               |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Dev server                                 |
| `npm run build`        | Production build                           |
| `npm start`            | Serve the production build                 |
| `npm run lint`         | ESLint                                     |
| `npm run typecheck`    | Generates route types, then `tsc --noEmit` |
| `npm run format`       | Prettier, write                            |
| `npm run format:check` | Prettier, check only (used in CI)          |

A pre-commit hook (simple-git-hooks + lint-staged) formats and lints staged files. It installs on
`npm install` once the folder is a git repository (run `npm install` again after `git init`).

## Environment variables

See `.env.example`. `NEXT_PUBLIC_*` values are inlined at **build** time.

| Variable                      | Purpose                                                                |
| ----------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`        | Canonical URLs, sitemap, Open Graph                                    |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Optional. Digits only. The WhatsApp button is hidden when empty        |
| `ALLOW_INDEXING`              | `true` only in production. Otherwise `robots.txt` disallows everything |

## Structure

```
src/
  app/
    [lang]/            root layout, pages, error.tsx (one tree for /en and /de)
    global-not-found.tsx  404 for unknown URLs (bilingual)
    fonts.ts, globals.css (design tokens), sitemap.ts, robots.ts
  components/
    ui/                Button, Container
    layout/            Header, Footer, LanguageSwitcher, MobileNav, SkipLink
    trips/             TripCard, TripCardSkeleton
    home/              Hero (light first screen)
    journey/           the scroll journey (see "Journey" below)
    planner/           later phase
  content/             schema (zod), seed data, data-access functions, generated image manifest
  i18n/                config, typed dictionaries (en.json, de.json), client-safe error strings
  lib/                 site config, routes (nav + sitemap), SEO helpers, utils
  proxy.ts             locale detection and redirect (Next 16 name for middleware)
assets/images.json     license registry for every source photo (originals are git-ignored)
scripts/               process-images.mjs
prototype/             standalone journey prototype (reference for Phase 4)
```

## i18n

- Locales live in `src/i18n/config.ts`. URLs are always prefixed: `/en/...`, `/de/...`.
- `src/proxy.ts` redirects unprefixed URLs using `Accept-Language` (default `en`).
- Add a string: put the key in `en.json` and `de.json` (the German file must match the English
  shape, TypeScript enforces it), then use `dict.section.key` in a server component.
- Client components cannot import the dictionaries (they are `server-only`). Pass strings as props,
  or use `src/i18n/errors.ts` for strings needed by `error.tsx`.
- Add a page to the sitemap and header by editing `src/lib/routes.ts`. Use `localizedAlternates()`
  from `src/lib/seo.ts` in each page's metadata for canonical and hreflang tags.
- Adding a language: add it to `locales` and `localeLabels`, create `<code>.json`, register it in
  `src/i18n/dictionaries.ts` and `src/i18n/errors.ts`.

## Content model

All CMS-style content is described in `src/content/schema.ts` (zod): `TripStyle`, `Destination`,
`Trip` (with itinerary days), `Review`, `Faq` and an internal `Partner` registry. Pages read it through
`src/content/index.ts` (`getTrips()`, `getTrip(id)`, `getDestinations()`, `getFaqs()`, ...), which
validates the data and cross-checks references (unknown style, wrong day numbers, ...) at build time.

- The data currently comes from `src/content/seed/*.ts`. When the CMS is chosen, only
  `src/content/index.ts` changes: it fetches from the CMS and parses with the same schemas.
- Every text field is `{ en, de? }`. German falls back to English until Phase 10.
- `status` is `draft`, `review` or `published`. Production serves only `published`, with no override.
  In development (`next dev`) `review` content is shown too, so the full page can be reviewed before
  approval (`draft` also needs `SHOW_DRAFT_CONTENT=true`). The home page shows a development-only
  placeholder where there are no real reviews.
- No reviews are seeded on purpose, and prices are empty until a partner confirms them.
- Partners are internal: the `Partner` registry is never exported to pages and no company is named.

## Photos

1. Put the original photos in `assets/originals/` (git-ignored, the file names are in `assets/images.json`).
2. Run `npm run images`. It creates AVIF + WebP at 640/1280/1920 px in `public/images`, a blur
   placeholder and the credit, and writes `src/content/images.generated.json`.
3. Show a photo with `<Photo id="giza-pyramids" alt="..." sizes="..." />`. The id is type-checked
   against the manifest. Use `priority` only for the one LCP image.

`npm run images` processes images marked `"ok"` and `"unverified"` (license not confirmed yet), so the
site can be built and reviewed. `blocked` ones (watermarked Unsplash+) are never processed. Use
`npm run images -- --only-verified` to build only the confirmed ones.

**License check:** `npm run build` runs `scripts/check-images.mjs` first and lists photos whose license is
not confirmed yet. It only warns. Set `ENFORCE_IMAGE_LICENSES=true` to make it fail the build (useful once
the final photos are in). To clear a photo: set `"status": "ok"` in `assets/images.json`, then run
`npm run images`.

## Journey

The scroll-driven journey (map, five stations, finale) lives in `src/components/journey`. It is
progressively enhanced:

1. **Server HTML (always):** `JourneyIntro` (title + route map) and `StaticJourney` (every station as a
   card). This is what search engines, no-JS visitors and everyone who cannot animate see.
2. **Enhancement (`JourneyEnhancer`, client):** if the device allows it (`gate.ts`: no reduced motion, no
   Save-Data, not 2G/3G, more than 2 GB memory) the animation chunk (GSAP + ScrollTrigger, about 50 KB
   gzip) is downloaded once the page is idle. As soon as it is ready the section is swapped for the
   animated journey, unless the visitor has already scrolled deep into the static cards. If anything
   fails, the static version stays (an error boundary catches crashes).
   **Debugging:** in development the console prints `[journey] ...` with the reason for the version
   you got. Add `?journey=animated` to the URL to force the animation (ignores reduced motion and the
   network checks) or `?journey=static` to force the static version.
3. **Animated stage (`JourneyAnimated` + `JourneyStage` + `timeline.ts`):** one GSAP timeline scrubbed by
   scroll. Photos for station N+1 are mounted while the visitor is on station N.

Stations are data. `stations.ts` sets, per station, the photo, camera zoom and ease, `travel` and `hold`
durations, `reveal` (clip-path shape), `motion` (how the photo moves) and `explain` (how the text is
shown). `computeSchedule()` lays them out on the timeline; add, remove or reorder a station there.
Station coordinates are in `map-data.ts`, copy is in `journey` in the dictionaries.

On phones (`variant: "mobile"`) the photo brightness filter and the card blur are off and the scroll
distance is shorter.

## Trip planner and leads (Phase 6)

`/en/plan-your-trip` and `/de/plan-your-trip`: seven one-question screens (dates, travellers, experience,
duration, budget, contact, review), then a confirmation page. No payment or booking.

- **UI:** `src/components/planner` (state in memory only, never in browser storage), copy in `planner` in the dictionaries.
- **Shared validation:** `src/lib/leads/schema.ts` (zod). Errors are codes; the UI maps them to `planner.errors`.
- **API:** `POST /api/leads`. Order: rate limit, honeypot, validation, duplicate check, Turnstile, save, notify.
  Success is returned only after the lead is stored. Logic lives in `src/lib/leads/submit.ts` (framework-free, tested).
- **Database:** plain Postgres via `DATABASE_URL` (`postgres` package). Tables in `db/migrations/0001_create_leads.sql`
  (`leads`, `lead_rate_limits`), applied with `npm run db:migrate`. RLS is enabled with no policies so Supabase's public API cannot read them.
- **Duplicates:** the browser sends an idempotency key per attempt; the server also fingerprints the answers (30 min window).
- **Emails:** Resend over HTTP (`src/lib/leads/notifications.ts`), team notification plus localized traveler confirmation, sent after
  the response. Failures are stored on the lead and retried with
  `curl -X POST -H "Authorization: Bearer $LEADS_ADMIN_TOKEN" https://<site>/api/admin/leads/retry-notifications`.
- **Export:** `curl -H "Authorization: Bearer $LEADS_ADMIN_TOKEN" https://<site>/api/admin/leads/export -o leads.csv`
  (UTF-8 with BOM, formula-injection safe). There is no admin login in this project: this is one shared secret, and the routes
  answer 404 while it is unset. Also protect `/api/admin/*` at the platform level.
- **Attribution:** first-touch UTM, referrer and landing page are kept in `sessionStorage` (`AttributionCapture`) and sent with the lead.
- **Tests:** `npm test` (Node's built-in runner, no extra packages).

Still needed from the owner: `DATABASE_URL` + `npm run db:migrate`, Resend key and a verified sender domain, Turnstile keys,
the real Privacy Policy page at `/{lang}/privacy` (Phase 7, the consent link points there) and its version in
`CONSENT_VERSION` (`src/lib/leads/options.ts`), plus legal wording review of the consent text and the Cloudflare mention.

## Design page

`/en/design` shows every component with real seed data. It is available in dev and returns 404 in
production unless `ENABLE_DESIGN_PAGE=true`.

## Next.js 16 notes

- This Next.js version differs from older ones. Read the docs shipped in
  `node_modules/next/dist/docs/` before changing framework-level code (see `AGENTS.md`).
- `middleware.ts` is now `proxy.ts`.
- **Cache Components** is on (`next.config.ts`). Avoid `new Date()` or random values in server
  components outside a `Suspense` boundary or a `"use cache"` scope.
- The root layout sits under `[lang]`, so unknown URLs use the experimental `global-not-found.tsx`.
  `notFound()` inside a page still needs its own `not-found.tsx` below the root layout.
- `next/font/local` needs literal option values (no helper functions) in `src/app/fonts.ts`.

## Deploying (Vercel)

1. Import the GitHub repository.
2. Set `NEXT_PUBLIC_SITE_URL`, and `ALLOW_INDEXING=true` for **Production only**.
3. Preview deployments stay out of search results by default.
