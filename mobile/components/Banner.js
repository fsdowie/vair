import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

const VARIANTS = {
  error: { icon: '⚠️', border: 'rgba(239,83,80,0.55)', bg: 'rgba(16,4,4,0.97)', text: colors.red },
  success: { icon: '✅', border: 'rgba(29,158,117,0.5)', bg: 'rgba(4,16,12,0.97)', text: colors.greenBright },
  warning: { icon: '⚠️', border: 'rgba(255,152,0,0.4)', bg: 'rgba(16,10,2,0.97)', text: colors.amber },
};

// Dismissable top banner — used for the error/success toasts that appear in
// both src/RefereeLLM.jsx and src/Admin.jsx (report status, daily-limit
// errors, profile-generation success, etc).
export default function Banner({ variant = 'error', message, onDismiss }) {
  if (!message) return null;
  const v = VARIANTS[variant] ?? VARIANTS.error;
  return (
    <View style={[styles.wrap, { borderColor: v.border, backgroundColor: v.bg }]}>
      <Text style={styles.icon}>{v.icon}</Text>
      <Text style={[styles.text, { color: v.text }]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.close, { color: v.text }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  icon: { fontSize: 14 },
  text: { flex: 1, fontSize: 13, lineHeight: 18 },
  close: { fontSize: 16, lineHeight: 16 },
});
