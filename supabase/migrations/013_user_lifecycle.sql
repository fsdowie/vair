-- Deleting a user (via delete-user Edge Function) should keep their
-- historical activity rows around, just unlinked from the removed account,
-- rather than wiping games/questions/reports along with the login.
-- website_credentials keeps its original CASCADE + NOT NULL — those are
-- live scraper login credentials for external sites, not history worth
-- retaining once the account is gone.

ALTER TABLE questions_log
  DROP CONSTRAINT questions_log_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD CONSTRAINT questions_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE answer_reports
  DROP CONSTRAINT answer_reports_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD CONSTRAINT answer_reports_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE games
  DROP CONSTRAINT games_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD CONSTRAINT games_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
