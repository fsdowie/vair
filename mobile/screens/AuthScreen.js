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

// Mirrors the auth flow in src/RefereeLLM.jsx: on signup, check-registration
// tells us whether the email already has an account (Supabase's signUp()
// deliberately won't, to avoid enumeration), and steers an existing account
// to "send yourself a reset link" instead of silently failing.
export default function AuthScreen() {
  const [view, setView] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [error, setError] = useState(null);
  const [existingAccountEmail, setExistingAccountEmail] = useState(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const resetTransientState = () => {
    setError(null);
    setExistingAccountEmail(null);
    setResetEmailSent(false);
  };

  const handleAuth = async () => {
    resetTransientState();
    setLoading(true);
    try {
      if (view === 'signup') {
        setCheckingRegistration(true);
        let checkData;
        try {
          const checkRes = await fetch(`${EDGE_BASE}/check-registration`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ email }),
          });
          checkData = await checkRes.json();
          if (!checkRes.ok) throw new Error(checkData?.error || 'Could not verify email');
        } finally {
          setCheckingRegistration(false);
        }

        if (checkData.ended) {
          throw new Error('This account has been deactivated. Please contact the admin.');
        }
        if (checkData.exists) {
          setExistingAccountEmail(email);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: Linking.createURL('confirm') },
        });
        if (error) throw error;
        setError(null);
        alert('Check your email for the confirmation link!');
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
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: Linking.createURL('reset-password'),
      });
      if (error) throw error;
      setResetEmailSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (forgotMode) {
    return (
      <Screen>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.centerWrap}>
            <View style={styles.card}>
              <Image source={require('../assets/vair-logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.heading}>Reset your password</Text>
              {resetEmailSent ? (
                <Text style={styles.successText}>✅ Check your email for a link to set a new password.</Text>
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

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              style={styles.input}
            />

            {!!error && <Banner variant="error" message={error} onDismiss={() => setError(null)} />}

            <TouchableOpacity
              style={[styles.button, (loading || !email || !password) && styles.buttonDisabled]}
              disabled={loading || !email || !password}
              onPress={handleAuth}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonText}>{view === 'login' ? 'Login' : 'Sign Up'}</Text>
              )}
            </TouchableOpacity>

            {checkingRegistration && <Text style={styles.subtext}>Checking…</Text>}

            {view === 'login' && (
              <TouchableOpacity onPress={() => { setForgotMode(true); resetTransientState(); }} style={styles.linkWrap}>
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {existingAccountEmail && (
              <View style={styles.existingBox}>
                <Text style={styles.existingText}>
                  An account with <Text style={styles.bold}>{existingAccountEmail}</Text> already exists.
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
  bold: { fontWeight: '700' },
  successText: { color: colors.greenBright, fontSize: 13, textAlign: 'center', marginBottom: 8 },
});
