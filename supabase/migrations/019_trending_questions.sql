-- Trending questions on the AI Referee landing page.
--
-- answer: the ruling VAiR gave, so clicking a trending question can replay
-- it instead of spending tokens to generate the same answer again.
-- is_followup: true when the question was asked mid-conversation ("what if
-- it was the goalkeeper?") — those only make sense with their context, so
-- they're never offered as trending questions.
ALTER TABLE questions_log
  ADD COLUMN IF NOT EXISTS answer TEXT,
  ADD COLUMN IF NOT EXISTS is_followup BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_questions_log_created ON questions_log(created_at DESC);

-- One row per (question, person) who clicked it, so the trending order is
-- "how many people clicked", not how many times one person did.
-- question_key is the normalised question text (trimmed, lowercased,
-- whitespace collapsed) — the same key get-recent-questions groups by.
CREATE TABLE IF NOT EXISTS trending_question_clicks (
  question_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (question_key, user_id)
);

ALTER TABLE trending_question_clicks ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role key (get-recent-questions) reads/writes this table.
