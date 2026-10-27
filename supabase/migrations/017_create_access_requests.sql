-- "Request access" submissions from the public sign-up form, which replaced
-- self-service signup. An admin activates a request from the Admin panel,
-- which creates the account and emails a link to set a password.
-- Only edge functions (service role) read/write this table, so RLS is
-- enabled with no policies — regular clients get nothing.
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE, -- stored lowercased
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'rejected')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_emailed_at TIMESTAMP WITH TIME ZONE,
  email_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_access_requests_status_created ON access_requests(status, created_at DESC);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Log the new account-link and password-reset emails alongside the
-- existing invites/reminders.
ALTER TABLE outreach_emails DROP CONSTRAINT IF EXISTS outreach_emails_kind_check;
ALTER TABLE outreach_emails ADD CONSTRAINT outreach_emails_kind_check
  CHECK (kind IN ('invite', 'reminder', 'access_invite', 'access_reminder', 'password_reset'));
