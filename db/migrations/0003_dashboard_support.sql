-- Phase 7.4: what the dashboard needs on top of the 7.2 content tables.
-- 1. Drafts. A new translation is saved before it has a slug, title or summary, so those rules apply from
--    "review" on (the dashboard checks them again before publishing). Slugs stay unique per language.
-- 2. Trips can be "flexible" (the number of itinerary days may differ from the duration).
-- 3. audit_logs: sensitive dashboard actions.
-- RLS stays enabled with no policies: only the server's privileged connection reads or writes.

ALTER TABLE trips
  ADD COLUMN flexible_duration boolean NOT NULL DEFAULT false;

-- A draft trip may not have styles or destinations yet.
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_style_ids_check;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_destination_ids_check;
ALTER TABLE trips ALTER COLUMN style_ids SET DEFAULT '{}';
ALTER TABLE trips ALTER COLUMN destination_ids SET DEFAULT '{}';

ALTER TABLE trip_translations DROP CONSTRAINT IF EXISTS trip_translations_slug_check;
ALTER TABLE trip_translations DROP CONSTRAINT IF EXISTS trip_translations_title_check;
ALTER TABLE trip_translations DROP CONSTRAINT IF EXISTS trip_translations_summary_check;
ALTER TABLE trip_translations DROP CONSTRAINT IF EXISTS trip_translations_locale_slug_key;

ALTER TABLE trip_translations
  ADD CONSTRAINT trip_translations_slug_format
    CHECK (slug = '' OR (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120)),
  ADD CONSTRAINT trip_translations_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT trip_translations_content_when_not_draft
    CHECK (status = 'draft' OR (slug <> '' AND char_length(title) >= 1 AND char_length(summary) >= 1));

-- Empty slugs (drafts) may repeat; real slugs are unique per language.
CREATE UNIQUE INDEX trip_translations_locale_slug_idx ON trip_translations (locale, slug) WHERE slug <> '';

CREATE TABLE audit_logs (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  action  text NOT NULL,
  user_id text,
  detail  jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_logs_at_idx ON audit_logs (at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs (action, at DESC);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
