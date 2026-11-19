// Lets `node --test` run the TypeScript tests without extra dependencies (Node 22 strips types itself).
// It resolves the "@/..." alias and extensionless imports, and stubs the "server-only" marker package.
import { register } from "node:module";
register("./test-hooks.mjs", import.meta.url);
