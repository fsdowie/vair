import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { callEdge } from '../../lib/api';
import Banner from '../../components/Banner';
import { colors } from '../../theme';

const HIGHLIGHTED_USER_EMAIL = 'fsdowie@gmail.com';

function formatCountdown(resetIso, nowMs) {
  if (!resetIso) return null;
  const diffMs = new Date(resetIso).getTime() - nowMs;
  if (diffMs <= 0) return 'resets any moment';
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `resets in ${h}h ${m}m`;
  if (m > 0) return `resets in ${m}m ${s}s`;
  return `resets in ${s}s`;
}

const formatNum = (n) => (n ?? 0).toLocaleString();

export default function TokenUsageTab() {
  const { session } = useAuth();
  const [userTotals, setUserTotals] = useState([]);
  const [rateLimit, setRateLimit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    callEdge(session.access_token, 'get-usage-stats')
      .then((data) => { setUserTotals(data?.userTotals || []); setRateLimit(data?.rateLimit || null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <ActivityIndicator style={styles.loader} color={colors.green} />;

  const highlighted = userTotals.find((u) => u.user_email === HIGHLIGHTED_USER_EMAIL);
  const capacityCards = [
    { label: 'Input tokens', remaining: rateLimit?.input_tokens_remaining, limit: rateLimit?.input_tokens_limit, reset: rateLimit?.input_tokens_reset },
    { label: 'Output tokens', remaining: rateLimit?.output_tokens_remaining, limit: rateLimit?.output_tokens_limit, reset: rateLimit?.output_tokens_reset },
    { label: 'Total tokens', remaining: rateLimit?.tokens_remaining, limit: rateLimit?.tokens_limit, reset: rateLimit?.tokens_reset },
    { label: 'Requests', remaining: rateLimit?.requests_remaining, limit: rateLimit?.requests_limit, reset: rateLimit?.requests_reset },
  ].filter((c) => c.limit != null);

  return (
    <View style={styles.flex}>
      <Banner variant="error" message={error} onDismiss={() => setError(null)} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>⚡ Live API Capacity</Text>
        <Text style={styles.hint}>From the Anthropic account VAIR connects through — shared across all users, as of the last question asked.</Text>
        {!rateLimit ? (
          <Text style={styles.empty}>No data yet — capacity is recorded the next time someone asks a question.</Text>
        ) : (
          <View style={styles.cardGrid}>
            {capacityCards.map((c) => {
              const pct = c.limit > 0 ? Math.max(0, Math.min(100, (c.remaining / c.limit) * 100)) : 0;
              return (
                <View key={c.label} style={styles.capacityCard}>
                  <Text style={styles.capacityLabel}>{c.label}</Text>
                  <Text style={styles.capacityValue}>
                    {formatNum(c.remaining)} <Text style={styles.capacityLimit}>/ {formatNum(c.limit)}</Text>
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct < 15 ? colors.redBright : colors.green }]} />
                  </View>
                  <Text style={styles.resetText}>{formatCountdown(c.reset, now) || '—'}</Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>🎯 {HIGHLIGHTED_USER_EMAIL}</Text>
        {!highlighted ? (
          <Text style={styles.empty}>No usage recorded yet for this account.</Text>
        ) : (
          <View style={styles.cardGrid}>
            {[
              { label: 'Questions', value: highlighted.questions },
              { label: 'Input', value: highlighted.input_tokens },
              { label: 'Output', value: highlighted.output_tokens },
              { label: 'Cache Write', value: highlighted.cache_creation_input_tokens },
              { label: 'Cache Read', value: highlighted.cache_read_input_tokens },
              { label: 'Total', value: highlighted.total_tokens, emphasize: true },
            ].map((c) => (
              <View key={c.label} style={[styles.smallStat, c.emphasize && styles.smallStatEmphasize]}>
                <Text style={styles.capacityLabel}>{c.label}</Text>
                <Text style={[styles.smallStatValue, c.emphasize && { color: colors.greenBright }]}>{formatNum(c.value)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>📊 Token Usage by User</Text>
        {userTotals.length === 0 ? (
          <Text style={styles.empty}>No token usage recorded yet</Text>
        ) : (
          userTotals.map((u) => (
            <View key={u.user_id} style={[styles.userRow, u.user_email === HIGHLIGHTED_USER_EMAIL && styles.userRowHighlight]}>
              <Text style={styles.userEmail}>{u.user_email === HIGHLIGHTED_USER_EMAIL ? '🎯 ' : ''}{u.user_email}</Text>
              <View style={styles.userStatsRow}>
                <Text style={styles.userStat}>Q: {formatNum(u.questions)}</Text>
                <Text style={styles.userStat}>In: {formatNum(u.input_tokens)}</Text>
                <Text style={styles.userStat}>Out: {formatNum(u.output_tokens)}</Text>
              </View>
              <View style={styles.userStatsRow}>
                <Text style={styles.userStat}>Cache W: {formatNum(u.cache_creation_input_tokens)}</Text>
                <Text style={styles.userStat}>Cache R: {formatNum(u.cache_read_input_tokens)}</Text>
                <Text style={[styles.userStat, { color: colors.greenBright, fontWeight: '700' }]}>Total: {formatNum(u.total_tokens)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 40 },
  scroll: { padding: 16 },
  sectionTitle: { color: colors.greenBright, fontSize: 16, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  hint: { color: colors.textFaint, fontSize: 12, marginBottom: 14 },
  empty: { color: colors.textFaint, fontSize: 13, marginBottom: 20 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  capacityCard: { flexGrow: 1, minWidth: 150, backgroundColor: 'rgba(29,158,117,0.08)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 14 },
  capacityLabel: { color: 'rgba(232,245,233,0.55)', fontSize: 11, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  capacityValue: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  capacityLimit: { fontSize: 12, fontWeight: '400', color: colors.textFaint },
  progressTrack: { height: 6, borderRadius: 6, backgroundColor: 'rgba(29,158,117,0.15)', overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 6 },
  resetText: { color: colors.textFaint, fontSize: 11 },
  smallStat: { flexGrow: 1, minWidth: 100, backgroundColor: 'rgba(29,158,117,0.08)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 12 },
  smallStatEmphasize: { backgroundColor: 'rgba(29,158,117,0.16)', borderColor: 'rgba(29,158,117,0.4)' },
  smallStatValue: { color: colors.text, fontSize: 18, fontWeight: '700' },
  userRow: { backgroundColor: 'rgba(10,22,40,0.6)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 12, marginBottom: 10 },
  userRowHighlight: { backgroundColor: 'rgba(29,158,117,0.1)' },
  userEmail: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  userStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  userStat: { color: colors.textDim, fontSize: 12 },
});
