-- Phase 7.7: least-privilege database roles (decision D2). NOT a migration: it is safe to run again and again
-- (`npm run db:grants`), because it first takes everything back from the four roles and then grants exactly what
-- each one needs. Run it after every migration that adds a table, and once more at launch with `-- --launch`.
--
-- The roles are created once, by hand, with real passwords (db/spikes/roles.sql). A role that does not exist is
-- skipped. Every table has Row Level Security enabled with no policy for anybody else, so the Supabase public API
-- (anon / authenticated keys) can read nothing either.
--
--   elzora_public   content reads of the public site (DATABASE_URL_PUBLIC): published translations, and
--                   "review" ones while the pre-launch switch is on. No drafts, no leads, nothing internal.
--   elzora_preview  the same, plus drafts. Used only for the signed draft preview (DATABASE_URL_PREVIEW).
--   elzora_leads    the trip planner (DATABASE_URL_LEADS): add leads, mark notifications, rate limit. No
--                   content, no history, no notes, no audit log.
--   elzora_admin    the dashboard (ADMIN_DATABASE_URL): everything it edits. The audit log and the lead
--                   timeline can be added to but never changed or deleted; leads are never deleted here.
--
-- {{CONTENT_STATUSES}} is filled in by scripts/apply-grants.mjs: 'published','review' before launch,
-- 'published' with --launch (the database-level twin of SHOW_REVIEW_CONTENT=false).

DO $grants$
DECLARE
  roles constant text[] := ARRAY['elzora_public', 'elzora_preview', 'elzora_leads', 'elzora_admin'];
  public_statuses constant text[] := ARRAY[{{CONTENT_STATUSES}}];
  all_statuses constant text[] := ARRAY['draft', 'review', 'published'];
  r text;
  t record;
  configured text[] := '{}';
BEGIN
  -- 1. Start from nothing, so a grant removed from this file is really removed.
  FOR t IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public' AND policyname LIKE 'elzora\_%' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', t.policyname, t.tablename);
  END LOOP;

  FOREACH r IN ARRAY roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      configured := configured || r;
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE CREATE ON SCHEMA public FROM %I', r);
      EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
    END IF;
  END LOOP;

  -- 2. Public site and preview: read-only views of the content, column by column.
  FOREACH r IN ARRAY ARRAY['elzora_public', 'elzora_preview'] LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);

    EXECUTE format('GRANT SELECT (id, seed_key, featured, sort_order, duration_days, flexible_duration,
        price_from_eur, budget_category, style_ids, destination_ids, main_media_id, archived_at,
        created_at, updated_at) ON trips TO %I', r);
    EXECUTE format('GRANT SELECT (trip_id, locale, slug, title, subtitle, summary, description, highlights,
        itinerary, inclusions, exclusions, price_note, meta_title, meta_description, canonical_override,
        noindex, status, published_at, og_image_id) ON trip_translations TO %I', r);
    -- No license, source, restriction or author columns: those stay internal.
    EXECUTE format('GRANT SELECT (id, photo_id, alt_en, alt_de, caption_en, caption_de, width, height)
        ON media_assets TO %I', r);
    EXECUTE format('GRANT SELECT (trip_id, media_id, sort_order) ON trip_media TO %I', r);
    EXECUTE format('GRANT SELECT (old_path, new_path, status) ON redirects TO %I', r);

    EXECUTE format('CREATE POLICY %I ON trips FOR SELECT TO %I USING (archived_at IS NULL)',
      r || '_trips', r);
    EXECUTE format('CREATE POLICY %I ON trip_translations FOR SELECT TO %I USING (status::text = ANY (%L::text[]))',
      r || '_trip_translations', r, CASE WHEN r = 'elzora_preview' THEN all_statuses ELSE public_statuses END);
    EXECUTE format('CREATE POLICY %I ON media_assets FOR SELECT TO %I USING (true)', r || '_media_assets', r);
    EXECUTE format('CREATE POLICY %I ON trip_media FOR SELECT TO %I USING (true)', r || '_trip_media', r);
    EXECUTE format('CREATE POLICY %I ON redirects FOR SELECT TO %I USING (true)', r || '_redirects', r);
  END LOOP;

  -- 3. Trip planner: leads and the rate limit, and only the columns of a translation it needs to find a trip.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elzora_leads') THEN
    GRANT SELECT, INSERT, UPDATE ON leads TO elzora_leads;
    GRANT SELECT, INSERT, UPDATE, DELETE ON lead_rate_limits TO elzora_leads;
    GRANT SELECT (trip_id, locale, slug, status) ON trip_translations TO elzora_leads;

    CREATE POLICY elzora_leads_leads ON leads FOR ALL TO elzora_leads USING (true) WITH CHECK (true);
    CREATE POLICY elzora_leads_lead_rate_limits ON lead_rate_limits FOR ALL TO elzora_leads
      USING (true) WITH CHECK (true);
    EXECUTE format('CREATE POLICY elzora_leads_trip_translations ON trip_translations FOR SELECT TO elzora_leads
      USING (status::text = ANY (%L::text[]))', public_statuses);
  END IF;

  -- 4. Dashboard: edits everything it manages, with a few things it can only add to.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elzora_admin') THEN
    FOR t IN SELECT c.relname AS name, c.relrowsecurity AS rls
             FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relkind = 'r'
               AND c.relname NOT IN ('schema_migrations', 'lead_rate_limits') LOOP
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO elzora_admin', t.name);
      IF t.rls THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO elzora_admin USING (true) WITH CHECK (true)',
          'elzora_admin_' || t.name, t.name);
      END IF;
    END LOOP;
    REVOKE INSERT, DELETE ON leads FROM elzora_admin;
    REVOKE UPDATE, DELETE ON lead_activity FROM elzora_admin;
    REVOKE UPDATE, DELETE ON audit_logs FROM elzora_admin;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO elzora_admin;
  END IF;

  RAISE NOTICE 'roles configured: %', CASE WHEN cardinality(configured) = 0 THEN '(none: create them first, see db/spikes/roles.sql)' ELSE array_to_string(configured, ', ') END;
  RAISE NOTICE 'content visible to elzora_public: %', array_to_string(public_statuses, ', ');
END
$grants$;
