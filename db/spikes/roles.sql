-- Phase 7.0 / 7.7: the four database roles of decision D2. NOT a migration. Run it by hand, once, in the
-- Supabase SQL editor (or psql as the postgres user) after choosing four DIFFERENT strong passwords.
-- The privileges are applied by `npm run db:grants` (db/grants.sql), never here, so this file can stay unchanged.
--
--   elzora_public   -> DATABASE_URL_PUBLIC    content reads of the public site
--   elzora_preview  -> DATABASE_URL_PREVIEW   the same plus drafts, for the signed preview only
--   elzora_leads    -> DATABASE_URL_LEADS     the trip planner (leads and the rate limit only)
--   elzora_admin    -> ADMIN_DATABASE_URL     the dashboard
-- Keep DATABASE_URL (the owner) for migrations and scripts; do not give it to the website.

create role elzora_public  login password 'CHANGE_ME_PUBLIC'  noinherit nobypassrls;
create role elzora_preview login password 'CHANGE_ME_PREVIEW' noinherit nobypassrls;
create role elzora_leads   login password 'CHANGE_ME_LEADS'   noinherit nobypassrls;
create role elzora_admin   login password 'CHANGE_ME_ADMIN'   noinherit nobypassrls;

grant usage on schema public to elzora_public, elzora_preview, elzora_leads, elzora_admin;

-- Supabase pooler user names are "<role>.<project-ref>", for example:
--   postgresql://elzora_public.<project-ref>:<password>@<pooler-host>:6543/postgres
-- Then: npm run db:migrate && npm run db:grants && npm run db:verify-privileges
-- To undo one role: drop owned by elzora_public; drop role elzora_public; (same for the others)
