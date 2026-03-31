-- LLM corrections: admin-accepted corrections injected into the referee system prompt
CREATE TABLE IF NOT EXISTS llm_corrections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID REFERENCES answer_reports(id) ON DELETE SET NULL,
  correction_text TEXT NOT NULL,
  version_label   TEXT NOT NULL,   -- same timestamp format as footer e.g. "03/30/2026, 14:32 UTC"
  notes           TEXT,            -- admin notes when accepting
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_corrections_active ON llm_corrections (is_active, created_at DESC);

ALTER TABLE llm_corrections ENABLE ROW LEVEL SECURITY;
-- Only accessible via service role (edge functions) — no direct client access
