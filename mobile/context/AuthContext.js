import { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { applyAuthDeepLink, parseAuthDeepLink } from '../lib/authDeepLink';

// Mirrors src/App.jsx's BOOTSTRAP_ADMIN_EMAIL / checkIsAdmin so admin access
// rules stay identical between web and mobile.
const BOOTSTRAP_ADMIN_EMAIL = 'fsdowie@yahoo.com';

async function checkIsAdmin(session) {
  if (!session) return false;
  if (session.user.email === BOOTSTRAP_ADMIN_EMAIL) return true;
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .single();
  return data?.is_admin === true;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  // Set when the user opened the app via a password-reset email link —
  // gates them into the "set new password" screen (see SetNewPasswordScreen)
  // regardless of whatever else is going on, same as the web app's
  // pendingRecovery flow in src/RefereeLLM.jsx.
  const [pendingRecovery, setPendingRecovery] = useState(false);
  const [deepLinkError, setDeepLinkError] = useState(null);

  // Handle the deep link a password-reset (or signup-confirmation) email
  // opens the app with. Web reads this straight out of window.location via
  // the SDK; on native, expo-linking hands us the URL and we apply it to
  // the client ourselves (see lib/authDeepLink.js).
  useEffect(() => {
    const handleUrl = async (url) => {
      const parsed = parseAuthDeepLink(url);
      if (!parsed) return;
      const { isRecovery, error } = await applyAuthDeepLink(parsed);
      if (error) setDeepLinkError(error);
      if (isRecovery) setPendingRecovery(true);
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setIsAdmin(await checkIsAdmin(session));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      setSession(session);
      setIsAdmin(await checkIsAdmin(session));
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setPendingRecovery(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, isAdmin, loading, pendingRecovery, setPendingRecovery, signOut, deepLinkError, setDeepLinkError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
