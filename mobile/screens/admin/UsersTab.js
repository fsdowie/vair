import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { callEdge } from '../../lib/api';
import Banner from '../../components/Banner';
import ConfirmPasswordModal from '../../components/ConfirmPasswordModal';
import { colors } from '../../theme';

const BOOTSTRAP_ADMIN_EMAIL = 'fsdowie@yahoo.com';

export default function UsersTab() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminChanges, setAdminChanges] = useState({}); // { [user_id]: is_admin }
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'roles' } | { type:'end_date', user, endDated } | { type:'delete', user }

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await callEdge(token, 'list-users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleAdmin = (user, next) => {
    setAdminChanges((prev) => {
      if (next === user.is_admin) {
        const { [user.id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [user.id]: next };
    });
  };

  const runConfirmed = async (password) => {
    if (confirmAction.type === 'roles') {
      for (const [user_id, is_admin] of Object.entries(adminChanges)) {
        await callEdge(token, 'set-admin-role', { body: { target_user_id: user_id, is_admin, password } });
      }
      setAdminChanges({});
    } else if (confirmAction.type === 'end_date') {
      await callEdge(token, 'end-date-user', {
        body: { target_user_id: confirmAction.user.id, end_dated: confirmAction.endDated, password },
      });
    } else if (confirmAction.type === 'delete') {
      await callEdge(token, 'delete-user', { body: { target_user_id: confirmAction.user.id, password } });
    }
    setConfirmAction(null);
    await fetchUsers();
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} color={colors.green} />;
  }

  return (
    <View style={styles.flex}>
      <Banner variant="error" message={error} onDismiss={() => setError(null)} />

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
      </View>

      {Object.keys(adminChanges).length > 0 && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => setConfirmAction({ type: 'roles' })}
        >
          <Text style={styles.saveButtonText}>💾 Save Role Changes ({Object.keys(adminChanges).length})</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
        renderItem={({ item: user }) => {
          const isSelf = user.id === session?.user?.id;
          const isBootstrapAdmin = user.email === BOOTSTRAP_ADMIN_EMAIL;
          const protectedUser = isSelf || isBootstrapAdmin;
          const currentAdmin = user.id in adminChanges ? adminChanges[user.id] : user.is_admin;
          return (
            <View style={styles.card}>
              <Text style={styles.email}>{user.email}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Joined {new Date(user.created_at).toLocaleDateString()}</Text>
                <Text style={styles.metaText}>
                  {user.last_sign_in_at ? `Last in ${new Date(user.last_sign_in_at).toLocaleDateString()}` : 'Never signed in'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: user.email_confirmed_at ? colors.greenBright : colors.amber }]}>
                  {user.email_confirmed_at ? '✓ Confirmed' : '✗ Unconfirmed'}
                </Text>
                <Text style={[styles.metaText, { color: user.is_ended ? colors.red : colors.greenBright, fontWeight: '700' }]}>
                  {user.is_ended ? 'Ended' : 'Active'}
                </Text>
              </View>

              <View style={styles.rowBetween}>
                <View style={styles.adminToggleRow}>
                  <Text style={styles.metaText}>Admin</Text>
                  <Switch
                    value={currentAdmin}
                    disabled={isSelf}
                    onValueChange={(next) => toggleAdmin(user, next)}
                    trackColor={{ true: colors.green, false: 'rgba(255,255,255,0.15)' }}
                  />
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    disabled={protectedUser}
                    onPress={() => setConfirmAction({ type: 'end_date', user, endDated: !user.is_ended })}
                    style={[styles.actionBtn, styles.endDateBtn, protectedUser && styles.actionBtnDisabled]}
                  >
                    <Text style={styles.endDateText}>{user.is_ended ? 'Reactivate' : 'End Date'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={protectedUser}
                    onPress={() => setConfirmAction({ type: 'delete', user })}
                    style={[styles.actionBtn, styles.deleteBtn, protectedUser && styles.actionBtnDisabled]}
                  >
                    <Text style={styles.deleteText}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      <ConfirmPasswordModal
        visible={!!confirmAction}
        message={
          confirmAction?.type === 'delete'
            ? `Enter your password to permanently delete ${confirmAction.user?.email}.`
            : confirmAction?.type === 'end_date'
            ? `Enter your password to ${confirmAction.endDated ? 'end-date' : 're-activate'} ${confirmAction.user?.email}.`
            : 'Enter your password to apply admin role changes.'
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 40 },
  statRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 16, marginBottom: 8 },
  statBox: { backgroundColor: 'rgba(29,158,117,0.08)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.borderSoft },
  statNumber: { color: colors.text, fontSize: 24, fontWeight: '800' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  saveButton: { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.greenDeep, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { padding: 16, gap: 12 },
  empty: { color: colors.textFaint, textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: 'rgba(10,22,40,0.6)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 14 },
  email: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metaText: { color: colors.textDim, fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  adminToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1 },
  actionBtnDisabled: { opacity: 0.35 },
  endDateBtn: { backgroundColor: 'rgba(255,152,0,0.15)', borderColor: 'rgba(255,152,0,0.3)' },
  endDateText: { color: colors.amber, fontSize: 12 },
  deleteBtn: { backgroundColor: 'rgba(183,28,28,0.15)', borderColor: 'rgba(239,83,80,0.3)' },
  deleteText: { color: colors.red, fontSize: 12 },
});
