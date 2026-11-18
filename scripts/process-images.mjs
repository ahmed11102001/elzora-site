// Turns the originals in assets/originals into responsive AVIF + WebP files in public/images
// and writes src/content/images.generated.json (sizes, blur placeholder, credit).
//
//   npm run images                       processes "ok" and "unverified" images from assets/images.json
//   npm run images -- --only-verified    only "ok" images
//   npm run images -- --force            reprocess everything
//
// Images marked "blocked" are never processed. "unverified" ones (license not confirmed) are processed so
// the site can be built and reviewed, but `npm run build` fails on a production deploy
// (ALLOW_INDEXING=true) while any of them is still in the manifest. See scripts/check-images.mjs.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const originals = path.join(root, "assets/originals");
const outDir = path.join(root, "public/images");
const registryPath = path.join(root, "assets/images.json");
const manifestPath = path.join(root, "src/content/images.generated.json");

const WIDTHS = [640, 1280, 1920];
const args = new Set(process.argv.slice(2));
const includeUnverified = !args.has("--only-verified");
const force = args.has("--force");

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
const manifest = {};
mkdirSync(outDir, { recursive: true });

const kb = (n) => `${Math.round(n / 1024)} KB`;
const rows = [];

for (const entry of registry) {
  const allowed = entry.status === "ok" || (includeUnverified && entry.status === "unverified");
  if (!allowed) {
    rows.push([
      entry.id,
      entry.status === "blocked" ? "BLOCKED" : "skipped (license not verified)",
    ]);
    continue;
  }
  const input = path.join(originals, entry.file);
  if (!existsSync(input)) {
    rows.push([entry.id, `MISSING original: assets/originals/${entry.file}`]);
    continue;
  }

  const widthsDone = previous[entry.id]?.widths ?? [];
  const upToDate =
    !force &&
    previous[entry.id] &&
    widthsDone.every((w) =>
      ["avif", "webp"].every((ext) => {
        const f = path.join(outDir, `${entry.id}-${w}.${ext}`);
        return existsSync(f) && statSync(f).mtimeMs >= statSync(input).mtimeMs;
      }),
    );
  if (upToDate) {
    manifest[entry.id] = { ...previous[entry.id], status: entry.status };
    rows.push([entry.id, "up to date"]);
    continue;
  }

  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.clone().metadata();
  const srcW = meta.autoOrient?.width ?? meta.width;
  const srcH = meta.autoOrient?.height ?? meta.height;
  const widths = WIDTHS.filter((w) => w <= srcW);
  if (widths.length === 0) widths.push(srcW);

  let total = 0;
  for (const w of widths) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    const avif = await resized.clone().avif({ quality: 55, effort: 4 }).toBuffer();
    const webp = await resized.clone().webp({ quality: 74 }).toBuffer();
    writeFileSync(path.join(outDir, `${entry.id}-${w}.avif`), avif);
    writeFileSync(path.join(outDir, `${entry.id}-${w}.webp`), webp);
    total += avif.length + webp.length;
  }

  const blur = await base.clone().resize({ width: 16 }).jpeg({ quality: 45 }).toBuffer();

  const maxW = Math.max(...widths);
  manifest[entry.id] = {
    width: maxW,
    height: Math.round((srcH / srcW) * maxW),
    widths,
    blur: `data:image/jpeg;base64,${blur.toString("base64")}`,
    status: entry.status,
    credit: entry.author === "unknown" ? "" : `${entry.author} / ${entry.source}`,
  };
  rows.push([entry.id, `${widths.join("/")} px, ${kb(total)} total`]);
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n");

console.log("");
for (const [id, msg] of rows) console.log(`  ${id.padEnd(22)} ${msg}`);
console.log(`\n  ${Object.keys(sorted).length} images in src/content/images.generated.json`);
