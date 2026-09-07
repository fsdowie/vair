import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import AdminTabBar from '../../components/AdminTabBar';
import UsersTab from './UsersTab';
import LogsTab from './LogsTab';
import ReportsTab from './ReportsTab';
import ProfileRequestsTab from './ProfileRequestsTab';
import TokenUsageTab from './TokenUsageTab';
import { colors } from '../../theme';

// Full parity with src/Admin.jsx: same five sections (Users, Question Logs,
// Answer Reports, Profile Requests, Token Usage), each hitting the exact
// same Supabase edge functions / tables. Access is already gated one level
// up (RootNavigator only mounts the Admin tab when AuthContext.isAdmin is
// true), so this screen assumes the caller is an admin.
export default function AdminHomeScreen() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState('users');

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VAIR Admin</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <AdminTabBar active={tab} onChange={setTab} />
      <View style={styles.flex}>
        {tab === 'users' && <UsersTab />}
        {tab === 'logs' && <LogsTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'profile_requests' && <ProfileRequestsTab />}
        {tab === 'token_usage' && <TokenUsageTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgBottom },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  signOut: { color: colors.green, fontSize: 13 },
});
