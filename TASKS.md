# ELZORA — Master Task List

Working name: **ELZORA** (temporary; final brand and domain TBD). Egypt tour lead-gen site for European tourists (EN + DE first).
Business model: we bring the traveler, partner tour companies build the program, we earn a commission.
Primary conversion: **Trip planner request** (and WhatsApp). No online checkout in v1.

**Stack:** Next.js (App Router) + TypeScript (strict) + Tailwind · GSAP + ScrollTrigger · Next.js built-in i18n (proxy + `[lang]`) · headless CMS · Postgres/Supabase · Resend · Vercel.

**Legend:** `[x]` done · `[ ]` todo · **S/M/L** = rough size · ⛔ = blocks later phases

---

## Phase overview

| #   | Phase                         | Goal                                             | Depends on |
| --- | ----------------------------- | ------------------------------------------------ | ---------- |
| 0   | Decisions & prerequisites     | Settle what blocks the build                     | none       |
| 1   | Foundation                    | Empty site that deploys, with i18n and SEO base  | 0 (partly) |
| 2   | Design system & content model | Reusable UI + CMS schemas + image pipeline       | 1          |
| 3   | Light hero & page shell       | Fast first screen on mobile                      | 2          |
| 4   | Journey section               | The signature scroll experience, lazy-loaded     | 2, 3       |
| 5   | Home page sections            | Trust, trip styles, featured trips, reviews, FAQ | 2          |
| 6   | Trip planner & leads          | The conversion engine                            | 1, 2       |
| 7   | Inner pages                   | Trips, destinations, about, contact, legal       | 2, 5       |
| 8   | Ad landing pages              | Campaign pages per market                        | 5, 6       |
| 9   | Tracking & consent            | GA4, Meta, Google Ads, GDPR                      | 6          |
| 10  | German & i18n content         | Full DE launch                                   | 5–8        |
| 11  | QA & performance              | Budgets, devices, a11y, SEO, legal               | all        |
| 12  | Launch & iterate              | Go live, small ad test, improve                  | 11         |

Phases 4, 5 and 6 can run in parallel after Phase 3.

---

## Already done (strategy and prototype)

- [x] Concept, audience, business model
- [x] Site sections and sitemap
- [x] Visual identity direction (navy / gold / sand / Nile teal, serif + sans, flat vector map + photos)
- [x] Hero storyboard (map intro, Nile, 5 stations, finale)
- [x] Interactive prototype: `prototype/journey-prototype.html` (5 stations with distinct transitions, camera moves and explanation styles)
- [x] Photo set collected (Giza, Sphinx, Alexandria, Luxor, Karnak, Aswan, Abu Simbel)
- [x] Site structure and loading strategy agreed (light hero, then lazy journey)
- [x] Phase 1 foundation scaffold (this repo)
- [x] Phase 2 design system, content model and image pipeline
- [x] Phase 3 light hero and journey placeholder
- [x] Phase 4 scroll journey with lazy loading and fallbacks

---

## Phase 0 — Decisions & prerequisites ⛔

- [ ] Final brand name + `.com` domain availability + trademark check (**S**)
- [ ] Confirm launch markets and languages: EN + DE first, IT/FR later (**S**)
- [ ] Partner companies: licensed? contract and commission terms in writing. Decision: no specific company names on the site or in the copy (**M**)
- [ ] Transparency wording: how we earn, and that the traveler is not charged extra (only if true) (**S**)
- [ ] Legal entity details for Imprint/Impressum and Privacy Policy (**S**)
- [ ] **Photo license audit** — every image: source, license, attribution needed? Especially the Library and Sphinx photos with unknown source (**S**)
- [ ] Replace or buy the watermarked Unsplash+ Sphinx image if still referenced (**S**)
- [ ] Choose CMS: Sanity or Strapi (**S**)
- [ ] Lead delivery: which email inbox + which WhatsApp number receives requests (**S**)
- [ ] Accounts: Vercel, GitHub, Google Analytics, Google Ads, Meta Business, Resend, DB (**S**)
- [ ] Who writes and approves English copy; who translates German (**S**)

**Done when:** every item above has an owner and an answer.

---

## Phase 1 — Foundation ✅ (code done; needs your accounts for the last items)

- [x] Create repo, Next.js 16 App Router + TypeScript `strict` (**S**)
- [x] Tailwind 4 with design tokens: `ink #0B1F3A`, `gold #C9A24B`, `sand #F3E9D7`, `teal #2AA6AB` (**S**)
- [x] Fonts self-hosted (`@fontsource` + `next/font/local`): Cormorant Garamond + Inter, `display: swap` (**S**)
- [x] ESLint, Prettier (with Tailwind class sorting), `typecheck` script, pre-commit hook (**S**)
- [x] Folder structure: `app/[lang]`, `components/{ui,layout,home,journey,planner}`, `i18n`, `lib` (**S**)
- [x] i18n with Next's built-in pattern: `proxy.ts` + `[lang]` + typed dictionaries, `/en` and `/de`, Accept-Language detection, language switcher (**M**)
- [x] Root layout: skip link, sticky header (CTA, optional WhatsApp, language switcher), footer, safe-area handling for notched phones (**M**)
- [x] SEO base: metadata, Open Graph, `sitemap.xml` with hreflang, `robots.txt` (blocks indexing unless `ALLOW_INDEXING=true`), canonical + hreflang helper (**M**)
- [x] 404 for unknown URLs (bilingual `global-not-found`) and localized `error.tsx` (**S**)
- [x] `.env.example`, secrets kept out of git (**S**)
- [x] CI workflow: lint + typecheck + format check + build (runs once the repo is on GitHub) (**S**)
- [ ] Push to GitHub, connect Vercel, preview deploys, production domain placeholder (**S**, needs your accounts)
- [ ] Record the Lighthouse baseline on the first preview deploy (**S**)

**Verified locally:** lint, typecheck, format check and production build pass; `/` redirects by
browser language (`de` goes to `/de`, others to `/en`); `/en` and `/de` return 200 with correct
`lang`, title, canonical and hreflang; unknown URLs return 404 with `noindex`; `robots.txt`
disallows by default; the sitemap lists both locales with alternates.

**Known limits:** the per-locale 404 text is bilingual because the 404 page cannot read the
locale; the German strings are a first draft for native review (Phase 10); the header nav is
empty until the inner pages exist (Phase 7).

---

## Phase 2 — Design system & content model ✅ (code done; needs your decisions on the last items)

- [x] UI primitives: Button, Chip, Card, Section, Container, Modal (native dialog), Accordion (native details), Field + Input/Select/Textarea with aria wiring, Stepper (**M**)
- [x] Header mobile menu (built; appears automatically once nav items exist in Phase 7) (**M**)
- [ ] Footer: legal links and partner statement (added in Phase 7 with the legal pages) (**S**)
- [x] Content model with zod schemas: `TripStyle`, `Destination`, `Trip`, `Review`, `Faq`, internal `Partner`, plus a data layer that validates and cross-checks references (**M**)
- [x] Seed content in EN: 3 trips, 6 trip styles, 5 destinations, 6 FAQs, all marked `review` (**M**)
- [x] Image pipeline: `npm run images`, AVIF + WebP at 3 widths, blur placeholder, credits, license registry (**M**)
- [x] Reusable `Skeleton` and `TripCardSkeleton` (**S**)
- [x] Inline SVG icon set (11 icons, no library) (**S**)
- [x] Internal `/en/design` page to review components (hidden in production) (**S**)
- [ ] Connect the chosen CMS (Sanity or Strapi): only `src/content/index.ts` changes (**M**, blocked by the Phase 0 CMS decision)
- [ ] Review and approve the seed copy, then switch statuses to `published` (**M**, needs you)
- [ ] Verify the license of the Library, Sphinx and Luxor Temple photos, then mark them `ok` in `assets/images.json` and run `npm run images` (**S**, needs you)

**Verified locally:** lint, typecheck, format check and build pass; `/en/design` and `/de/design` render all
components with seed data (German labels on the cards); AVIF/WebP files are served; with default env the
design page returns 404 and the site pages still work.

**Known limits:** I could not check the visual result in a browser here, so review `/en/design` in yours and
tell me what to adjust. The mobile header gets crowded on very narrow phones once the menu button
appears (Phase 7). The Alexandria destination has no photo until a licensed one is confirmed.

---

## Phase 3 — Light hero & page shell ✅ (code done; real-device measurement pending)

- [x] Hero: H1 _"Egypt isn't a destination. It's a journey."_, one-line sub, primary CTA "Design my trip" (**M**)
- [x] Trust chips: licensed partners, reply within 24h, 24/7 support (**S**)
- [x] Hero image: Giza, AVIF/WebP at 3 widths, `<link rel="preload">` for the LCP image, blur placeholder, gradient overlay for legibility (**S**)
- [x] "Follow the journey ↓" button scrolling to the journey section (**S**)
- [x] No GSAP and no client JavaScript in the hero (server-rendered) (**S**)
- [x] Journey section reserves a full-screen height with a static map of the five stops (the same section the animated journey loads into) (**S**)
- [x] English and German strings for all of the above (**S**)
- [ ] Measure LCP / CLS / INP on a throttled-4G phone after the first deploy (**S**, needs a deployment)

**Verified locally:** lint, typecheck and build pass; `/en` and `/de` render the hero, trust chips and journey
section in the right language with a single `<h1>`; the LCP image is preloaded with a responsive `srcset`;
the Giza hero photo is 15 KB (640 px) to 139 KB (1920 px) as AVIF; the home page loads about 137 KB of
JavaScript (gzip) in modern browsers, nearly all of it the Next.js/React runtime (the hero adds none).
CSS is about 7 KB gzip.

**Needs your decision before launch:**

- The trust chips are claims. "Licensed local partners" depends on the Phase 0 partner check, and
  "24/7 support" must be true in practice. Reword them if not.
- "Design my trip" points to `#planner`, which exists only after Phase 6, so it does not scroll anywhere yet.
- The hero uses the blue-sky Giza photo. A golden-hour photo would suit the brand better if you find one.

---

## Phase 4 — Journey section ✅ (code done; needs real-device testing and your review)

**4a. Architecture**

- [x] Lazy loading: `JourneyEnhancer` imports the animation chunk with dynamic `import()` (GSAP + ScrollTrigger, ~50 KB gzip, not in the first paint) (**S**)
- [x] Activation: the chunk loads when the page is idle and the section is swapped as soon as it is ready (if the visitor is not already inside it); falls back to static on any error; `?journey=animated|static` override and a console message explain the choice (**M**)
- [x] Data-driven stations config (`stations.ts`) and schedule (**M**)
- [x] Map as inline SVG: static `EgyptMapOutline` and animated map share `map-data.ts` (**M**)
- [x] Timeline builder (`timeline.ts`) with reveal, photo motion and text presets (**L**)
- [x] Cleanup on unmount (`gsap.context().revert()`), mobile URL-bar resize ignored (**S**)

**4b. Stations** (each uses a different reveal, camera flight, photo motion and text style)

- [x] Alexandria: split-open, tilt, editorial caption + polaroid page (**M**)
- [x] Giza: circle zoom, sunrise grade, animated counters, Sphinx card (**M**)
- [x] Luxor: curtain rises, chip + stack of three places (**M**)
- [x] Aswan: wipe left to right, sideways drift, one quiet quote (**S**)
- [x] Abu Simbel: window opens, push-in, outlined title (**M**)
- [x] Finale (map lit up, call to action), clickable progress rail, Skip journey button (**S**)

**4c. Loading and fallbacks**

- [x] Placeholder: the intro (title + route map) and the static cards stay until the animated version is ready (**S**)
- [x] Blur-up on every photo (**S**)
- [x] Progressive loading: station N+1 photos mount while the visitor is on station N (**M**)
- [x] Mobile variant: no brightness filter, no card blur, shorter scroll distance (**M**)
- [x] Static version for reduced motion, Save-Data, 2G/3G and low-memory devices; also what no-JS visitors and search engines get (**M**)
- [x] Real text in the DOM, Skip first in tab order, rail with `aria-current`, finale not focusable until visible (**M**)
- [ ] Manual screen reader and keyboard pass (**S**, needs a real device)

**4d. Content**

- [ ] Fact-check and approve the captions in EN and DE (**M**, needs you)
- [ ] Extra stops later: Luxor Temple at night, Red Sea, Siwa (**S**)

**Verified locally:** lint, typecheck and build pass. A throwaway jsdom test (not in the repo) built the
timeline from the real markup in EN and DE: duration 207 units, every scene opens and closes at the scheduled
time, the Giza counters read `4,500+ / 2.3 M` (DE `4.500+ / 2,3 M`) and reset when scrolling back, the finale is
hidden until the end, and 200 scrub steps forward and back throw nothing. The server HTML contains all station
text in both languages. The first paint still loads about 138 KB of JavaScript (gzip, modern browsers) and
none of it is GSAP.

**Not verified (I cannot run a browser here):** how it looks, scroll smoothness on a phone, the pin on iOS
Safari, and the real timing of the lazy load. Please test on a real phone and tell me what to adjust.

**Photo licenses:** the Library, Sphinx and Luxor Temple photos have no confirmed license. They are used as
placeholders (the final photos come from the partner). `npm run build` only warns; set
`ENFORCE_IMAGE_LICENSES=true` to make it fail while unconfirmed photos remain.

**If you see the static version instead of the animation:** open the browser console. In development it prints
the reason (for example "the system asks for reduced motion"). `?journey=animated` forces the animation.

**Known limits:** the journey is about 7 screens of scrolling on desktop and 5 on phones (Skip is always
available); the finale has one button because the trips page does not exist yet, and "Design my trip" points
to `#planner` (Phase 6).

---

## Phase 5 — Home page sections

- [ ] Trust bar: partner licenses, ratings, support, cancellation policy (**S**)
- [ ] "Choose your journey": Classic · Nile Cruise · Red Sea · Desert & Siwa · Family · Honeymoon (**M**)
- [ ] Featured trips: cards (days, "from €", highlights) from CMS + skeletons (**M**)
- [ ] Why us + transparency (how we earn) (**S**)
- [ ] Reviews and traveler photos (placeholder until real ones exist) (**M**)
- [ ] FAQ: safety, visa, best time, payments, cancellation, tipping (**M**)
- [ ] Final CTA block before the footer (**S**)

**Done when:** the home page reads top to bottom as the agreed customer journey.

---

## Phase 6 — Trip planner & leads

- [ ] Multi-step form, one question per screen: when, who, interests, budget, contact (**L**)
- [ ] Validation with zod (client and server) (**S**)
- [ ] API route: store lead in the database with source, UTM, locale, timestamp (**M**)
- [ ] Notifications: email to the team via Resend, WhatsApp link to the traveler (**M**)
- [ ] Confirmation page and confirmation email (**S**)
- [ ] Spam protection: honeypot + Cloudflare Turnstile, rate limit (**M**)
- [ ] GDPR consent checkbox with a link to the privacy policy (**S**)
- [ ] Error, offline and retry states (**S**)
- [ ] Simple admin view or export of leads (CSV or CMS) (**M**)
- [ ] Sticky "Plan my trip" entry point on mobile (**S**)

**Done when:** a test lead goes from the form to the database, the team's inbox and the traveler's confirmation, and spam is filtered.

---

## Phase 7 — Inner pages

- [ ] Trips listing with filters (style, duration, budget) (**M**)
- [ ] Trip detail: day-by-day itinerary, inclusions/exclusions, gallery, CTA (**L**)
- [ ] Destination pages: Giza, Luxor, Alexandria, Aswan, Abu Simbel (SEO content) (**L**)
- [ ] About and Contact (**S**)
- [ ] Legal: Privacy, Terms, Cookies, **Imprint/Impressum** (needed for Germany) (**M**)
- [ ] Blog scaffold with 2–3 SEO articles ("best time to visit Egypt", "10-day Egypt itinerary") (**M**)
- [ ] Structured data (TouristTrip / Organization / FAQ) (**S**)

**Done when:** every nav link resolves, each page has unique metadata.

---

## Phase 8 — Ad landing pages

- [ ] `/lp/[campaign]` template: minimal nav, one offer, planner embedded, social proof (**M**)
- [ ] Per-market versions (DE first) with matching ad copy (**M**)
- [ ] Fast variant: no journey section, hero + planner above the fold (**S**)
- [ ] A/B hooks for headline and CTA (**S**)

**Done when:** a landing page loads in under 2 s and tracks conversions.

---

## Phase 9 — Tracking & consent

- [ ] Cookie banner with Consent Mode v2 (EU requirement) (**M**)
- [ ] GA4, Meta Pixel, Google Ads conversion, loaded only after consent (**M**)
- [ ] Event map: `view_journey`, `journey_station_n`, `planner_start`, `planner_step_n`, `lead_submit`, `whatsapp_click` (**M**)
- [ ] UTM and click-ID persistence into the lead record (**S**)
- [ ] Optional: server-side conversion events (**M**)
- [ ] Verify with Tag Assistant and Meta Events Manager (**S**)

**Done when:** a test lead shows up as a conversion in each platform, and nothing fires before consent.

---

## Phase 10 — German & i18n content

- [ ] Translate UI strings, journey captions, trip content, FAQ, legal pages (**L**)
- [ ] Native review of the German copy (**M**)
- [ ] Locale formats: dates, currency, number separators (**S**)
- [ ] Check `hreflang`, localized metadata and sitemap (**S**)
- [ ] Layout test for longer German strings (**S**)
- [ ] Later: IT, FR (**L each**)

**Done when:** `/de` is a full, native-quality mirror of `/en`.

---

## Phase 11 — QA & performance

- [ ] Budgets: LCP < 2.5 s (4G mobile), initial JS < ~150 KB, CLS ≈ 0 (**M**)
- [ ] Real devices: low-end Android, recent iPhone, iPad, desktop Chrome/Safari/Firefox (**M**)
- [ ] Accessibility audit (WCAG AA): contrast, keyboard, screen reader, reduced motion (**M**)
- [ ] SEO audit: titles, descriptions, headings, canonical, structured data (**S**)
- [ ] Form and lead flow end-to-end tests (**S**)
- [ ] Image audit: sizes, alt text, licenses and credits (**S**)
- [ ] Broken-link check and 404 review (**S**)
- [ ] Legal review of copy claims (licensing, "from €" prices, cancellation) (**S**)
- [ ] Security headers and dependency audit (**S**)

**Done when:** every budget passes on real devices and no blocker remains.

---

## Phase 12 — Launch & iterate

- [ ] Domain, DNS, SSL, redirects (`www`, trailing slashes) (**S**)
- [ ] Monitoring: Sentry, Vercel Analytics, uptime check (**S**)
- [ ] Database backups (**S**)
- [ ] Link ad accounts and verify conversions on production (**S**)
- [ ] Soft launch with a small ad budget in one market (**M**)
- [ ] Review week 1: bounce, planner completion rate, cost per lead (**S**)
- [ ] Iterate: heatmaps/recordings, headline tests, journey length (**ongoing**)
- [ ] Backlog: more stations (Luxor Temple at night, Red Sea, Siwa), reviews from real travelers, IT/FR, partner dashboard (**later**)

---

## Suggested order of work

1. Phase 0 (runs alongside everything else) and Phase 1
2. Phase 2, then Phase 3
3. Phases 4, 5, 6 in parallel
4. Phases 7, 8, 9
5. Phase 10, then Phase 11
6. Phase 12

## Risks to watch

- **Mobile performance of the journey** → lazy load, lighter variant, static fallback
- **Photo licensing** → audit in Phase 0, credit where required
- **GDPR / ad tracking in the EU** → consent first, Consent Mode v2
- **Trust as a middleman** → licenses, transparency and reviews visible early
- **Scope creep in the journey** → keep to 5 stations plus finale until after launch
