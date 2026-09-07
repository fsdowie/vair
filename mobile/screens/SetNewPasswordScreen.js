import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import Banner from '../components/Banner';
import { colors } from '../theme';

// Shown when the user opened the app via a password-reset email link
// (AuthContext.pendingRecovery), mirroring src/RefereeLLM.jsx's forced
// "set new password" gate.
export default function SetNewPasswordScreen() {
  const { setPendingRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPendingRecovery(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.centerWrap}>
          <View style={styles.card}>
            <Text style={styles.heading}>Set a new password</Text>
            <Text style={styles.subtext}>Choose a new password for your account.</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              style={styles.input}
            />
            <TextInput
              value={password2}
              onChangeText={setPassword2}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              style={styles.input}
            />
            {!!error && <Banner variant="error" message={error} onDismiss={() => setError(null)} />}
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              disabled={saving}
              onPress={handleSubmit}
            >
              {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Set new password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { color: colors.greenBright, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtext: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginBottom: 20 },
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
  button: { backgroundColor: colors.greenDeepest, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  buttonDisabled: { backgroundColor: 'rgba(29,158,117,0.2)' },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
