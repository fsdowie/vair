import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Same Supabase project as vaireferee.com (src/supabaseClient.js) — the
// mobile app is a client of the exact same backend, not a separate one.
// That's the whole point: same users, same auth, same Postgres tables, and
// critically the same `ask-referee` edge function, so the LLM call (with its
// prompt caching / token-usage minimization) lives in exactly one place.
const SUPABASE_URL = 'https://iunehbdazfzgfclkvvgd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn';

export const EDGE_BASE = `${SUPABASE_URL}/functions/v1`;
export { SUPABASE_ANON_KEY };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // There's no URL to inspect on native (no browser address bar), so this
    // must be off; the password-recovery deep link is handled manually via
    // expo-linking + setSession() in SetNewPasswordScreen instead.
    detectSessionInUrl: false,
  },
});

// Supabase's token auto-refresh relies on a running timer, which the OS
// suspends while the app is backgrounded. Tying refresh start/stop to
// AppState (the documented React Native pattern) means a token that expired
// while the app was in the background gets refreshed the moment it's
// foregrounded again, instead of surfacing as a stale-session error.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
