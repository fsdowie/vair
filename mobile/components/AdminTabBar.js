import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

const TABS = [
  { key: 'users', label: '👥 Users' },
  { key: 'logs', label: '📝 Question Logs' },
  { key: 'reports', label: '🚩 Answer Reports' },
  { key: 'profile_requests', label: '📋 Profile Requests' },
  { key: 'token_usage', label: '🔋 Token Usage' },
];

export default function AdminTabBar({ active, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {TABS.map((t) => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onChange(t.key)}
          style={[styles.tab, active === t.key && styles.tabActive]}
        >
          <Text style={[styles.tabText, active === t.key && styles.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(29,158,117,0.08)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  tabActive: { backgroundColor: colors.greenDeep, borderColor: colors.green },
  tabText: { color: colors.textDim, fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: '700' },
});
