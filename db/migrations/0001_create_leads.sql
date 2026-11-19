-- ELZORA trip-planner leads. Plain Postgres (works on Supabase, Neon, Vercel Postgres, RDS ...).
-- Apply with `npm run db:migrate` (needs DATABASE_URL). See README "Trip planner and leads".

CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'rejected');

CREATE TABLE leads (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Public, non-guessable code shown to the traveler (e.g. EZ-7K3M-Q9XD). The internal id is never exposed.
  reference_code          text NOT NULL UNIQUE,
  -- Random UUID created by the browser for one submission attempt: makes retries and double clicks safe.
  idempotency_key         uuid NOT NULL UNIQUE,
  -- Fingerprint of the answers (see src/lib/leads/dedupe.ts): catches the same inquiry sent twice.
  dedupe_hash             text NOT NULL,
  status                  lead_status NOT NULL DEFAULT 'new',
  locale                  text NOT NULL CHECK (locale IN ('en', 'de')),

  full_name               text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email                   text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 254),
  country                 char(2) NOT NULL,
  phone                   text CHECK (phone IS NULL OR char_length(phone) <= 32),

  -- Travel dates ("travelDates" + "dateFlexibility" in the brief)
  date_flexibility        text NOT NULL CHECK (date_flexibility IN ('specific', 'flexible', 'undecided')),
  arrival_date            date,
  departure_date          date,
  flexible_when           text CHECK (flexible_when IS NULL OR char_length(flexible_when) <= 32),
  CONSTRAINT specific_dates_complete CHECK (
    date_flexibility <> 'specific'
    OR (arrival_date IS NOT NULL AND departure_date IS NOT NULL AND departure_date > arrival_date)
  ),

  -- Travelers ("travelers" = adults + children)
  adults                  smallint NOT NULL CHECK (adults BETWEEN 1 AND 12),
  children                smallint NOT NULL DEFAULT 0 CHECK (children BETWEEN 0 AND 8),
  children_ages           smallint[] NOT NULL DEFAULT '{}',
  CONSTRAINT children_ages_match CHECK (cardinality(children_ages) = children),

  interests               text[] NOT NULL CHECK (cardinality(interests) BETWEEN 1 AND 8),
  duration                text NOT NULL CHECK (duration IN ('3-5', '6-8', '9-12', '13-16', '16+', 'unsure')),
  budget                  text NOT NULL CHECK (budget IN ('lt1000', '1000-1500', '1500-2500', '2500-4000', '4000+', 'unsure')),
  budget_type             text NOT NULL DEFAULT 'per_person' CHECK (budget_type = 'per_person'),
  notes                   text CHECK (notes IS NULL OR char_length(notes) <= 1500),

  -- Attribution (first touch)
  source                  text,
  landing_page            text,
  utm_source              text,
  utm_medium              text,
  utm_campaign            text,
  utm_content             text,
  utm_term                text,
  referrer                text,

  -- GDPR: explicit consent to the privacy policy, with the version that was shown.
  consent_version         text NOT NULL,
  consented_at            timestamptz NOT NULL,

  -- Notification bookkeeping, so failed emails can be retried.
  team_notified_at        timestamptz,
  traveler_notified_at    timestamptz,
  notification_attempts   smallint NOT NULL DEFAULT 0,
  last_notification_error text,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX leads_status_created_at_idx ON leads (status, created_at DESC);
CREATE INDEX leads_email_idx ON leads (lower(email));
CREATE INDEX leads_dedupe_idx ON leads (dedupe_hash, created_at DESC);
CREATE INDEX leads_pending_notifications_idx ON leads (created_at)
  WHERE team_notified_at IS NULL OR traveler_notified_at IS NULL;

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Fixed-window rate limiting shared by all server instances. Keys are salted hashes, never raw IPs.
CREATE TABLE lead_rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits         integer NOT NULL DEFAULT 0
);

-- Supabase exposes tables through its public API. Row Level Security with NO policies means the
-- anon/authenticated keys can read and write nothing here; the server connects with DATABASE_URL
-- (a privileged role) and is the only access path. Harmless on other Postgres providers.
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_rate_limits ENABLE ROW LEVEL SECURITY;
