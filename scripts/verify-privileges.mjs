// Proves the database privilege model of decision D2 against the REAL database, through the real logins.
//
//   npm run db:verify-privileges               checks every role whose URL is set, skips the others
//   npm run db:verify-privileges -- --strict   a skipped check counts as a failure (use before launch)
//   npm run db:verify-privileges -- --launch   also expects that no "review" content is readable publicly
//
// Needs DATABASE_URL (the owner). Optional: DATABASE_URL_PUBLIC, DATABASE_URL_PREVIEW, DATABASE_URL_LEADS,
// ADMIN_DATABASE_URL. Every probe runs inside a transaction that is rolled back: nothing is left behind.
import postgres from "postgres";

const strict = process.argv.includes("--strict");
const launch = process.argv.includes("--launch");
const results = [];
const note = (status, name, detail = "") => {
  results.push(status);
  console.log(`${status.padEnd(4)}  ${name}${detail ? `  (${detail})` : ""}`);
};
const pass = (name, detail) => note("PASS", name, detail);
const fail = (name, detail) => note("FAIL", name, detail);
const skip = (name, detail) => note("SKIP", name, detail);

const ROLLBACK = new Error("rollback");
const open = (url) => postgres(url, { max: 1, prepare: false, onnotice: () => {} });

/** Runs `statements` in a savepoint and always undoes them. Returns the error, or null. */
async function attempt(tx, statements) {
  await tx.unsafe("savepoint probe");
  try {
    for (const statement of statements) await tx.unsafe(statement);
    return null;
  } catch (error) {
    return error;
  } finally {
    await tx.unsafe("rollback to savepoint probe");
  }
}

const denied = async (tx, name, statement) => {
  const error = await attempt(tx, [statement]);
  if (error && error.code === "42501") pass(`denied: ${name}`);
  else
    fail(`denied: ${name}`, error ? `${error.code} ${error.message}` : "the statement succeeded");
};

const allowed = async (tx, name, ...statements) => {
  const error = await attempt(tx, statements);
  if (!error) pass(`allowed: ${name}`);
  else fail(`allowed: ${name}`, `${error.code} ${error.message}`);
};

async function count(tx, statement) {
  await tx.unsafe("savepoint count");
  try {
    const rows = await tx.unsafe(statement);
    return Number(rows[0].n);
  } finally {
    await tx.unsafe("rollback to savepoint count");
  }
}

async function asRole(label, envName, expectedRole, probes) {
  const url = process.env[envName];
  if (!url) return skip(`${label}`, `${envName} is not set`);
  const sql = open(url);
  try {
    await sql.begin(async (tx) => {
      const [who] = await tx`select current_user as u`;
      if (who.u.startsWith(expectedRole)) pass(`${label} connects as ${expectedRole}`, who.u);
      else {
        fail(
          `${label} connects as ${expectedRole}`,
          `it connected as ${who.u}: wrong connection string`,
        );
        throw ROLLBACK;
      }
      await probes(tx);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) fail(`${label} could not run`, `${error.code ?? ""} ${error.message}`);
  } finally {
    await sql.end();
  }
}

const PROBE_LEAD = `INSERT INTO leads (reference_code, idempotency_key, dedupe_hash, locale, full_name, email, country,
  date_flexibility, adults, interests, duration, budget, consent_version, consented_at)
  VALUES ('EZ-PROBE-0000', gen_random_uuid(), 'probe', 'en', 'Probe Test', 'probe@example.invalid', 'DE',
  'undecided', 1, ARRAY['culture'], 'unsure', 'unsure', 'probe', now())`;

const noWrites = async (tx) => {
  await denied(
    tx,
    "insert into trips",
    "INSERT INTO trips (duration_days, style_ids, destination_ids) VALUES (1, '{a}', '{b}')",
  );
  await denied(tx, "update trips", "UPDATE trips SET featured = true");
  await denied(tx, "delete redirects", "DELETE FROM redirects");
  await denied(tx, "create a table", "CREATE TABLE public.elzora_probe (id int)");
};

const noInternals = async (tx) => {
  for (const table of ["lead_activity", "audit_logs", "lead_rate_limits", "schema_migrations"])
    await denied(tx, `read ${table}`, `SELECT count(*) FROM public.${table}`);
};

// ----------------------------------------------------------------------------------------- owner
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (put it in .env.local).");
  process.exit(2);
}

let drafts = 0;
let reviews = 0;
{
  const sql = open(process.env.DATABASE_URL);
  try {
    console.log("\nStructure (owner connection)");
    const noRls = await sql`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
        AND c.relname <> 'schema_migrations'`;
    if (noRls.length === 0) pass("Row Level Security is on for every table");
    else
      fail(
        "Row Level Security is on for every table",
        `missing on: ${noRls.map((r) => r.relname).join(", ")}`,
      );

    const open_ = await sql`
      SELECT tablename, policyname FROM pg_policies
      WHERE schemaname = 'public' AND roles && ARRAY['public', 'anon', 'authenticated']::name[]`;
    if (open_.length === 0)
      pass("no policy lets the Supabase public API (anon / authenticated) in");
    else
      fail(
        "no policy lets the Supabase public API in",
        open_.map((p) => `${p.tablename}.${p.policyname}`).join(", "),
      );

    const definers = await sql`
      SELECT proname, prosecdef FROM pg_proc
      WHERE proname IN ('leads_log_created', 'leads_log_status_change')`;
    if (definers.length === 2 && definers.every((f) => f.prosecdef))
      pass("lead triggers run as their owner (migration 0005)");
    else fail("lead triggers run as their owner (migration 0005)", "run npm run db:migrate");

    [{ n: drafts }] =
      await sql`SELECT count(*)::int AS n FROM trip_translations WHERE status = 'draft'`;
    [{ n: reviews }] =
      await sql`SELECT count(*)::int AS n FROM trip_translations WHERE status = 'review'`;
    console.log(`  (the database holds ${drafts} draft and ${reviews} review translations)`);
  } catch (error) {
    fail("structure checks could not run", `${error.code ?? ""} ${error.message}`);
  } finally {
    await sql.end();
  }
}

// --------------------------------------------------------------------------------------- public
console.log("\nelzora_public (DATABASE_URL_PUBLIC): the public site");
await asRole("public site", "DATABASE_URL_PUBLIC", "elzora_public", async (tx) => {
  await allowed(
    tx,
    "read translations (granted columns)",
    "SELECT trip_id, locale, slug, title, status FROM trip_translations LIMIT 1",
  );
  await allowed(tx, "read redirects", "SELECT old_path, new_path FROM redirects LIMIT 1");
  await denied(tx, "read leads", "SELECT count(*) FROM public.leads");
  await noInternals(tx);
  await denied(tx, "read trips.created_by", "SELECT created_by FROM trips LIMIT 1");
  await denied(
    tx,
    "read every column of trip_translations",
    "SELECT * FROM trip_translations LIMIT 1",
  );
  await denied(tx, "read media license data", "SELECT license_reference FROM media_assets LIMIT 1");
  await noWrites(tx);
  if (drafts > 0) {
    const seen = await count(
      tx,
      "SELECT count(*)::int AS n FROM trip_translations WHERE status = 'draft'",
    );
    if (seen === 0) pass(`drafts are invisible (${drafts} exist)`);
    else fail("drafts are invisible", `the public role sees ${seen}`);
  } else
    skip(
      "drafts are invisible",
      "no draft translation exists; create one in the dashboard and run again",
    );
  if (launch) {
    if (reviews === 0) skip("launch: review content hidden", "no review translation exists");
    else {
      const seen = await count(
        tx,
        "SELECT count(*)::int AS n FROM trip_translations WHERE status = 'review'",
      );
      if (seen === 0) pass(`launch: review content is hidden (${reviews} exist)`);
      else
        fail(
          "launch: review content is hidden",
          `visible: ${seen}. Run npm run db:grants -- --launch`,
        );
    }
  }
});

// -------------------------------------------------------------------------------------- preview
console.log("\nelzora_preview (DATABASE_URL_PREVIEW): signed draft preview");
await asRole("preview", "DATABASE_URL_PREVIEW", "elzora_preview", async (tx) => {
  await allowed(
    tx,
    "read translations (granted columns)",
    "SELECT trip_id, slug, title, status FROM trip_translations LIMIT 1",
  );
  if (drafts > 0) {
    const seen = await count(
      tx,
      "SELECT count(*)::int AS n FROM trip_translations WHERE status = 'draft'",
    );
    if (seen === drafts) pass(`drafts are readable for preview (${drafts})`);
    else fail("drafts are readable for preview", `expected ${drafts}, saw ${seen}`);
  } else skip("drafts are readable for preview", "no draft translation exists");
  await denied(tx, "read leads", "SELECT count(*) FROM public.leads");
  await noInternals(tx);
  await noWrites(tx);
});

// ---------------------------------------------------------------------------------------- leads
console.log("\nelzora_leads (DATABASE_URL_LEADS): the trip planner");
await asRole("trip planner", "DATABASE_URL_LEADS", "elzora_leads", async (tx) => {
  await allowed(
    tx,
    "read leads and the rate limit",
    "SELECT count(*) FROM public.leads",
    "SELECT count(*) FROM public.lead_rate_limits",
  );
  await allowed(
    tx,
    "add a lead, set notification state, and the history trigger still works",
    `${PROBE_LEAD} RETURNING id`,
    "UPDATE leads SET team_notified_at = now() WHERE reference_code = 'EZ-PROBE-0000'",
    "INSERT INTO lead_rate_limits (key, hits) VALUES ('probe', 1) ON CONFLICT (key) DO UPDATE SET hits = lead_rate_limits.hits + 1",
  );
  await allowed(
    tx,
    "find a trip by slug",
    "SELECT trip_id FROM trip_translations WHERE slug = 'probe' ORDER BY (locale = 'en') DESC LIMIT 1",
  );
  await denied(tx, "read lead history and notes", "SELECT count(*) FROM public.lead_activity");
  await denied(tx, "read the audit log", "SELECT count(*) FROM public.audit_logs");
  await denied(tx, "read trips", "SELECT count(*) FROM public.trips");
  await denied(tx, "read a translation's text", "SELECT title FROM trip_translations LIMIT 1");
  await denied(tx, "read media", "SELECT count(*) FROM public.media_assets");
  await denied(tx, "delete leads", "DELETE FROM leads");
  await denied(tx, "change lead status history", "UPDATE lead_activity SET kind = kind");
  await denied(tx, "create a table", "CREATE TABLE public.elzora_probe (id int)");
});

// ---------------------------------------------------------------------------------------- admin
console.log("\nelzora_admin (ADMIN_DATABASE_URL): the dashboard");
await asRole("dashboard", "ADMIN_DATABASE_URL", "elzora_admin", async (tx) => {
  await allowed(
    tx,
    "read leads, history and trips",
    "SELECT count(*) FROM public.leads",
    "SELECT count(*) FROM public.lead_activity",
    "SELECT count(*) FROM public.trips",
  );
  await allowed(
    tx,
    "change a lead and add to the audit log",
    "UPDATE leads SET next_follow_up_on = next_follow_up_on WHERE false",
    "INSERT INTO audit_logs (action) VALUES ('verify.probe')",
  );
  await allowed(
    tx,
    "add a note to a lead's timeline (when a lead exists)",
    "INSERT INTO lead_activity (lead_id, kind) SELECT id, 'note' FROM leads LIMIT 1",
  );
  await denied(tx, "rewrite the audit log", "UPDATE audit_logs SET action = 'x'");
  await denied(tx, "delete from the audit log", "DELETE FROM audit_logs");
  await denied(tx, "rewrite the lead timeline", "UPDATE lead_activity SET kind = kind");
  await denied(tx, "delete from the lead timeline", "DELETE FROM lead_activity");
  await denied(tx, "delete leads", "DELETE FROM leads");
  await denied(tx, "insert leads", "INSERT INTO leads (reference_code) VALUES ('x')");
  await denied(tx, "read the planner rate limit", "SELECT count(*) FROM public.lead_rate_limits");
  await denied(tx, "truncate a table", "TRUNCATE public.leads");
  await denied(tx, "drop a table", "DROP TABLE public.trips");
  await denied(tx, "create a table", "CREATE TABLE public.elzora_probe (id int)");
});

// -------------------------------------------------------------------------------------- summary
const failed = results.filter((r) => r === "FAIL").length;
const skipped = results.filter((r) => r === "SKIP").length;
console.log(
  `\n${results.filter((r) => r === "PASS").length} passed, ${failed} failed, ${skipped} skipped`,
);
if (failed)
  console.log(
    "Fix the failures above (usually: npm run db:migrate && npm run db:grants) and run again.",
  );
if (strict && skipped) console.log("--strict: skipped checks count as failures.");
process.exit(failed || (strict && skipped) ? 1 : 0);
