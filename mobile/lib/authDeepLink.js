import { supabase } from './supabase';

// Supabase auth emails (confirmation + password-reset) redirect to a URL
// carrying either `access_token`/`refresh_token` (implicit flow, tokens in
// the URL fragment) or a `token_hash` (newer OTP-style template). Web relies
// on the SDK's own `detectSessionInUrl` to read `window.location` for this;
// there is no such thing on native; expo-linking hands us the raw deep-link
// URL instead, so we parse and apply it ourselves.
export function parseAuthDeepLink(url) {
  if (!url) return null;
  try {
    // Fragment-style links (`...#access_token=...`) aren't parsed as query
    // params by URL/URLSearchParams, so normalize `#` to `?` first — safe
    // here because these links never carry both a real query string and a
    // fragment at once.
    const normalized = url.replace('#', '?');
    const parsed = new URL(normalized);
    const params = parsed.searchParams;
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const token_hash = params.get('token_hash');
    const type = params.get('type');
    const error = params.get('error_description') || params.get('error');
    if (!access_token && !token_hash && !error) return null;
    return { access_token, refresh_token, token_hash, type, error };
  } catch {
    return null;
  }
}

// Applies a parsed deep link to the Supabase client. Returns
// { isRecovery, error } so the caller can decide whether to route the user
// into the "set new password" screen.
export async function applyAuthDeepLink(parsed) {
  if (!parsed) return { isRecovery: false, error: null };
  if (parsed.error) return { isRecovery: false, error: parsed.error };

  try {
    if (parsed.access_token && parsed.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      });
      if (error) throw error;
    } else if (parsed.token_hash && parsed.type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: parsed.token_hash,
        type: parsed.type,
      });
      if (error) throw error;
    } else {
      return { isRecovery: false, error: null };
    }
    return { isRecovery: parsed.type === 'recovery', error: null };
  } catch (err) {
    return { isRecovery: false, error: err.message || String(err) };
  }
}
