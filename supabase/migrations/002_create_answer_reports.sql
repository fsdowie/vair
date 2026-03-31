-- Answer reports: users flag potentially wrong VAIR answers for admin review
CREATE TABLE IF NOT EXISTS answer_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  vair_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_answer_reports_user    ON answer_reports (user_id);
CREATE INDEX idx_answer_reports_status  ON answer_reports (status, created_at DESC);

ALTER TABLE answer_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit and read their own reports
CREATE POLICY "Users can insert own reports"
  ON answer_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reports"
  ON answer_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own reports as read"
  ON answer_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
