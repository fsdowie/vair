import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { callEdge } from '../../lib/api';
import Banner from '../../components/Banner';
import { colors } from '../../theme';

export default function ReportsTab() {
  const { session } = useAuth();
  const token = session.access_token;
  const [reports, setReports] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [actionModal, setActionModal] = useState(null); // { type:'accept'|'reject', report }
  const [correctionText, setCorrectionText] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await callEdge(token, 'get-reports');
      setReports(data.reports || []);
      setCorrections(data.corrections || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const closeModal = () => {
    setActionModal(null);
    setCorrectionText('');
    setCorrectionNotes('');
    setRejectionReason('');
  };

  const handleAccept = async () => {
    if (!correctionText.trim()) return;
    setActionLoading(true);
    try {
      await callEdge(token, 'process-report', {
        body: { action: 'accept', report_id: actionModal.report.id, correction_text: correctionText, notes: correctionNotes },
      });
      closeModal();
      await fetchReports();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await callEdge(token, 'process-report', {
        body: { action: 'reject', report_id: actionModal.report.id, rejection_reason: rejectionReason },
      });
      closeModal();
      await fetchReports();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteCorrection = async (id) => {
    try {
      await callEdge(token, 'process-report', { body: { action: 'delete_correction', correction_id: id } });
      setDeleteConfirm(null);
      await fetchReports();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <ActivityIndicator style={styles.loader} color={colors.green} />;

  const pending = reports.filter((r) => r.status === 'pending');
  const processed = reports.filter((r) => r.status !== 'pending');
  const active = corrections.filter((c) => c.is_active);

  return (
    <View style={styles.flex}>
      <Banner variant="error" message={error} onDismiss={() => setError(null)} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitlePending}>🚩 Pending Reports ({pending.length})</Text>
        {pending.length === 0 ? (
          <Text style={styles.empty}>No pending reports.</Text>
        ) : (
          pending.map((r) => (
            <View key={r.id} style={styles.reportCard}>
              <Text style={styles.reportMeta}>{r.user_email} · {new Date(r.created_at).toLocaleString()}</Text>
              <Text style={styles.label}>Question</Text>
              <Text style={styles.blockGreen}>{r.question}</Text>
              <Text style={styles.label}>VAIR's Answer</Text>
              <Text style={styles.blockDim}>{r.vair_answer}</Text>
              <Text style={styles.label}>Reporter's Explanation</Text>
              <Text style={styles.blockRed}>{r.explanation}</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => setActionModal({ type: 'accept', report: r })} style={styles.acceptBtn}>
                  <Text style={styles.acceptText}>✅ Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActionModal({ type: 'reject', report: r })} style={styles.rejectBtn}>
                  <Text style={styles.rejectText}>❌ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitleProcessed}>📋 Processed Reports ({processed.length})</Text>
        {processed.length === 0 ? (
          <Text style={styles.empty}>No processed reports yet.</Text>
        ) : (
          processed.map((r) => (
            <View key={r.id} style={styles.processedCard}>
              <Text style={styles.reportMeta}>{r.user_email}</Text>
              <Text style={styles.question} numberOfLines={2}>{r.question}</Text>
              <View style={styles.rowBetween}>
                <Text style={{ color: r.status === 'accepted' ? colors.greenBright : colors.red, fontWeight: '700', fontSize: 12 }}>
                  {r.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                </Text>
                <Text style={styles.date}>{r.processed_at ? new Date(r.processed_at).toLocaleDateString() : '—'}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitleActive}>🧠 Active LLM Corrections ({active.length})</Text>
        {active.length === 0 ? (
          <Text style={styles.empty}>No active corrections.</Text>
        ) : (
          active.map((c) => (
            <View key={c.id} style={styles.correctionCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.versionLabel}>v {c.version_label}</Text>
                {deleteConfirm === c.id ? (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity onPress={() => handleDeleteCorrection(c.id)} style={styles.confirmDeleteBtn}>
                      <Text style={styles.confirmDeleteText}>Yes, remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDeleteConfirm(null)} style={styles.cancelSmallBtn}>
                      <Text style={styles.cancelSmallText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setDeleteConfirm(c.id)} style={styles.rollbackBtn}>
                    <Text style={styles.rejectText}>🗑 Rollback</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!!c.notes && <Text style={styles.correctionNotes}>Note: {c.notes}</Text>}
              <Text style={styles.correctionText}>{c.correction_text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={actionModal?.type === 'accept'} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitleGreen}>✅ Accept report — add correction</Text>
            <Text style={styles.label}>Correction text (will be added to VAIR's knowledge) *</Text>
            <TextInput
              value={correctionText}
              onChangeText={setCorrectionText}
              placeholder="Write the correct ruling or clarification…"
              placeholderTextColor={colors.textFaint}
              style={styles.textArea}
              multiline
            />
            <Text style={styles.label}>Admin notes (optional)</Text>
            <TextInput
              value={correctionNotes}
              onChangeText={setCorrectionNotes}
              placeholder="e.g. Law 12 clarification"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                onPress={handleAccept}
                disabled={actionLoading || !correctionText.trim()}
                style={[styles.acceptModalBtn, (actionLoading || !correctionText.trim()) && styles.btnDisabled]}
              >
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptText}>Save correction</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={actionModal?.type === 'reject'} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitleRed}>❌ Reject report</Text>
            <Text style={styles.label}>Reason for rejection (sent to reporter) *</Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Explain why this report was not accepted…"
              placeholderTextColor={colors.textFaint}
              style={styles.textArea}
              multiline
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                style={[styles.rejectModalBtn, (actionLoading || !rejectionReason.trim()) && styles.btnDisabled]}
              >
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.rejectModalText}>Reject report</Text>}
              </TouchableOpacity>
            </View>
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
  sectionTitleProcessed: { color: colors.greenBright, fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  sectionTitleActive: { color: colors.green, fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  reportCard: { backgroundColor: 'rgba(10,22,40,0.6)', borderWidth: 1, borderColor: 'rgba(239,154,154,0.2)', borderRadius: 12, padding: 16, marginBottom: 14 },
  reportMeta: { color: colors.textFaint, fontSize: 11, marginBottom: 8 },
  label: { color: 'rgba(232,245,233,0.5)', fontSize: 11, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  blockGreen: { color: colors.text, fontSize: 13, backgroundColor: 'rgba(29,158,117,0.05)', borderRadius: 8, padding: 10, marginBottom: 10 },
  blockDim: { color: 'rgba(232,245,233,0.8)', fontSize: 13, backgroundColor: 'rgba(13,33,55,0.5)', borderRadius: 8, padding: 10, marginBottom: 10 },
  blockRed: { color: colors.red, fontSize: 13, backgroundColor: 'rgba(183,28,28,0.1)', borderRadius: 8, padding: 10, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  acceptBtn: { backgroundColor: colors.greenDeep, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rejectBtn: { backgroundColor: colors.redDeep, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  rejectText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  processedCard: { backgroundColor: 'rgba(10,22,40,0.5)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 12, marginBottom: 10 },
  question: { color: colors.text, fontSize: 13, marginVertical: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: colors.textFaint, fontSize: 11 },
  correctionCard: { backgroundColor: 'rgba(29,158,117,0.05)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, padding: 14, marginBottom: 12 },
  versionLabel: { color: colors.greenBright, fontSize: 11, fontFamily: 'monospace' },
  rollbackBtn: { backgroundColor: 'rgba(183,28,28,0.2)', borderWidth: 1, borderColor: 'rgba(239,83,80,0.3)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  confirmDeleteBtn: { backgroundColor: colors.redDeep, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  confirmDeleteText: { color: '#fff', fontSize: 12 },
  cancelSmallBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  cancelSmallText: { color: colors.text, fontSize: 12 },
  correctionNotes: { color: colors.textDim, fontSize: 12, marginTop: 6 },
  correctionText: { color: colors.text, fontSize: 13, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.cardSolid, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.borderSoft },
  modalTitleGreen: { color: colors.greenBright, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  modalTitleRed: { color: colors.red, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  input: { backgroundColor: 'rgba(10,22,40,0.7)', borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, fontSize: 13, padding: 10, marginBottom: 16 },
  textArea: { backgroundColor: 'rgba(10,22,40,0.7)', borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, fontSize: 13, padding: 10, minHeight: 100, marginBottom: 12, textAlignVertical: 'top' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  cancelText: { color: colors.text, fontSize: 14 },
  acceptModalBtn: { backgroundColor: colors.greenDeep, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, minWidth: 130, alignItems: 'center' },
  rejectModalBtn: { backgroundColor: colors.redDeep, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, minWidth: 130, alignItems: 'center' },
  rejectModalText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
});
