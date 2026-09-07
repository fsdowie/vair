import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EDGE_BASE } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Banner from '../components/Banner';
import { colors } from '../theme';

const ALL_SAMPLE_QUESTIONS = [
  'Can a goalkeeper score directly from a goal kick?',
  "A substitute enters the field without permission and prevents a goal. What's the ruling?",
  "A player in an offside position doesn't touch the ball — is it still offside?",
  'Can a player score from a drop ball restart?',
  'What happens if a ball bursts during play?',
  'Can a goalkeeper be sent off during a penalty shootout?',
  "Is it handball if the ball hits a player's shoulder?",
  'Can a team play with less than 7 players?',
  "What's the ruling if a fan throws an object that stops a goal?",
  'Can a penalty kick be taken before the goalkeeper is ready?',
  'Is it offside if a player receives the ball from a throw-in?',
  'What happens if two players on the same team commit fouls at the same time?',
  'Can a player be offside in their own half?',
  'What is the minimum distance defenders must be from a corner kick?',
  "Can a goalkeeper handle a deliberate back-pass from a teammate's head?",
  "What's the ruling on a player removing their shirt after scoring?",
  'Can a substitute warm up behind the goal during play?',
  'What happens if both teams score simultaneously?',
];

function getRandomQuestions(count = 3) {
  const shuffled = [...ALL_SAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Renders plain text with any http(s) URLs turned into tappable links —
// the referee's answers cite Law links (see the ask-referee system prompt).
function MessageText({ text, style }) {
  const parts = useMemo(() => {
    if (typeof text !== 'string') return [text ?? ''];
    return text.split(/(https?:\/\/[^\s]+)/g);
  }, [text]);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <Text key={i} style={styles.link} onPress={() => Linking.openURL(part)}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

// The AI Referee chat. All LLM work (the full IFAB Laws text, prompt
// caching, token budget) lives server-side in the ask-referee edge
// function — this screen only ever sends the conversation and a bearer
// token, matching src/RefereeLLM.jsx's sendMessage() exactly so there's a
// single place token usage is controlled.
export default function RefereeChatScreen() {
  const { session, signOut } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sampleQuestions] = useState(() => getRandomQuestions());
  const [notifications, setNotifications] = useState([]);

  const [reportModal, setReportModal] = useState(null); // { question, answer }
  const [reportExplanation, setReportExplanation] = useState('');
  const [reportStatus, setReportStatus] = useState('idle');

  const listRef = useRef(null);

  useEffect(() => {
    if (!session) return;
    fetch(`${EDGE_BASE}/get-reports?mode=user-notifications`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.reports) setNotifications(d.reports); })
      .catch(() => {});
  }, [session]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    fetch(`${EDGE_BASE}/process-report`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', report_id: id }),
    }).catch(() => {});
  };

  const submitReport = async () => {
    if (!reportModal || !reportExplanation.trim()) return;
    setReportStatus('submitting');
    try {
      const res = await fetch(`${EDGE_BASE}/submit-report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: reportModal.question,
          vair_answer: reportModal.answer,
          explanation: reportExplanation,
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setReportStatus('success');
    } catch {
      setReportStatus('idle');
    }
  };

  const closeReportModal = () => {
    setReportModal(null);
    setReportExplanation('');
    setReportStatus('idle');
  };

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content || chatLoading) return;

    const userMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setChatLoading(true);
    setError(null);

    try {
      const res = await fetch(`${EDGE_BASE}/ask-referee`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      if (typeof data.content !== 'string') {
        throw new Error('Received an empty response. Please try again.');
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (err) {
      setError(err.message || 'Failed to get response. Please try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  };

  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <MessageText text={item.content} style={[styles.bubbleText, isUser && styles.bubbleTextUser]} />
        </View>
        {!isUser && (
          <TouchableOpacity
            onPress={() => {
              const userQ = [...messages].slice(0, index).reverse().find((m) => m.role === 'user');
              setReportModal({ question: userQ?.content ?? '', answer: item.content });
            }}
            style={styles.reportLink}
          >
            <Text style={styles.reportLinkText}>🚩 Report incorrect answer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚽ AI Referee</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {notifications.map((n) => (
        <View
          key={n.id}
          style={[styles.notification, { backgroundColor: n.status === 'rejected' ? 'rgba(183,28,28,0.95)' : 'rgba(27,94,32,0.95)' }]}
        >
          <Text style={styles.notificationTitle}>
            {n.status === 'rejected' ? '❌ Your answer report was reviewed' : '✅ Your answer report was accepted'}
          </Text>
          <Text style={styles.notificationBody}>
            {n.question.slice(0, 120)}{n.question.length > 120 ? '…' : ''}
          </Text>
          {n.status === 'rejected' && n.rejection_reason && (
            <Text style={styles.notificationBody}>Reason: {n.rejection_reason}</Text>
          )}
          <TouchableOpacity onPress={() => dismissNotification(n.id)} style={styles.notificationDismiss}>
            <Text style={styles.notificationDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ))}

      {error && <Banner variant="error" message={error} onDismiss={() => setError(null)} />}

      {messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Ask VAIR a refereeing question</Text>
          <Text style={styles.emptySubtitle}>Try one of these:</Text>
          {sampleQuestions.map((q) => (
            <TouchableOpacity key={q} style={styles.sampleChip} onPress={() => sendMessage(q)}>
              <Text style={styles.sampleChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {chatLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.green} size="small" />
          <Text style={styles.loadingText}>VAIR is thinking…</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Describe the situation…"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity
          onPress={() => sendMessage()}
          disabled={!input.trim() || chatLoading}
          style={[styles.sendButton, (!input.trim() || chatLoading) && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!reportModal} transparent animationType="fade" onRequestClose={closeReportModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {reportStatus === 'success' ? (
              <View style={styles.modalSuccess}>
                <Text style={styles.modalSuccessIcon}>✅</Text>
                <Text style={styles.modalSuccessTitle}>Report submitted</Text>
                <Text style={styles.modalSuccessBody}>
                  Thank you — we will review the correction and address it accordingly.
                </Text>
                <TouchableOpacity onPress={closeReportModal} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>🚩 Report incorrect answer</Text>
                <Text style={styles.modalLabel}>VAIR's answer</Text>
                <View style={styles.modalAnswerBox}>
                  <Text style={styles.modalAnswerText} numberOfLines={5}>
                    {reportModal?.answer}
                  </Text>
                </View>
                <Text style={styles.modalLabel}>Why is this wrong? *</Text>
                <TextInput
                  value={reportExplanation}
                  onChangeText={setReportExplanation}
                  placeholder="Explain why this answer is incorrect and what the correct ruling should be…"
                  placeholderTextColor={colors.textFaint}
                  style={styles.modalTextArea}
                  multiline
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={closeReportModal} style={styles.modalCancelButton}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={submitReport}
                    disabled={reportStatus === 'submitting' || !reportExplanation.trim()}
                    style={[
                      styles.modalSubmitButton,
                      (reportStatus === 'submitting' || !reportExplanation.trim()) && styles.modalSubmitButtonDisabled,
                    ]}
                  >
                    {reportStatus === 'submitting' ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Submit report</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  notification: { marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  notificationTitle: { color: colors.text, fontWeight: '700', marginBottom: 4, fontSize: 13 },
  notificationBody: { color: 'rgba(232,245,233,0.85)', fontSize: 12, marginBottom: 6 },
  notificationDismiss: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 12 },
  notificationDismissText: { color: colors.text, fontSize: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { color: colors.textDim, fontSize: 13, marginBottom: 16 },
  sampleChip: {
    backgroundColor: 'rgba(29,158,117,0.08)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    maxWidth: 360,
  },
  sampleChipText: { color: colors.text, fontSize: 13, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  bubbleRow: { marginBottom: 4, maxWidth: '88%' },
  bubbleRowUser: { alignSelf: 'flex-end' },
  bubbleRowAssistant: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 14, padding: 12 },
  bubbleUser: { backgroundColor: colors.greenDeep },
  bubbleAssistant: { backgroundColor: 'rgba(13,33,55,0.9)', borderWidth: 1, borderColor: colors.borderSoft },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  link: { color: colors.greenBright, textDecorationLine: 'underline' },
  reportLink: { marginTop: 4, alignSelf: 'flex-start' },
  reportLinkText: { color: colors.red, fontSize: 11 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  loadingText: { color: colors.textDim, fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendButton: { backgroundColor: colors.greenDeep, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18 },
  sendButtonDisabled: { backgroundColor: 'rgba(29,158,117,0.25)' },
  sendButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.cardSolid, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.borderSoft },
  modalTitle: { color: colors.red, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  modalLabel: { color: 'rgba(232,245,233,0.5)', fontSize: 11, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  modalAnswerBox: { backgroundColor: 'rgba(10,22,40,0.6)', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, padding: 10, marginBottom: 16, maxHeight: 100 },
  modalAnswerText: { color: 'rgba(232,245,233,0.7)', fontSize: 13 },
  modalTextArea: {
    backgroundColor: 'rgba(10,22,40,0.7)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: 13,
    padding: 10,
    minHeight: 100,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  modalCancelText: { color: colors.text, fontSize: 14 },
  modalSubmitButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: colors.redDeep, minWidth: 130, alignItems: 'center' },
  modalSubmitButtonDisabled: { opacity: 0.6 },
  modalSubmitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalSuccess: { alignItems: 'center', paddingVertical: 16 },
  modalSuccessIcon: { fontSize: 44, marginBottom: 12 },
  modalSuccessTitle: { color: colors.greenBright, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalSuccessBody: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  modalCloseButton: { backgroundColor: colors.greenDeep, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  modalCloseButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
