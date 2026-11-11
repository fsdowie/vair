-- Text-message invites from the Admin panel ("Invite by text"), two ways:
--   via = 'twilio'  sent (or scheduled) by the send-sms edge function from
--                   VAiR's Twilio number; status is kept up to date by
--                   Twilio's status callbacks (sms-status edge function)
--   via = 'manual'  the admin texted it from their own phone (sms: link or
--                   copy/paste) — logged so they can see who was texted
-- Only the edge functions (service role) read/write this table, so RLS is
-- enabled with no policies — regular clients get nothing.
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  via TEXT NOT NULL CHECK (via IN ('twilio', 'manual')),
  phone TEXT NOT NULL,
  recipient_name TEXT,
  body TEXT NOT NULL,
  twilio_sid TEXT UNIQUE,
  -- Twilio statuses (accepted, scheduled, queued, sending, sent, delivered,
  -- undelivered, failed, canceled) plus 'manual' for self-sent texts
  status TEXT NOT NULL,
  error TEXT,
  send_at TIMESTAMP WITH TIME ZONE, -- set for scheduled sends
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON sms_messages(created_at DESC);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
