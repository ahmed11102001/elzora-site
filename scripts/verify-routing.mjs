// Checks localized routing against a RUNNING server (npm run dev, or npm start after a build).
//
//   npm run verify:routing -- --phase 7.1 [--base http://localhost:3000]
//
// The table below is an independent copy of the approved route map (docs/phase-7/7.0-design.md). It is
// deliberately NOT imported from src/lib/routes.ts, so a mistake in the real map is caught here.
const ORDER = ["6", "7.1", "7.2", "7.3"];
const ROUTES = [
  { key: "planner", phase: "6", en: "/plan-your-trip", de: "/reise-planen", sitemap: true },
  {
    key: "plannerConfirmation",
    phase: "6",
    en: "/plan-your-trip/confirmation",
    de: "/reise-planen/bestaetigung",
  },
  { key: "about", phase: "7.1", en: "/about", de: "/ueber-uns", sitemap: true },
  { key: "contact", phase: "7.1", en: "/contact", de: "/kontakt", sitemap: true },
  { key: "privacy", phase: "7.1", en: "/privacy", de: "/datenschutz", sitemap: true },
  { key: "terms", phase: "7.1", en: "/terms", de: "/agb", sitemap: true },
  { key: "cookies", phase: "7.1", en: "/cookies", de: "/cookies", sitemap: true },
  { key: "trips", phase: "7.3", en: "/trips", de: "/reisen", sitemap: true },
  { key: "destinations", phase: "7.3", en: "/destinations", de: "/reiseziele", sitemap: true },
];
const LEGACY = [
  ["/de/plan-your-trip", "/de/reise-planen"],
  ["/de/plan-your-trip/confirmation", "/de/reise-planen/bestaetigung"],
];

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const base = arg("base", "http://localhost:3000").replace(/\/$/, "");
const phase = arg("phase", "7.1");
if (!ORDER.includes(phase)) {
  console.error(`--phase must be one of ${ORDER.join(", ")}`);
  process.exit(2);
}
const included = ROUTES.filter((r) => ORDER.indexOf(r.phase) <= ORDER.indexOf(phase));

let failures = 0;
const report = (ok, label, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};
const get = (path) => fetch(base + path, { redirect: "manual" });
const locationPath = (res) => {
  const loc = res.headers.get("location");
  return loc ? new URL(loc, base).pathname : null;
};
const alternates = (html) => {
  const out = {};
  for (const tag of html.match(/<link\b[^>]*>/g) ?? []) {
    if (!/rel="alternate"/.test(tag)) continue;
    const lang = /hrefLang="([^"]+)"|hreflang="([^"]+)"/i.exec(tag);
    const href = /href="([^"]+)"/.exec(tag);
    if (lang && href) out[lang[1] ?? lang[2]] = new URL(href[1], base).pathname;
  }
  return out;
};

try {
  await get("/en");
} catch {
  console.error(`Cannot reach ${base}. Start the server first (npm run dev).`);
  process.exit(2);
}

for (const route of included) {
  for (const lang of ["en", "de"]) {
    const path = `/${lang}${route[lang]}`;
    const res = await get(path);
    report(res.status === 200, `${path} is 200`, `got ${res.status}`);
    if (res.status !== 200) continue;
    const html = await res.text();
    report(new RegExp(`<html[^>]*\\blang="${lang}"`).test(html), `${path} has html lang="${lang}"`);
    const alt = alternates(html);
    report(
      alt.en === `/en${route.en}` && alt.de === `/de${route.de}`,
      `${path} hreflang points to localized URLs`,
      JSON.stringify(alt),
    );
  }
  if (route.en !== route.de) {
    const internal = `/de${route.en}`;
    const res = await get(internal);
    report(
      [301, 307, 308].includes(res.status) && locationPath(res) === `/de${route.de}`,
      `${internal} redirects to /de${route.de}`,
      `got ${res.status} ${locationPath(res) ?? ""}`,
    );
    const wrong = await get(`/en${route.de}`);
    report(
      wrong.status === 404,
      `/en${route.de} is 404 (no cross-language alias)`,
      `got ${wrong.status}`,
    );
  }
}

for (const [from, to] of LEGACY.filter(([f]) => included.some((r) => `/de${r.en}` === f))) {
  const res = await get(from);
  report(
    [301, 307, 308].includes(res.status) && locationPath(res) === to,
    `${from} redirects to ${to}`,
    `got ${res.status} ${locationPath(res) ?? ""}`,
  );
}

const q = await get("/de/plan-your-trip?utm_source=test");
if (included.some((r) => r.key === "planner")) {
  report(
    (locationPath(q) ?? "") === "/de/reise-planen" &&
      (q.headers.get("location") ?? "").includes("utm_source=test"),
    "redirects keep the query string",
    q.headers.get("location") ?? "",
  );
}

const unknown = await get("/de/gibt-es-nicht");
report(unknown.status === 404, "unknown German URL is 404", `got ${unknown.status}`);

const sitemap = await get("/sitemap.xml");
const xml = sitemap.status === 200 ? await sitemap.text() : "";
report(sitemap.status === 200, "/sitemap.xml is 200", `got ${sitemap.status}`);
for (const route of included.filter((r) => r.sitemap)) {
  for (const lang of ["en", "de"]) {
    report(xml.includes(`/${lang}${route[lang]}</loc>`), `sitemap lists /${lang}${route[lang]}`);
  }
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
