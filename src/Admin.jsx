import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'fsdowie@yahoo.com';

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [reports, setReports] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { type: 'accept'|'reject', report }
  const [correctionText, setCorrectionText] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // correction id

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const userIsAdmin = session.user.email === ADMIN_EMAIL;
        setIsAdmin(userIsAdmin);
        if (userIsAdmin) {
          fetchUsers();
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchUsers = async () => {
    try {
      // Call Edge Function to get all users
      const { data, error } = await supabase.functions.invoke('list-users');

      if (error) {
        throw error;
      }

      if (data && data.users) {
        setUsers(data.users);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-question-logs');
      
      if (error) throw error;
      
      if (data && data.logs) {
        setLogs(data.logs);
      }
      setLogsLoading(false);
    } catch (err) {
      setError(err.message);
      setLogsLoading(false);
    }
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-reports');
      if (error) throw error;
      setReports(data.reports || []);
      setCorrections(data.corrections || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!correctionText.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('process-report', {
        body: { action: 'accept', report_id: actionModal.report.id, correction_text: correctionText, notes: correctionNotes },
      });
      if (error) throw error;
      setActionModal(null); setCorrectionText(''); setCorrectionNotes('');
      await fetchReports();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('process-report', {
        body: { action: 'reject', report_id: actionModal.report.id, rejection_reason: rejectionReason },
      });
      if (error) throw error;
      setActionModal(null); setRejectionReason('');
      await fetchReports();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteCorrection = async (id) => {
    try {
      const { error } = await supabase.functions.invoke('process-report', {
        body: { action: 'delete_correction', correction_id: id },
      });
      if (error) throw error;
      setDeleteConfirm(null);
      await fetchReports();
    } catch (err) { setError(err.message); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Admin Login</h1>
          <form onSubmit={handleLogin} style={styles.form}>
            <input
              name="email"
              type="email"
              placeholder="Admin Email"
              style={styles.input}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              style={styles.input}
              required
            />
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" style={styles.button}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show unauthorized message if logged in but not admin
  if (session && !isAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>⛔ Access Denied</h1>
          <div style={{...styles.note, marginTop: 20}}>
            You do not have administrator privileges.<br/>
            Only authorized administrators can access this page.
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{...styles.button, marginTop: 20}}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>VAIR Admin Panel</h1>
          <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>
            Sign Out
          </button>
        </div>

        {/* Tab Menu */}
        <div style={styles.tabMenu}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'users' ? styles.activeTab : {})
            }}
          >
            👥 Users
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              if (logs.length === 0) fetchLogs();
            }}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'logs' ? styles.activeTab : {})
            }}
          >
            📝 Question Logs
          </button>
          <button
            onClick={() => {
              setActiveTab('reports');
              if (reports.length === 0) fetchReports();
            }}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'reports' ? styles.activeTab : {})
            }}
          >
            🚩 Answer Reports
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div style={styles.stats}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{users.length}</div>
                <div style={styles.statLabel}>Total Users</div>
              </div>
            </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Created At</th>
              <th style={styles.th}>Last Sign In</th>
              <th style={styles.th}>Confirmed</th>
              <th style={styles.th}>User ID</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      color: user.email_confirmed_at ? '#4caf50' : '#ff9800',
                      fontWeight: 'bold'
                    }}>
                      {user.email_confirmed_at ? '✓' : '✗'}
                    </span>
                  </td>
                  <td style={styles.td} title={user.id}>{user.id.substring(0, 8)}...</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
          </>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <>
            <div style={styles.stats}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{logs.length}</div>
                <div style={styles.statLabel}>Total Questions</div>
              </div>
            </div>

            {logsLoading ? (
              <div style={{textAlign: 'center', padding: 40, color: 'rgba(232,245,233,0.6)'}}>
                Loading logs...
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User Email</th>
                    <th style={styles.th}>Question</th>
                    <th style={styles.th}>Asked At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                        No questions logged yet
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, index) => (
                      <tr key={index} style={styles.tr}>
                        <td style={styles.td}>{log.user_email}</td>
                        <td style={{...styles.td, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                          {log.question}
                        </td>
                        <td style={styles.td}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <>
            {reportsLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(232,245,233,0.6)' }}>Loading reports…</div>
            ) : (
              <>
                {/* Pending reports */}
                <h3 style={{ color: '#ef9a9a', fontSize: 16, marginBottom: 16 }}>
                  🚩 Pending Reports ({reports.filter(r => r.status === 'pending').length})
                </h3>
                {reports.filter(r => r.status === 'pending').length === 0 ? (
                  <div style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13, marginBottom: 32 }}>No pending reports.</div>
                ) : (
                  reports.filter(r => r.status === 'pending').map(r => (
                    <div key={r.id} style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid rgba(239,154,154,0.2)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'rgba(232,245,233,0.4)' }}>{r.user_email} · {new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Question</div>
                      <div style={{ fontSize: 13, color: '#e8f5e9', marginBottom: 12, background: 'rgba(76,175,80,0.05)', borderRadius: 8, padding: '8px 12px' }}>{r.question}</div>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>VAIR's Answer</div>
                      <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.8)', marginBottom: 12, background: 'rgba(13,33,55,0.5)', borderRadius: 8, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{r.vair_answer}</div>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Reporter's Explanation</div>
                      <div style={{ fontSize: 13, color: '#ef9a9a', marginBottom: 16, background: 'rgba(183,28,28,0.1)', borderRadius: 8, padding: '8px 12px' }}>{r.explanation}</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setActionModal({ type: 'accept', report: r })} style={{ background: 'linear-gradient(135deg,#2e7d32,#4caf50)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}>✅ Accept</button>
                        <button onClick={() => setActionModal({ type: 'reject', report: r })} style={{ background: 'linear-gradient(135deg,#b71c1c,#e53935)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}>❌ Reject</button>
                      </div>
                    </div>
                  ))
                )}

                {/* Processed reports summary */}
                <h3 style={{ color: '#81c784', fontSize: 16, marginBottom: 16, marginTop: 8 }}>
                  📋 Processed Reports ({reports.filter(r => r.status !== 'pending').length})
                </h3>
                {reports.filter(r => r.status !== 'pending').length === 0 ? (
                  <div style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13, marginBottom: 32 }}>No processed reports yet.</div>
                ) : (
                  <table style={styles.table}>
                    <thead><tr>
                      <th style={styles.th}>Reporter</th>
                      <th style={styles.th}>Question (excerpt)</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Processed At</th>
                    </tr></thead>
                    <tbody>
                      {reports.filter(r => r.status !== 'pending').map(r => (
                        <tr key={r.id} style={styles.tr}>
                          <td style={styles.td}>{r.user_email}</td>
                          <td style={{ ...styles.td, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.question}</td>
                          <td style={styles.td}>
                            <span style={{ color: r.status === 'accepted' ? '#81c784' : '#ef9a9a', fontWeight: 700 }}>
                              {r.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                            </span>
                          </td>
                          <td style={styles.td}>{r.processed_at ? new Date(r.processed_at).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Active corrections / rollback */}
                <h3 style={{ color: '#4caf50', fontSize: 16, marginBottom: 16, marginTop: 8 }}>
                  🧠 Active LLM Corrections ({corrections.filter(c => c.is_active).length})
                </h3>
                {corrections.filter(c => c.is_active).length === 0 ? (
                  <div style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13 }}>No active corrections.</div>
                ) : (
                  corrections.filter(c => c.is_active).map(c => (
                    <div key={c.id} style={{ background: 'rgba(76,175,80,0.05)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#81c784', fontFamily: 'monospace' }}>v {c.version_label}</span>
                        {deleteConfirm === c.id ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#ef9a9a' }}>Permanently remove?</span>
                            <button onClick={() => handleDeleteCorrection(c.id)} style={{ background: '#b71c1c', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>Yes, remove</button>
                            <button onClick={() => setDeleteConfirm(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#e8f5e9', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(c.id)} style={{ background: 'rgba(183,28,28,0.2)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 6, color: '#ef9a9a', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>🗑 Rollback</button>
                        )}
                      </div>
                      {c.notes && <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 6 }}>Note: {c.notes}</div>}
                      <div style={{ fontSize: 13, color: '#e8f5e9', whiteSpace: 'pre-wrap' }}>{c.correction_text}</div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Accept modal */}
            {actionModal?.type === 'accept' && (
              <div onClick={() => setActionModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540 }}>
                  <h3 style={{ color: '#81c784', marginBottom: 16 }}>✅ Accept report — add correction</h3>
                  <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Correction text (will be added to VAIR's knowledge) *</div>
                  <textarea value={correctionText} onChange={e => setCorrectionText(e.target.value)} placeholder="Write the correct ruling or clarification that VAIR should use going forward…" style={{ width: '100%', minHeight: 120, background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '10px 12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }} />
                  <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Admin notes (optional)</div>
                  <input value={correctionNotes} onChange={e => setCorrectionNotes(e.target.value)} placeholder="e.g. Law 12 clarification" style={{ width: '100%', background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(76,175,80,0.3)', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '10px 12px', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setActionModal(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleAccept} disabled={actionLoading || !correctionText.trim()} style={{ background: 'linear-gradient(135deg,#2e7d32,#4caf50)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 20px', cursor: actionLoading || !correctionText.trim() ? 'default' : 'pointer', opacity: actionLoading || !correctionText.trim() ? 0.6 : 1 }}>
                      {actionLoading ? 'Saving…' : 'Save correction'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reject modal */}
            {actionModal?.type === 'reject' && (
              <div onClick={() => setActionModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
                  <h3 style={{ color: '#ef9a9a', marginBottom: 16 }}>❌ Reject report</h3>
                  <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Reason for rejection (sent to reporter) *</div>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this report was not accepted…" style={{ width: '100%', minHeight: 100, background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '10px 12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 20 }} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setActionModal(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleReject} disabled={actionLoading || !rejectionReason.trim()} style={{ background: 'linear-gradient(135deg,#b71c1c,#e53935)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 20px', cursor: actionLoading || !rejectionReason.trim() ? 'default' : 'pointer', opacity: actionLoading || !rejectionReason.trim() ? 0.6 : 1 }}>
                      {actionLoading ? 'Saving…' : 'Reject report'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1628, #0d2137)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    background: 'rgba(13,33,55,0.8)',
    borderRadius: 16,
    padding: 40,
    maxWidth: 900,
    width: '100%',
    border: '1px solid rgba(76,175,80,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50',
    margin: 0,
  },
  logoutBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(76,175,80,0.3)',
    background: 'rgba(76,175,80,0.1)',
    color: '#4caf50',
    cursor: 'pointer',
    fontSize: 14,
  },
  stats: {
    display: 'flex',
    gap: 20,
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    background: 'rgba(76,175,80,0.1)',
    padding: 20,
    borderRadius: 12,
    border: '1px solid rgba(76,175,80,0.2)',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(232,245,233,0.6)',
    marginTop: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 20,
  },
  th: {
    textAlign: 'left',
    padding: 12,
    borderBottom: '2px solid rgba(76,175,80,0.3)',
    color: '#4caf50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tr: {
    borderBottom: '1px solid rgba(76,175,80,0.1)',
  },
  td: {
    padding: 12,
    color: '#e8f5e9',
    fontSize: 14,
  },
  note: {
    padding: 16,
    background: 'rgba(255,193,7,0.1)',
    border: '1px solid rgba(255,193,7,0.3)',
    borderRadius: 8,
    color: '#ffc107',
    fontSize: 13,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid rgba(76,175,80,0.3)',
    background: 'rgba(10,30,15,0.5)',
    color: '#e8f5e9',
    fontSize: 16,
    outline: 'none',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
    color: '#e8f5e9',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    padding: 12,
    borderRadius: 8,
    background: 'rgba(211,47,47,0.1)',
    border: '1px solid rgba(211,47,47,0.3)',
    color: '#ef5350',
    fontSize: 14,
  },
  tabMenu: {
    display: 'flex',
    gap: 12,
    marginBottom: 30,
    borderBottom: '2px solid rgba(76,175,80,0.2)',
    paddingBottom: 0,
  },
  tabButton: {
    padding: '12px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'rgba(232,245,233,0.6)',
    fontSize: 16,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: -2,
  },
  activeTab: {
    color: '#4caf50',
    borderBottomColor: '#4caf50',
    fontWeight: 'bold',
  },
};
