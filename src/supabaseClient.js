import { createClient } from '@supabase/supabase-js';

// Single shared client — every component must import this instead of calling
// createClient() itself. Multiple GoTrueClient instances in the same tab do
// not propagate auth state to each other (e.g. signOut() in one instance
// doesn't clear the session held by another), which breaks sign-out.
export const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);
