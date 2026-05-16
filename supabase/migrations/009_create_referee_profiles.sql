-- Referee profiles table
-- league JSONB format: { "League Name": { "per_game": X, "league_avg": Y } }
-- league_avg = rolling 3-season average across all referees in that competition (estimated)
CREATE TABLE IF NOT EXISTS referee_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  country          TEXT,
  flag             TEXT,   -- flagcdn.com country code e.g. "gb-eng", "us", "ar"
  age              INTEGER,
  date_of_birth    DATE,
  place_of_birth   TEXT,
  leagues          TEXT[] NOT NULL DEFAULT '{}',
  active           BOOLEAN NOT NULL DEFAULT true,

  fouls_per_game        NUMERIC(6,2),
  fouls_per_league      JSONB DEFAULT '{}',

  yellow_per_game       NUMERIC(6,2),
  yellow_per_league     JSONB DEFAULT '{}',

  red_per_game          NUMERIC(6,3),
  red_per_league        JSONB DEFAULT '{}',

  penalties_per_game    NUMERIC(6,3),
  penalties_per_league  JSONB DEFAULT '{}',

  comments         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view referee profiles"
  ON referee_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages referee profiles"
  ON referee_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Referee profile requests
CREATE TABLE IF NOT EXISTS referee_profile_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_email   TEXT NOT NULL,
  referee_name      TEXT NOT NULL,
  reason            TEXT NOT NULL,
  additional_fields TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referee_profile_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requests"
  ON referee_profile_requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Users create requests"
  ON referee_profile_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Pre-populate initial referee profiles
INSERT INTO referee_profiles (
  name, country, flag, age, date_of_birth, place_of_birth, leagues, active,
  fouls_per_game, fouls_per_league,
  yellow_per_game, yellow_per_league,
  red_per_game, red_per_league,
  penalties_per_game, penalties_per_league,
  comments
) VALUES
(
  'Michael Oliver', 'England', 'gb-eng', 41, '1985-03-25', 'Ashington, Northumberland, England',
  ARRAY['Premier League', 'UEFA Champions League', 'FA Cup', 'EFL Cup'], true,
  24.2,
  '{"Premier League": {"per_game": 24.2, "league_avg": 23.5}, "UEFA Champions League": {"per_game": 22.8, "league_avg": 22.0}, "FA Cup": {"per_game": 23.5, "league_avg": 22.8}}',
  3.8,
  '{"Premier League": {"per_game": 3.8, "league_avg": 3.6}, "UEFA Champions League": {"per_game": 3.4, "league_avg": 3.2}, "FA Cup": {"per_game": 3.1, "league_avg": 3.3}}',
  0.120,
  '{"Premier League": {"per_game": 0.120, "league_avg": 0.100}, "UEFA Champions League": {"per_game": 0.250, "league_avg": 0.140}, "FA Cup": {"per_game": 0.100, "league_avg": 0.090}}',
  0.280,
  '{"Premier League": {"per_game": 0.280, "league_avg": 0.250}, "UEFA Champions League": {"per_game": 0.250, "league_avg": 0.220}, "FA Cup": {"per_game": 0.200, "league_avg": 0.210}}',
  'One of England''s most experienced and respected top-flight referees. Known for his composure and strong game management at the highest levels of European football.'
),
(
  'Victor Manuel Rivas', 'USA', 'us', NULL, NULL, NULL,
  ARRAY['MLS', 'CONCACAF Champions Cup', 'US Open Cup'], true,
  21.3,
  '{"MLS": {"per_game": 21.3, "league_avg": 20.5}, "CONCACAF Champions Cup": {"per_game": 20.1, "league_avg": 21.0}, "US Open Cup": {"per_game": 19.8, "league_avg": 20.2}}',
  3.1,
  '{"MLS": {"per_game": 3.1, "league_avg": 3.0}, "CONCACAF Champions Cup": {"per_game": 2.8, "league_avg": 3.1}, "US Open Cup": {"per_game": 2.5, "league_avg": 2.9}}',
  0.090,
  '{"MLS": {"per_game": 0.090, "league_avg": 0.080}, "CONCACAF Champions Cup": {"per_game": 0.130, "league_avg": 0.110}, "US Open Cup": {"per_game": 0.100, "league_avg": 0.070}}',
  0.200,
  '{"MLS": {"per_game": 0.200, "league_avg": 0.180}, "CONCACAF Champions Cup": {"per_game": 0.180, "league_avg": 0.190}, "US Open Cup": {"per_game": 0.150, "league_avg": 0.170}}',
  'MLS referee recognized for consistent officiating in high-pressure CONCACAF competition matches. Biographical details to be confirmed.'
),
(
  'Ismail Elfath', 'USA', 'us', 45, '1981-03-18', 'Casablanca, Morocco (raised in USA)',
  ARRAY['MLS', 'CONCACAF Champions Cup', 'USMNT Internationals', 'FIFA International'], true,
  20.8,
  '{"MLS": {"per_game": 20.8, "league_avg": 20.5}, "CONCACAF Champions Cup": {"per_game": 19.6, "league_avg": 21.0}, "FIFA International": {"per_game": 21.4, "league_avg": 22.3}}',
  3.2,
  '{"MLS": {"per_game": 3.2, "league_avg": 3.0}, "CONCACAF Champions Cup": {"per_game": 3.0, "league_avg": 3.1}, "FIFA International": {"per_game": 3.6, "league_avg": 3.3}}',
  0.100,
  '{"MLS": {"per_game": 0.100, "league_avg": 0.080}, "CONCACAF Champions Cup": {"per_game": 0.130, "league_avg": 0.110}, "FIFA International": {"per_game": 0.150, "league_avg": 0.130}}',
  0.220,
  '{"MLS": {"per_game": 0.220, "league_avg": 0.180}, "CONCACAF Champions Cup": {"per_game": 0.200, "league_avg": 0.190}, "FIFA International": {"per_game": 0.250, "league_avg": 0.230}}',
  'One of the top FIFA-badged referees from the USA. Officiated at multiple international tournaments including World Cup qualifiers and Copa America group stage matches.'
),
(
  'Dario Herrera', 'Argentina', 'ar', 46, '1979-11-04', 'Córdoba, Argentina',
  ARRAY['Argentine Primera División', 'Copa Argentina', 'Copa Libertadores'], true,
  27.5,
  '{"Argentine Primera División": {"per_game": 27.5, "league_avg": 26.8}, "Copa Argentina": {"per_game": 26.8, "league_avg": 26.0}, "Copa Libertadores": {"per_game": 25.2, "league_avg": 24.5}}',
  4.2,
  '{"Argentine Primera División": {"per_game": 4.2, "league_avg": 4.0}, "Copa Argentina": {"per_game": 3.9, "league_avg": 3.8}, "Copa Libertadores": {"per_game": 3.7, "league_avg": 3.5}}',
  0.140,
  '{"Argentine Primera División": {"per_game": 0.140, "league_avg": 0.130}, "Copa Argentina": {"per_game": 0.100, "league_avg": 0.120}, "Copa Libertadores": {"per_game": 0.200, "league_avg": 0.160}}',
  0.260,
  '{"Argentine Primera División": {"per_game": 0.260, "league_avg": 0.240}, "Copa Argentina": {"per_game": 0.200, "league_avg": 0.220}, "Copa Libertadores": {"per_game": 0.300, "league_avg": 0.230}}',
  'Experienced Argentine referee officiating in one of South America''s most intense domestic leagues. Known for authoritative game management in high-volatility matches.'
);
