-- Phase 7.2: content platform (trips, translations, media, redirects) and lead changes.
-- Additive, except one rename: the lead status 'rejected' becomes 'lost' (decision D6).
-- RLS is enabled with no policies on every new table, like the leads tables: only the server's
-- privileged connection can read or write them.

-- ---------------------------------------------------------------------------------------------
-- Media: one row per image. `photo_id` points at an image of the build-time pipeline
-- (assets/images.json); `storage_path` is reserved for dashboard uploads (7.4).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE media_assets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id          text UNIQUE,
  storage_path      text UNIQUE,
  original_filename text,
  alt_en            text,
  alt_de            text,
  caption_en        text,
  caption_de        text,
  width             integer CHECK (width IS NULL OR width > 0),
  height            integer CHECK (height IS NULL OR height > 0),
  mime_type         text,
  size_bytes        integer CHECK (size_bytes IS NULL OR size_bytes > 0),
  source            text,
  credit            text,
  license_type      text,
  license_reference text,
  license_status    text NOT NULL DEFAULT 'unconfirmed'
                    CHECK (license_status IN ('confirmed', 'unconfirmed', 'blocked')),
  usage_restrictions text,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_has_location CHECK (photo_id IS NOT NULL OR storage_path IS NOT NULL)
);

-- ---------------------------------------------------------------------------------------------
-- Trips. The id is immutable; each language has its own slug (trip_translations).
-- `seed_key` is the id the trip had in src/content/seed, so the import can run again safely.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE trips (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_key         text UNIQUE,
  duration_days    smallint NOT NULL CHECK (duration_days > 0),
  -- Only when a partner confirmed a price. NULL shows "Price on request".
  price_from_eur   numeric(10, 2) CHECK (price_from_eur IS NULL OR price_from_eur > 0),
  budget_category  text,
  -- Ids of the code-managed taxonomies (src/content/seed/trip-styles.ts and destinations.ts).
  style_ids        text[] NOT NULL CHECK (cardinality(style_ids) >= 1),
  destination_ids  text[] NOT NULL CHECK (cardinality(destination_ids) >= 1),
  featured         boolean NOT NULL DEFAULT false,
  sort_order       integer NOT NULL DEFAULT 0,
  main_media_id    uuid REFERENCES media_assets (id) ON DELETE SET NULL,
  archived_at      timestamptz,
  created_by       uuid,
  updated_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trips_sort_idx ON trips (sort_order, created_at) WHERE archived_at IS NULL;

CREATE TYPE content_status AS ENUM ('draft', 'review', 'published');

-- One row per trip and language. Publishing is per language: a language is public only when its
-- translation is published (or "review" while the pre-launch visibility switch allows it).
CREATE TABLE trip_translations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id            uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  locale             text NOT NULL CHECK (locale IN ('en', 'de')),
  slug               text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120),
  title              text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  subtitle           text,
  summary            text NOT NULL CHECK (char_length(summary) >= 1),
  description        text,
  highlights         jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(highlights) = 'array'),
  -- [{ day, title, description, destinationId? }], validated with Zod (src/content/db/schema.ts).
  itinerary          jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(itinerary) = 'array'),
  inclusions         jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(inclusions) = 'array'),
  exclusions         jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(exclusions) = 'array'),
  price_note         text,
  meta_title         text,
  meta_description   text,
  og_image_id        uuid REFERENCES media_assets (id) ON DELETE SET NULL,
  canonical_override text,
  noindex            boolean NOT NULL DEFAULT false,
  status             content_status NOT NULL DEFAULT 'draft',
  published_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_translations_trip_locale_key UNIQUE (trip_id, locale),
  CONSTRAINT trip_translations_locale_slug_key UNIQUE (locale, slug)
);

CREATE INDEX trip_translations_status_idx ON trip_translations (status);

-- Gallery images (the main image is trips.main_media_id).
CREATE TABLE trip_media (
  trip_id    uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  media_id   uuid NOT NULL REFERENCES media_assets (id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (trip_id, media_id)
);

-- Permanent redirects for changed slugs. Resolved inside the trip page, not in the proxy.
CREATE TABLE redirects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_path   text NOT NULL UNIQUE,
  new_path   text NOT NULL,
  status     smallint NOT NULL DEFAULT 301 CHECK (status IN (301, 308)),
  trip_id    uuid REFERENCES trips (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT redirect_goes_somewhere CHECK (old_path <> new_path)
);

CREATE FUNCTION forbid_id_change() RETURNS trigger AS $$
BEGIN
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'id is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trips_id_immutable BEFORE UPDATE OF id ON trips
  FOR EACH ROW EXECUTE FUNCTION forbid_id_change();
CREATE TRIGGER trips_set_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trip_translations_set_updated_at BEFORE UPDATE ON trip_translations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------------------------
-- Leads: requested trip, first contact, and the status model of decision D6.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE leads
  ADD COLUMN trip_id uuid REFERENCES trips (id) ON DELETE SET NULL,
  -- Snapshot of the slug the traveler came from, kept even if the trip is renamed or removed.
  ADD COLUMN trip_slug text CHECK (trip_slug IS NULL OR char_length(trip_slug) <= 120),
  ADD COLUMN first_contacted_at timestamptz;

CREATE INDEX leads_trip_idx ON leads (trip_id) WHERE trip_id IS NOT NULL;

ALTER TYPE lead_status RENAME VALUE 'rejected' TO 'lost';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'proposal_sent' AFTER 'qualified';

-- Every status change is recorded by triggers, so no code path can forget to log one.
CREATE TABLE lead_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('created', 'status_change', 'assignment', 'note')),
  from_status lead_status,
  to_status   lead_status,
  actor_id    uuid,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lead_activity_lead_idx ON lead_activity (lead_id, created_at);
ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION leads_log_created() RETURNS trigger AS $$
BEGIN
  INSERT INTO lead_activity (lead_id, kind, to_status) VALUES (NEW.id, 'created', NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_log_created AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION leads_log_created();

-- First contact = the first time a lead leaves 'new' for anything but 'lost'.
CREATE FUNCTION leads_set_first_contacted() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'new' AND NEW.status <> 'new' AND NEW.status <> 'lost'
     AND NEW.first_contacted_at IS NULL THEN
    NEW.first_contacted_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_set_first_contacted BEFORE UPDATE OF status ON leads
  FOR EACH ROW EXECUTE FUNCTION leads_set_first_contacted();

CREATE FUNCTION leads_log_status_change() RETURNS trigger AS $$
BEGIN
  INSERT INTO lead_activity (lead_id, kind, from_status, to_status)
  VALUES (NEW.id, 'status_change', OLD.status, NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_log_status_change AFTER UPDATE OF status ON leads
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION leads_log_status_change();

-- Leads that already exist get their "created" row (their current status is the starting point).
INSERT INTO lead_activity (lead_id, kind, to_status, created_at)
SELECT id, 'created', 'new', created_at FROM leads;
