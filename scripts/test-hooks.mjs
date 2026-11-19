import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", ".json", "/index.ts"];

function tryFile(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === "server-only")
    return { url: "data:text/javascript,export {}", shortCircuit: true };
  // zod 3.25 ships the v4 API under "zod/v4"; zod 4 keeps that subpath, so this works with either.
  if (specifier === "zod") return next("zod/v4", context);
  let base = null;
  if (specifier.startsWith("@/")) base = resolvePath(root, "src", specifier.slice(2));
  else if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  )
    base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
  const file = base && tryFile(base);
  if (file) return next(pathToFileURL(file).href, context);
  return next(specifier, context);
}
