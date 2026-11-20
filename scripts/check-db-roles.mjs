// Phase 7.0 spike for decision D2 (least-privilege database roles). See docs/phase-7/7.0-design.md.
//
//   npm run db:check-roles
//
// Part A (needs DATABASE_URL): proves the privilege model inside a transaction that is ALWAYS rolled
// back, so nothing is left in the database. It needs a user that may create roles (the Supabase
// "postgres" user can).
// Part B (needs DATABASE_URL_PUBLIC): connects as the real limited role (create it with
// db/spikes/roles.sql) and checks that it cannot read leads or create tables.
import postgres from "postgres";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function denied(sql, statement) {
  await sql.unsafe("savepoint probe");
  try {
    await sql.unsafe(statement);
    await sql.unsafe("rollback to savepoint probe");
    return { ok: false, detail: "statement succeeded" };
  } catch (error) {
    await sql.unsafe("rollback to savepoint probe");
    return { ok: error.code === "42501", detail: `${error.code} ${error.message}` };
  }
}

async function partA(url) {
  console.log("\nPart A: privilege model (rolled back)");
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  const ROLLBACK = new Error("rollback");
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe("create role spike_public nologin");
      await tx.unsafe("grant spike_public to current_user"); // needed to SET ROLE without superuser
      await tx.unsafe("create schema spike");
      await tx.unsafe("create table spike.trips (id int, status text, internal_note text)");
      await tx.unsafe("insert into spike.trips values (1,'published','n1'),(2,'draft','n2')");
      await tx.unsafe("create table spike.leads (id int, email text)");
      await tx.unsafe("alter table spike.leads enable row level security");
      await tx.unsafe("insert into spike.leads values (1,'a@example.com')");
      await tx.unsafe(
        "create view spike.public_trips as select id, status from spike.trips where status = 'published'",
      );
      await tx.unsafe("grant usage on schema spike to spike_public");
      await tx.unsafe("grant select on spike.public_trips to spike_public");

      await tx.unsafe("set local role spike_public");
      const rows = await tx.unsafe("select id from spike.public_trips");
      check(
        "public role reads published rows through the view",
        rows.length === 1 && rows[0].id === 1,
      );
      const base = await denied(tx, "select * from spike.trips");
      check("public role cannot read the base table", base.ok, base.detail);
      const leads = await denied(tx, "select * from spike.leads");
      check("public role cannot read the RLS table", leads.ok, leads.detail);
      const write = await denied(tx, "insert into spike.trips values (3,'published','x')");
      check("public role cannot write content", write.ok, write.detail);
      const ddl = await denied(tx, "create table spike.x (id int)");
      check("public role cannot create tables", ddl.ok, ddl.detail);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) {
      check("part A could run", false, `${error.code ?? ""} ${error.message}`);
    }
  } finally {
    await sql.end();
  }
}

async function partB(url) {
  console.log("\nPart B: real limited role through the pooler");
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  const ROLLBACK = new Error("rollback");
  try {
    await sql.begin(async (tx) => {
      const [who] = await tx`select current_user as u`;
      check("connects as the limited role", who.u.startsWith("elzora_public"), who.u);
      const leads = await denied(tx, "select count(*) from public.leads");
      check("cannot read leads", leads.ok, leads.detail);
      const ddl = await denied(tx, "create table public.elzora_probe (id int)");
      check("cannot create tables", ddl.ok, ddl.detail);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK)
      check("part B could run", false, `${error.code ?? ""} ${error.message}`);
  } finally {
    await sql.end();
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (put it in .env.local).");
  process.exit(2);
}
await partA(process.env.DATABASE_URL);
if (process.env.DATABASE_URL_PUBLIC) await partB(process.env.DATABASE_URL_PUBLIC);
else console.log("\nPart B skipped: DATABASE_URL_PUBLIC is not set.");

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
