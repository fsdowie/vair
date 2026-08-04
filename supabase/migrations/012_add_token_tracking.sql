-- Track real Anthropic token usage per question
ALTER TABLE questions_log
  ADD COLUMN input_tokens INTEGER,
  ADD COLUMN output_tokens INTEGER,
  ADD COLUMN cache_creation_input_tokens INTEGER,
  ADD COLUMN cache_read_input_tokens INTEGER;

-- Singleton table holding the most recent Anthropic API rate-limit snapshot,
-- read from the response headers on the last ask-referee call. This reflects
-- the shared account/API key capacity, not any single VAIR user.
CREATE TABLE IF NOT EXISTS api_rate_limit_status (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  requests_limit INTEGER,
  requests_remaining INTEGER,
  requests_reset TIMESTAMPTZ,
  input_tokens_limit INTEGER,
  input_tokens_remaining INTEGER,
  input_tokens_reset TIMESTAMPTZ,
  output_tokens_limit INTEGER,
  output_tokens_remaining INTEGER,
  output_tokens_reset TIMESTAMPTZ,
  tokens_limit INTEGER,
  tokens_remaining INTEGER,
  tokens_reset TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE api_rate_limit_status ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role key (used by edge functions) can read/write this table.
