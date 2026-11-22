-- Phase 7.7: KPI support and the database-role hardening (decision D2). Additive and safe to run on a live database.
--
-- 1. The funnel and the "reached stage" KPI read the status history of every lead in a period.
-- 2. The triggers that write lead_activity run with the privileges of their OWNER (SECURITY DEFINER), not of
--    whoever inserts the lead. That is what lets the narrow `elzora_leads` role insert a lead without any
--    permission on lead_activity (private notes and history stay unreachable for it). search_path is pinned so
--    a function that runs with the owner's rights cannot be redirected to look-alike objects.

CREATE INDEX IF NOT EXISTS lead_activity_status_history_idx
  ON lead_activity (lead_id, to_status)
  WHERE kind = 'status_change';

ALTER FUNCTION leads_log_created() SECURITY DEFINER SET search_path = public, pg_temp;
ALTER FUNCTION leads_log_status_change() SECURITY DEFINER SET search_path = public, pg_temp;
