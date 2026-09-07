import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { callEdge } from '../../lib/api';
import Banner from '../../components/Banner';
import { colors } from '../../theme';

export default function ProfileRequestsTab() {
  const { session } = useAuth();
  const token = session.access_token;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [action, setAction] = useState(null); // { type:'approve'|'reject', req }
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [generatingProfile, setGeneratingProfile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [successNotice, setSuccessNotice] = useState(null);
  const progressRef = useRef(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('referee_profile_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    if (generatingProfile) {
      setProgress(3);
      progressRef.current = setInterval(() => {
        setProgress((p) => (p >= 88 ? p : Math.min(p + (88 - p) * 0.06 + 0.5, 88)));
      }, 220);
    } else {
      clearInterval(progressRef.current);
      setProgress(0);
    }
    return () => clearInterval(progressRef.current);
  }, [generatingProfile]);

  const runAction = async (type) => {
    if (!action) return;
    setActionLoading(true);
    const req = action.req;
    try {
      if (type === 'reject') {
        const { error } = await supabase
          .from('referee_profile_requests')
          .update({
            status: 'rejected',
            admin_notes: notes.trim() || null,
            reviewed_by: session.user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', req.id);
        if (error) throw error;
        setAction(null);
        setNotes('');
        await fetchRequests();
        return;
      }

      setAction(null);
      setNotes('');
      setGeneratingProfile(req.referee_name);

      const data = await callEdge(token, 'generate-referee-profile', {
        body: { referee_name: req.referee_name, request_id: req.id },
      });

      setSuccessNotice({ profileName: data?.profile?.name ?? req.referee_name, statusUpdateError: data?.statusUpdateError ?? null });
      setRequests((prev) => prev.map((r) => (r.id === req.id
        ? { ...r, status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: session.user.id }
        : r)));
      await fetchRequests();
    } catch (err) {
      setError(`Profile generation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
      setGeneratingProfile(null);
    }
  };

  if (loading) return <ActivityIndicator style={styles.loader} color={colors.green} />;

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  return (
    <View style={styles.flex}>
      <Banner variant="error" message={error} onDismiss={() => setError(null)} />
      {successNotice && (
        <Banner
          variant="success"
          message={`Profile for ${successNotice.profileName} created and added to Referee Statistics.${successNotice.statusUpdateError ? ` (Warning: ${successNotice.statusUpdateError})` : ''}`}
          onDismiss={() => setSuccessNotice(null)}
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitlePending}>⏳ Pending ({pending.length})</Text>
        {pending.length === 0 ? (
          <Text style={styles.empty}>No pending profile requests.</Text>
        ) : (
          pending.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{req.referee_name}</Text>
                <Text style={styles.date}>{new Date(req.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.meta}>Requested by: {req.requester_email}</Text>
              <Text style={styles.label}>Reason</Text>
              <Text style={styles.blockGreen}>{req.reason}</Text>
              {!!req.additional_fields && (
                <>
                  <Text style={styles.label}>Additional Notes</Text>
                  <Text style={styles.blockDim}>{req.additional_fields}</Text>
                </>
              )}
              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => { setAction({ type: 'approve', req }); setNotes(''); }} style={styles.approveBtn}>
                  <Text style={styles.actionText}>✅ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAction({ type: 'reject', req }); setNotes(''); }} style={styles.rejectBtn}>
                  <Text style={styles.actionText}>❌ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitleReviewed}>📋 Reviewed ({reviewed.length})</Text>
        {reviewed.length === 0 ? (
          <Text style={styles.empty}>No reviewed requests yet.</Text>
        ) : (
          reviewed.map((req) => {
            const approved = req.status === 'approved';
            return (
              <View key={req.id} style={[styles.card, { opacity: 0.85 }]}>
                <View style={[styles.statusPill, { backgroundColor: approved ? 'rgba(29,158,117,0.14)' : 'rgba(183,28,28,0.14)', borderColor: approved ? 'rgba(29,158,117,0.3)' : 'rgba(239,83,80,0.3)' }]}>
                  <Text style={{ color: approved ? colors.greenBright : colors.red, fontSize: 12, fontWeight: '700' }}>
                    {approved ? '✅ Profile Approved & Generated' : '❌ Request Rejected'}
                  </Text>
                </View>
                <Text style={styles.name}>{req.referee_name}</Text>
                <Text style={styles.meta}>Requested by {req.requester_email}</Text>
                {!!req.admin_notes && <Text style={styles.blockDim}>Note: {req.admin_notes}</Text>}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!action} transparent animationType="fade" onRequestClose={() => setAction(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: action?.type === 'approve' ? colors.greenBright : colors.red }]}>
              {action?.type === 'approve' ? '✅ Approve & Generate Profile' : '❌ Reject Profile Request'}
            </Text>
            <Text style={styles.meta}>Referee: {action?.req?.referee_name}</Text>
            {action?.type === 'approve' && (
              <Text style={styles.hint}>AI will automatically generate the full profile (bio, leagues, estimated statistics) upon approval.</Text>
            )}
            <Text style={styles.label}>Admin Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={action?.type === 'approve' ? 'e.g. Profile will be created within 48h…' : 'Reason for rejection…'}
              placeholderTextColor={colors.textFaint}
              style={styles.textArea}
              multiline
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => setAction(null)} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                onPress={() => runAction(action.type)}
                disabled={actionLoading}
                style={[action?.type === 'approve' ? styles.approveBtn : styles.rejectBtn, actionLoading && styles.btnDisabled, { paddingHorizontal: 20 }]}
              >
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>{action?.type === 'approve' ? 'Approve & Generate' : 'Confirm Rejection'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!generatingProfile} transparent animationType="fade">
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayIcon}>⚙️</Text>
            <Text style={styles.overlayTitle}>Generating Profile</Text>
            <Text style={styles.overlaySubtitle}>{generatingProfile}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
            <Text style={styles.overlayHint}>AI is researching and building the referee's full stats profile. This may take up to 30 seconds — please wait.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: { marginTop: 40 },
  scroll: { padding: 16, gap: 8 },
  empty: { color: colors.textFaint, fontSize: 13, marginBottom: 24 },
  sectionTitlePending: { color: colors.red, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionTitleReviewed: { color: colors.greenBright, fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  card: { backgroundColor: 'rgba(10,22,40,0.6)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 16, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  date: { color: colors.textFaint, fontSize: 11 },
  meta: { color: 'rgba(232,245,233,0.45)', fontSize: 12, marginBottom: 8 },
  label: { color: 'rgba(232,245,233,0.5)', fontSize: 11, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  blockGreen: { color: colors.text, fontSize: 13, backgroundColor: 'rgba(29,158,117,0.05)', borderRadius: 8, padding: 10, marginBottom: 10 },
  blockDim: { color: 'rgba(232,245,233,0.75)', fontSize: 13, backgroundColor: 'rgba(13,33,55,0.5)', borderRadius: 8, padding: 10, marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: { backgroundColor: colors.greenDeep, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  rejectBtn: { backgroundColor: colors.redDeep, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  statusPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, marginBottom: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.cardSolid, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.borderSoft },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  hint: { color: 'rgba(94,205,164,0.7)', fontSize: 12, marginBottom: 12 },
  textArea: { backgroundColor: 'rgba(10,22,40,0.7)', borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, fontSize: 13, padding: 10, minHeight: 90, marginBottom: 16, textAlignVertical: 'top' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  cancelText: { color: colors.text, fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  overlayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  overlayCard: { backgroundColor: colors.cardSolid, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, alignItems: 'center' },
  overlayIcon: { fontSize: 42, marginBottom: 14 },
  overlayTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 6 },
  overlaySubtitle: { color: colors.greenBright, fontSize: 15, fontWeight: '600', marginBottom: 22 },
  progressTrack: { width: '100%', height: 10, borderRadius: 10, backgroundColor: 'rgba(29,158,117,0.15)', overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: colors.green, borderRadius: 10 },
  progressPct: { color: 'rgba(29,158,117,0.7)', fontSize: 12, alignSelf: 'flex-end', marginBottom: 16 },
  overlayHint: { color: colors.textDim, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
