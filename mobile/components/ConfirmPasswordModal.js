import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

// Re-usable "type your password to confirm" modal, matching the web admin
// panel's shared confirmAction/pwdValue flow (src/Admin.jsx) used for
// granting/revoking admin, end-dating, and deleting a user.
export default function ConfirmPasswordModal({ visible, message, onCancel, onConfirm }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const close = () => {
    setPassword('');
    setError('');
    setSaving(false);
    onCancel();
  };

  const confirm = async () => {
    if (!password) return;
    setSaving(true);
    setError('');
    try {
      await onConfirm(password);
      setPassword('');
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>🔐 Confirm identity</Text>
          <Text style={styles.message}>{message}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoFocus
            style={[styles.input, error && styles.inputError]}
            onSubmitEditing={confirm}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity onPress={close} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirm}
              disabled={saving || !password}
              style={[styles.confirmBtn, (saving || !password) && styles.confirmBtnDisabled]}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmText}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.cardSolid, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.greenBright, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  message: { color: colors.textDim, fontSize: 13, marginBottom: 18, lineHeight: 19 },
  input: {
    backgroundColor: 'rgba(10,22,40,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: 15,
    padding: 12,
    marginBottom: 10,
  },
  inputError: { borderColor: 'rgba(239,83,80,0.6)' },
  error: { color: colors.red, fontSize: 13, backgroundColor: 'rgba(183,28,28,0.1)', borderRadius: 8, padding: 10, marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  cancelText: { color: colors.text, fontSize: 14 },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: colors.greenDeep, minWidth: 90, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: 'rgba(29,158,117,0.3)' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
