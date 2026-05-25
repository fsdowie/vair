-- Add missing columns to referee_profiles that were defined in 009 but not present in the live DB
ALTER TABLE referee_profiles
  ADD COLUMN IF NOT EXISTS country          TEXT,
  ADD COLUMN IF NOT EXISTS flag             TEXT,
  ADD COLUMN IF NOT EXISTS age              INTEGER,
  ADD COLUMN IF NOT EXISTS date_of_birth    DATE,
  ADD COLUMN IF NOT EXISTS place_of_birth   TEXT,
  ADD COLUMN IF NOT EXISTS active           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fouls_per_game   NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS fouls_per_league JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS yellow_per_game  NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS yellow_per_league JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS red_per_game     NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS red_per_league   JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS penalties_per_game   NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS penalties_per_league JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS comments         TEXT,
  ADD COLUMN IF NOT EXISTS leagues          TEXT[] NOT NULL DEFAULT '{}';
