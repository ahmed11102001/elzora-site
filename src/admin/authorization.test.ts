// Authorization and boundary checks for the dashboard (7.7). They read the source files, so they fail the build the
// moment somebody adds a page, route or server action without a server-side permission check, or lets the public
// site reach dashboard code or credentials. They do not replace `npm run db:verify-privileges`, which checks the
// database itself.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { PERMISSIONS } from "./auth/permissions";

const root = join(fileURLToPath(import.meta.url), "..", "..", "..");
const src = join(root, "src");
const consoleDir = join(src, "app", "admin", "(console)");

function walk(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (/\.(ts|tsx)$/.test(name)) found.push(path);
  }
  return found;
}
const rel = (path: string) => relative(root, path).split(sep).join("/");
const read = (path: string) => readFileSync(path, "utf8");

const allFiles = walk(src);
const adminSide = (path: string) => {
  const r = rel(path);
  return r.startsWith("src/admin/") || r.startsWith("src/app/admin/");
};

/** The body of every `export async function` in a file, by name. */
function exportedFunctions(text: string): Map<string, string> {
  const found = new Map<string, string>();
  const starts = [...text.matchAll(/^export async function (\w+)/gm)];
  starts.forEach((match, i) => {
    const end = starts[i + 1]?.index ?? text.length;
    found.set(match[1], text.slice(match.index, end));
  });
  return found;
}

describe("dashboard pages", () => {
  const pages = walk(consoleDir).filter((f) => f.endsWith(`${sep}page.tsx`));
  // Pages every signed-in user may open: no named permission, but still a verified session.
  const SESSION_ONLY = new Set([
    "src/app/admin/(console)/page.tsx",
    "src/app/admin/(console)/settings/page.tsx",
  ]);

  it("finds the pages (so the checks below are not vacuous)", () => {
    assert.ok(pages.length >= 8, `only ${pages.length} pages found`);
  });

  for (const page of pages) {
    it(`${rel(page)} checks the session on the server`, () => {
      const text = read(page);
      assert.match(text, /requireSession\(/, "calls requireSession");
      if (!SESSION_ONLY.has(rel(page))) {
        const permission = text.match(/requireSession\(\s*"([a-z.]+)"\s*\)/)?.[1];
        assert.ok(permission, "names a permission");
        assert.ok(
          (PERMISSIONS as readonly string[]).includes(permission),
          `unknown permission ${permission}`,
        );
      }
    });
  }

  it("the KPI page needs kpi.read and the leads pages need leads.manage", () => {
    assert.match(read(join(consoleDir, "kpis", "page.tsx")), /requireSession\("kpi\.read"\)/);
    assert.match(read(join(consoleDir, "leads", "page.tsx")), /requireSession\("leads\.manage"\)/);
    assert.match(
      read(join(consoleDir, "leads", "[id]", "page.tsx")),
      /requireSession\("leads\.manage"\)/,
    );
  });
});

describe("dashboard route handlers", () => {
  const routes = walk(consoleDir).filter((f) => f.endsWith(`${sep}route.ts`));
  it("every route handler needs a verified session and a permission", () => {
    assert.ok(routes.length >= 1);
    for (const route of routes) {
      const text = read(route);
      assert.match(text, /getSession\(|requireSession\(/, `${rel(route)} checks the session`);
      assert.match(
        text,
        /can\(session\.role, "[a-z.]+"\)|requireSession\("[a-z.]+"\)/,
        `${rel(route)} checks a permission`,
      );
    }
  });
  it("the lead export needs leads.export and answers 404 otherwise", () => {
    const text = read(join(consoleDir, "leads", "export", "route.ts"));
    assert.match(text, /"leads\.export"/);
    assert.match(text, /status: 404/);
  });
});

describe("server actions", () => {
  const actionFiles = allFiles.filter((f) => /^\s*"use server";/m.test(read(f).slice(0, 200)));
  // Sign-in, sign-out and the second-factor steps run BEFORE a dashboard session exists.
  const BEFORE_SESSION = new Set(["src/admin/auth/actions.ts"]);

  it("finds the action files", () => {
    assert.ok(actionFiles.length >= 3, `only ${actionFiles.length} action files`);
  });

  for (const file of actionFiles.filter((f) => !BEFORE_SESSION.has(rel(f)))) {
    it(`every action in ${rel(file)} checks a permission first`, () => {
      const text = read(file);
      const functions = exportedFunctions(text);
      assert.ok(functions.size > 0);
      for (const [name, body] of functions) {
        const direct = /requireSession\(/.test(body);
        // trips/actions.ts shares one guard: load() calls requireSession(permission).
        const viaLoad =
          /await load\(/.test(body) &&
          /async function load\([\s\S]*?requireSession\(permission\)/.test(text);
        assert.ok(direct || viaLoad, `${name} has no server-side permission check`);
      }
    });
  }

  it("publishing and unpublishing need trips.publish, not just trips.manage", () => {
    const functions = exportedFunctions(read(join(src, "admin", "trips", "actions.ts")));
    assert.match(functions.get("publishTranslation") ?? "", /"trips\.publish"/);
    assert.match(functions.get("unpublishTranslation") ?? "", /"trips\.publish"/);
  });

  it("every lead action needs leads.manage", () => {
    const functions = exportedFunctions(read(join(src, "admin", "leads", "actions.ts")));
    assert.ok(functions.size >= 3);
    for (const [name, body] of functions)
      assert.match(body, /requireSession\("leads\.manage"\)/, name);
  });
});

describe("boundaries between the website and the dashboard", () => {
  // The only places the website may touch dashboard code: the host check and the session proxy (loaded lazily).
  const ALLOWED = new Set(["src/proxy.ts"]);

  it("website code does not import the dashboard", () => {
    for (const file of allFiles.filter((f) => !adminSide(f) && !ALLOWED.has(rel(f)))) {
      assert.doesNotMatch(read(file), /from "@\/admin\/|from "\.\.\/(\.\.\/)*admin\//, rel(file));
    }
  });

  it("the dashboard does not import website components", () => {
    for (const file of allFiles.filter(adminSide)) {
      assert.doesNotMatch(read(file), /from "@\/components\//, rel(file));
    }
  });

  it("the dashboard database credential is read in one file only", () => {
    const users = allFiles.filter((f) => read(f).includes("ADMIN_DATABASE_URL"));
    for (const file of users)
      assert.ok(adminSide(file), `${rel(file)} must not use the dashboard credential`);
  });

  it("the public site never reads the owner or admin credentials directly in client code", () => {
    for (const file of allFiles.filter((f) => /^\s*"use client";/m.test(read(f).slice(0, 200)))) {
      const text = read(file);
      assert.doesNotMatch(text, /from "server-only"/, rel(file));
      assert.doesNotMatch(
        text,
        /from "@\/(lib\/db|lib\/leads\/storage|admin\/db\/|admin\/[a-z]+\/(store|postgres-store))/,
        `${rel(file)} imports server-side data access`,
      );
      for (const match of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        assert.ok(
          match[1].startsWith("NEXT_PUBLIC_") || match[1] === "NODE_ENV",
          `${rel(file)} reads a server-only variable in the browser: ${match[1]}`,
        );
      }
    }
  });

  it("data-access modules are marked server-only", () => {
    for (const path of [
      "src/lib/db.ts",
      "src/lib/leads/storage.ts",
      "src/admin/db/sql.ts",
      "src/admin/leads/store.ts",
      "src/admin/kpis/store.ts",
      "src/admin/trips/postgres-store.ts",
      "src/content/db/public-trips.ts",
    ]) {
      assert.match(read(join(root, path)), /^import "server-only";/m, path);
    }
  });
});
