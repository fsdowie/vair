CREATE TABLE IF NOT EXISTS games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id     TEXT,
  source_site  TEXT,
  date         DATE NOT NULL,
  time         TIME,
  league       TEXT,
  level        TEXT,
  gender       TEXT,
  field        TEXT,
  home_team    TEXT,
  away_team    TEXT,
  referee      TEXT,
  ar1          TEXT,
  ar2          TEXT,
  description  TEXT,
  score_home   INTEGER,
  score_away   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id, source_site)
);

CREATE INDEX idx_games_user_date ON games (user_id, date DESC);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own games"
  ON games FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
