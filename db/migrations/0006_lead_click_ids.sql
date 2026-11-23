-- Phase 9: ad click identifiers on a lead, so conversions can be matched back to the ad that caused them
-- (for example an offline conversion import in Google Ads). They are stored only when the traveler allowed
-- marketing cookies; otherwise both columns stay NULL. Existing rows are unchanged.

ALTER TABLE leads
  ADD COLUMN gclid  text CHECK (gclid  IS NULL OR char_length(gclid)  <= 200),
  ADD COLUMN fbclid text CHECK (fbclid IS NULL OR char_length(fbclid) <= 200);
