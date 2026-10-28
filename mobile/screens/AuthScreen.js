import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { EDGE_BASE, SUPABASE_ANON_KEY, supabase } from '../lib/supabase';
import Screen from '../components/Screen';
import Banner from '../components/Banner';
import { colors } from '../theme';

// Public (no-session) edge functions behind the request-access and
// forgot-password forms — same ones the web app uses.
async function callPublicFunction(name, body) {
  const res = await fetch(`${EDGE_BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

// Mirrors the auth flow in src/RefereeLLM.jsx: "Sign Up" files an access
// request (request-access) that an admin activates from the Admin panel —
// there's no self-service signup. If the email already has an account, it
// steers them to "send yourself a reset link" instead.
export default function AuthScreen() {
  const [view, setView] = useState('login'); // 'login' | 'signup' (request access)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [accessRequested, setAccessRequested] = useState(null); // null | 'requested' | 'pending'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingAccountEmail, setExistingAccountEmail] = useState(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const resetTransientState = () => {
    setError(null);
    setExistingAccountEmail(null);
    setResetEmailSent(false);
    setAccessRequested(null);
  };

  const handleAuth = async () => {
    resetTransientState();
    setLoading(true);
    try {
      if (view === 'signup') {
        const data = await callPublicFunction('request-access', {
          first_name: firstName,
          last_name: lastName,
          email,
        });
        if (data.status === 'ended') {
          throw new Error('This account has been deactivated. Please contact the admin.');
        }
        if (data.status === 'exists') {
          setExistingAccountEmail(email.trim());
          return;
        }
        setAccessRequested(data.status);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendResetEmail = async (targetEmail) => {
    setLoading(true);
    setError(null);
    try {
      // The link opens the app back up at its "set new password" screen
      // (see lib/authDeepLink.js); without the app it falls back to the website.
      await callPublicFunction('request-password-reset', {
        email: targetEmail,
        redirect_to: Linking.createURL('reset-password'),
      });
      setResetEmailSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = view === 'login'
    ? !!email && !!password
    : !!email.trim() && !!firstName.trim() && !!lastName.trim();

  if (forgotMode) {
    return (
      <Screen>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.centerWrap}>
            <View style={styles.card}>
              <Image source={require('../assets/vair-logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.heading}>Reset your password</Text>
              {resetEmailSent ? (
                <Text style={styles.successText}>
                  ✅ If there's a VAiR account for {email.trim()}, we've sent it a link to set a new password. Check your inbox (and spam folder).
                </Text>
              ) : (
                <>
                  <Text style={styles.subtext}>Enter the email on your account and we'll send you a reset link.</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor={colors.textFaint}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                  {!!error && <Banner variant="error" message={error} onDismiss={() => setError(null)} />}
                  <TouchableOpacity
                    style={[styles.button, (loading || !email) && styles.buttonDisabled]}
                    disabled={loading || !email}
                    onPress={() => sendResetEmail(email)}
                  >
                    {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Send reset link</Text>}
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={() => { setForgotMode(false); resetTransientState(); }} style={styles.linkWrap}>
                <Text style={styles.link}>← Back to login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.centerWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Image source={require('../assets/vair-logo.png')} style={styles.logo} resizeMode="contain" />

            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => { setView('login'); resetTransientState(); }}
                style={[styles.tabButton, view === 'login' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, view === 'login' && styles.tabTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setView('signup'); resetTransientState(); }}
                style={[styles.tabButton, view === 'signup' && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, view === 'signup' && styles.tabTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {view === 'signup' && accessRequested ? (
              <Text style={[styles.successText, styles.requestedText]}>
                {accessRequested === 'pending'
                  ? `✅ We already have your request for ${email.trim()}. You'll get an email with your invite as soon as it's approved.`
                  : `✅ Thanks, ${firstName.trim()}! Your request has been sent. You'll get an email at ${email.trim()} with a link to create your password as soon as it's approved.`}
              </Text>
            ) : (
              <>
                {view === 'signup' && (
                  <>
                    <Text style={styles.subtext}>
                      VAiR is invite-only for now. Tell us who you are and we'll email you an invite.
                    </Text>
                    <View style={styles.nameRow}>
                      <TextInput
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="First name"
                        placeholderTextColor={colors.textFaint}
                        autoComplete="given-name"
                        style={[styles.input, styles.nameInput]}
                      />
                      <TextInput
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Last name"
                        placeholderTextColor={colors.textFaint}
                        autoComplete="family-name"
                        style={[styles.input, styles.nameInput]}
                      />
                    </View>
                  </>
                )}
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  style={styles.input}
                />
                {view === 'login' && (
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={colors.textFaint}
                    secureTextEntry
                    style={styles.input}
                  />
                )}

                {!!error && <Banner variant="error" message={error} onDismiss={() => setError(null)} />}

                <TouchableOpacity
                  style={[styles.button, (loading || !canSubmit) && styles.buttonDisabled]}
                  disabled={loading || !canSubmit}
                  onPress={handleAuth}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <Text style={styles.buttonText}>{view === 'login' ? 'Login' : 'Request an invite'}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {view === 'login' && (
              <TouchableOpacity onPress={() => { setForgotMode(true); resetTransientState(); }} style={styles.linkWrap}>
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {existingAccountEmail && (
              <View style={styles.existingBox}>
                <Text style={styles.existingText}>
                  An account with <Text style={styles.bold}>{existingAccountEmail}</Text> already exists — log in instead, or set a new password if you've forgotten it.
                </Text>
                {resetEmailSent ? (
                  <Text style={styles.successText}>✅ Check your email for a link to set a new password.</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    disabled={loading}
                    onPress={() => sendResetEmail(existingAccountEmail)}
                  >
                    {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Create a new password</Text>}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logo: { width: '100%', height: 90, marginBottom: 20, alignSelf: 'center' },
  heading: { color: colors.greenBright, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtext: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 19 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: colors.green },
  tabText: { color: colors.textDim, fontSize: 16 },
  tabTextActive: { color: colors.green, fontWeight: '700' },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: 16,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.greenDeepest,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonDisabled: { backgroundColor: 'rgba(29,158,117,0.2)' },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  linkWrap: { alignItems: 'center', marginTop: 14 },
  link: { color: colors.greenBright, fontSize: 13, textDecorationLine: 'underline' },
  existingBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,193,7,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)',
  },
  existingText: { color: '#ffc107', fontSize: 14, marginBottom: 10 },
  nameRow: { flexDirection: 'row', gap: 12 },
  nameInput: { flex: 1, minWidth: 0 },
  requestedText: { lineHeight: 20, paddingVertical: 8 },
  bold: { fontWeight: '700' },
  successText: { color: colors.greenBright, fontSize: 13, textAlign: 'center', marginBottom: 8 },
});
