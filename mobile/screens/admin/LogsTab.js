import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { callEdge } from '../../lib/api';
import Banner from '../../components/Banner';
import { colors } from '../../theme';

export default function LogsTab() {
  const { session } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    callEdge(session.access_token, 'get-question-logs')
      .then((data) => setLogs(data.logs || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={styles.loader} color={colors.green} />;

  return (
    <View style={styles.flex}>
      <Banner variant="error" message={error} onDismiss={() => setError(null)} />
      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{logs.length}</Text>
          <Text style={styles.statLabel}>Total Questions</Text>
        </View>
      </View>
      <FlatList
        data={logs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No questions logged yet</Text>}
        renderItem={({ item: log }) => (
          <View style={styles.card}>
            <Text style={styles.email}>{log.user_email}</Text>
            <Text style={styles.question}>{log.question}</Text>
            <Text style={styles.date}>{new Date(log.created_at).toLocaleString()}</Text>
          </View>
        )}
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
  list: { padding: 16, gap: 10 },
  empty: { color: colors.textFaint, textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: 'rgba(10,22,40,0.6)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 12 },
  email: { color: colors.greenBright, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  question: { color: colors.text, fontSize: 13, marginBottom: 6 },
  date: { color: colors.textFaint, fontSize: 11 },
});
