-- Log of beta-tester invite emails sent from the Admin panel.
-- Only the send-test-invite edge function (service role) reads/writes this
-- table, so RLS is enabled with no policies — regular clients get nothing.
CREATE TABLE IF NOT EXISTS test_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  recipient_name TEXT,
  personal_note TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_test_invites_created ON test_invites(created_at DESC);

ALTER TABLE test_invites ENABLE ROW LEVEL SECURITY;
