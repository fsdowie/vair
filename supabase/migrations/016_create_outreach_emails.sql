-- Log of emails sent from the Admin panel: beta-tester invites and
-- "come back and see what's new" reminders to existing users.
-- Only the send-outreach-email edge function (service role) reads/writes
-- this table, so RLS is enabled with no policies — regular clients get nothing.
CREATE TABLE IF NOT EXISTS outreach_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('invite', 'reminder')),
  email TEXT NOT NULL,
  recipient_name TEXT,
  personal_note TEXT,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_outreach_emails_kind_created ON outreach_emails(kind, created_at DESC);

ALTER TABLE outreach_emails ENABLE ROW LEVEL SECURITY;
