-- Cost tracking on the admin Token Usage tab.
--
-- model: which Claude model answered, so cost can be priced per model
-- (rows logged before this column existed were all claude-sonnet-5).
ALTER TABLE questions_log
  ADD COLUMN IF NOT EXISTS model TEXT;

-- API credit payments (one-time credit purchases on the Anthropic console),
-- entered by an admin. amount may be negative to correct the running
-- balance against what the console shows.
CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_on DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single row: the day of the month billing periods start on.
CREATE TABLE IF NOT EXISTS billing_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  renewal_day INT NOT NULL DEFAULT 3 CHECK (renewal_day BETWEEN 1 AND 28)
);
INSERT INTO billing_settings (id, renewal_day) VALUES (1, 3) ON CONFLICT (id) DO NOTHING;

ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role key (get-usage-stats, admin-gated) reads/writes these.
