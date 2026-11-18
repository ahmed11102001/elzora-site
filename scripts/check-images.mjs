// Runs before `npm run build`. Lists photos whose license is not confirmed yet.
// It only warns. To make it fail the build (for example on the production deploy once the real photos
// are in), set ENFORCE_IMAGE_LICENSES=true.
import { existsSync, readFileSync } from "node:fs";

const manifestPath = "src/content/images.generated.json";
if (!existsSync(manifestPath)) process.exit(0);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const unverified = Object.entries(manifest)
  .filter(([, m]) => m.status !== "ok")
  .map(([id]) => id);
if (unverified.length === 0) process.exit(0);

const list = unverified.map((id) => `  - ${id}`).join("\n");
if (process.env.ENFORCE_IMAGE_LICENSES === "true") {
  console.error(
    `\nBuild blocked (ENFORCE_IMAGE_LICENSES=true): photos without a confirmed license:\n${list}\n\n` +
      `Set "status": "ok" in assets/images.json for each one, then run \`npm run images\`.\n`,
  );
  process.exit(1);
}
console.warn(`\n[images] License not confirmed for (placeholders for now):\n${list}\n`);
