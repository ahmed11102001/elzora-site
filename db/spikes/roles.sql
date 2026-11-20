-- Phase 7.0 spike: database roles for decision D2. NOT a migration. Run it by hand, once, in the
-- Supabase SQL editor (or psql as the postgres user) after choosing real passwords.
-- The privileges on tables and views are granted later (7.7); this only creates the login roles so
-- the pooler connection can be tested with `npm run db:check-roles`.

create role elzora_public login password 'CHANGE_ME_PUBLIC' noinherit nobypassrls;
create role elzora_admin  login password 'CHANGE_ME_ADMIN'  noinherit nobypassrls;

grant usage on schema public to elzora_public, elzora_admin;

-- Supabase pooler user names are "<role>.<project-ref>", for example:
--   postgresql://elzora_public.<project-ref>:<password>@<pooler-host>:6543/postgres
-- Put that URL in DATABASE_URL_PUBLIC (.env.local) and run `npm run db:check-roles`.
-- To undo: drop owned by elzora_public; drop role elzora_public; (same for elzora_admin)
