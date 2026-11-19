-- 7.4C: dashboard trips storage. Tables: trips, trip_translations, trip_media, redirects, audit_logs.
-- NOTE: numbered 0020 on purpose so it does not collide with the 0002..0009 range used by the 7.0-7.3 work.
-- If 7.2 already created trips / trip_translations / redirects, reconcile the two files before applying.
-- Plain Postgres. RLS is enabled with NO policies (see 0001): only the server connection can read or write.

CREATE TABLE trips (
  id               text PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 100), -- immutable, independent of slugs
  featured         boolean NOT NULL DEFAULT false,
  sort_order       integer NOT NULL DEFAULT 100 CHECK (sort_order BETWEEN 0 AND 9999),
  duration_days    smallint NOT NULL CHECK (duration_days BETWEEN 1 AND 90),
  flexible_duration boolean NOT NULL DEFAULT false,
  price_from_eur   numeric(10, 2) CHECK (price_from_eur IS NULL OR price_from_eur > 0),
  budget_category  text CHECK (budget_category IS NULL OR budget_category IN ('lt1000', '1000-1500', '1500-2500', '2500-4000', '4000+')),
  style_ids        text[] NOT NULL DEFAULT '{}',
  destination_ids  text[] NOT NULL DEFAULT '{}',
  partner_id       text, -- internal only; the partners table arrives in 7.6
  archived_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       text
);

CREATE INDEX trips_sort_idx ON trips (sort_order, created_at);
CREATE INDEX trips_active_idx ON trips (archived_at) WHERE archived_at IS NULL;

-- Publishing state lives here, per language (plan D4).
CREATE TABLE trip_translations (
  trip_id            text NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  locale             text NOT NULL CHECK (locale IN ('en', 'de')),
  -- Empty while a draft has no slug yet; unique per language once set (partial index below).
  slug               text NOT NULL DEFAULT '' CHECK (slug = '' OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title              text NOT NULL DEFAULT '',
  subtitle           text NOT NULL DEFAULT '',
  summary            text NOT NULL DEFAULT '',
  description        text NOT NULL DEFAULT '',
  highlights         jsonb NOT NULL DEFAULT '[]',
  itinerary          jsonb NOT NULL DEFAULT '[]', -- validated with Zod (plan D5)
  inclusions         jsonb NOT NULL DEFAULT '[]',
  exclusions         jsonb NOT NULL DEFAULT '[]',
  price_note         text NOT NULL DEFAULT '',
  meta_title         text NOT NULL DEFAULT '',
  meta_description   text NOT NULL DEFAULT '',
  og_image           text NOT NULL DEFAULT '',
  canonical_override text NOT NULL DEFAULT '',
  noindex            boolean NOT NULL DEFAULT false,
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  published_at       timestamptz,
  slug_history       text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (trip_id, locale),
  CONSTRAINT published_needs_slug CHECK (status <> 'published' OR slug <> '')
);

CREATE UNIQUE INDEX trip_translations_locale_slug_idx ON trip_translations (locale, slug) WHERE slug <> '';
CREATE INDEX trip_translations_status_idx ON trip_translations (locale, status);

-- Main image (position 0, is_main) and ordered gallery. photo_id points at the image pipeline manifest;
-- signed uploads and a full media_assets table are a later step.
CREATE TABLE trip_media (
  trip_id   text NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  position  smallint NOT NULL CHECK (position >= 0),
  is_main   boolean NOT NULL DEFAULT false,
  photo_id  text NOT NULL,
  alt_en    text NOT NULL DEFAULT '',
  alt_de    text NOT NULL DEFAULT '',
  PRIMARY KEY (trip_id, position)
);
CREATE UNIQUE INDEX trip_media_one_main_idx ON trip_media (trip_id) WHERE is_main;

-- Old public paths of translations whose slug changed while live. Resolved inside the trip page (7.4D).
CREATE TABLE redirects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale     text NOT NULL CHECK (locale IN ('en', 'de')),
  old_slug   text NOT NULL,
  trip_id    text NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  status     smallint NOT NULL DEFAULT 301 CHECK (status IN (301)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (locale, old_slug)
);

CREATE TABLE audit_logs (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  action     text NOT NULL,
  user_id    text,
  detail     jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_logs_at_idx ON audit_logs (at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs (action, at DESC);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
