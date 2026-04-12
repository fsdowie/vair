-- ============================================================
-- Cron jobs for auto-scraping referee assignment websites
-- Run this ONCE in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- BEFORE RUNNING: replace YOUR_SERVICE_ROLE_KEY below with
-- your actual service role key from:
--   Supabase Dashboard → Project Settings → API → service_role
-- ============================================================

-- 1. Enable pg_cron (may already be enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Allow postgres role to use cron
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3. 10 AM PST = 18:00 UTC
SELECT cron.schedule(
  'scrape-games-10am-pst',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1/scrape-games',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- 4. 5 PM PST = 01:00 UTC (next day)
SELECT cron.schedule(
  'scrape-games-5pm-pst',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1/scrape-games',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- 5. 10 PM PST = 06:00 UTC
SELECT cron.schedule(
  'scrape-games-10pm-pst',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1/scrape-games',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- To verify jobs were created:
--   SELECT * FROM cron.job;
--
-- To remove a job if needed:
--   SELECT cron.unschedule('scrape-games-10am-pst');
--   SELECT cron.unschedule('scrape-games-5pm-pst');
--   SELECT cron.unschedule('scrape-games-10pm-pst');
-- ============================================================
