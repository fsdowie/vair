-- Personal "create your password" invitations, sent from the Admin panel
-- (Invite Testers, and activating/reminding Access Requests). The emailed
-- link carries a random token (only its SHA-256 hash is stored); opening it
-- shows a pre-filled form, and the accept-invite edge function creates the
-- account when they submit a password. Unlike Supabase's one-time auth
-- links, merely opening the link (e.g. an email security scanner) doesn't
-- use it up, and it lasts 30 days instead of an hour.
-- Only edge functions (service role) read/write this table, so RLS is
-- enabled with no policies — regular clients get nothing.
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL, -- stored lowercased
  first_name TEXT,
  last_name TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('invite', 'access_request')),
  access_request_id UUID REFERENCES access_requests(id) ON DELETE SET NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invitations_email ON invitations(email);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
