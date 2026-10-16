-- Match ID the misconduct report belongs to (as listed on the assignor's site).
-- Nullable so reports created before this column existed remain valid.
ALTER TABLE misconduct_reports ADD COLUMN IF NOT EXISTS match_id TEXT;
