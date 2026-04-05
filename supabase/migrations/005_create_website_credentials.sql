CREATE TABLE IF NOT EXISTS website_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_url        TEXT NOT NULL,
  site_name       TEXT NOT NULL,
  username        TEXT NOT NULL,
  password        TEXT NOT NULL,
  last_scraped_at TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, site_url)
);

ALTER TABLE website_credentials ENABLE ROW LEVEL SECURITY;

-- Users can manage their own credentials but the service role reads passwords for scraping
CREATE POLICY "Users manage own credentials"
  ON website_credentials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
