-- Create table to track user questions
CREATE TABLE IF NOT EXISTS questions_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_questions_log_user_created ON questions_log(user_id, created_at);

-- Enable Row Level Security
ALTER TABLE questions_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own questions
CREATE POLICY "Users can view own questions"
  ON questions_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own questions
CREATE POLICY "Users can insert own questions"
  ON questions_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
