-- Create table to store generated misconduct reports
CREATE TABLE IF NOT EXISTS misconduct_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offender_type TEXT NOT NULL CHECK (offender_type IN ('player', 'team_official')),
  offender_name TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('home', 'away')),
  jersey_number TEXT,
  offense TEXT NOT NULL CHECK (offense IN ('caution', 'send_off')),
  reason TEXT NOT NULL,
  field_spot TEXT,
  minute TEXT NOT NULL,
  description TEXT NOT NULL,
  generated_report TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster history queries
CREATE INDEX idx_misconduct_reports_user_created ON misconduct_reports(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE misconduct_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own reports
CREATE POLICY "Users can view own misconduct reports"
  ON misconduct_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own reports
CREATE POLICY "Users can insert own misconduct reports"
  ON misconduct_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete own misconduct reports"
  ON misconduct_reports
  FOR DELETE
  USING (auth.uid() = user_id);
