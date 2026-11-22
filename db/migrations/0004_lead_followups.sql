-- Phase 7.5: lead follow-ups and who changed a status.
-- Private notes and every status change live in lead_activity (0002). Nothing here is ever public.

ALTER TABLE leads ADD COLUMN next_follow_up_on date;
CREATE INDEX leads_follow_up_idx ON leads (next_follow_up_on)
  WHERE next_follow_up_on IS NOT NULL AND status NOT IN ('converted', 'lost');

-- The dashboard sets `app.actor_id` (transaction-local) to the signed-in user before it changes a status,
-- so the activity row says WHO moved the lead. Changes made without it (scripts) stay anonymous.
CREATE OR REPLACE FUNCTION leads_log_status_change() RETURNS trigger AS $$
BEGIN
  INSERT INTO lead_activity (lead_id, kind, from_status, to_status, actor_id)
  VALUES (
    NEW.id, 'status_change', OLD.status, NEW.status,
    NULLIF(current_setting('app.actor_id', true), '')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
