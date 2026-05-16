-- Allow admins to view ALL profile requests (not just their own)
CREATE POLICY "Admins view all profile requests"
  ON referee_profile_requests FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'fsdowie@yahoo.com'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to update profile requests (needed for reject flow and status updates)
CREATE POLICY "Admins update profile requests"
  ON referee_profile_requests FOR UPDATE
  USING (
    (auth.jwt() ->> 'email') = 'fsdowie@yahoo.com'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
