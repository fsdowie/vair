import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const BOOTSTRAP_ADMIN_EMAIL = 'fsdowie@yahoo.com';

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

const EDGE_BASE = 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1';

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

  const [profileRequests, setProfileRequests] = useState([]);
  const [profileRequestsLoading, setProfileRequestsLoading] = useState(false);
  const [profileRequestAction, setProfileRequestAction] = useState(null); // { type: 'approve'|'reject', req }
  const [profileRequestNotes, setProfileRequestNotes] = useState('');
  const [profileRequestActionLoading, setProfileRequestActionLoading] = useState(false);
  const [generatingProfile, setGeneratingProfile] = useState(null); // referee_name being generated
  const [genProgress, setGenProgress] = useState(0);
  const genIntervalRef = useRef(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'accept'|'reject', report }
  const [correctionText, setCorrectionText] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // correction id

  // Admin role management
  const [adminChanges, setAdminChanges] = useState({}); // { [user_id]: is_admin }
  const [pwdModal, setPwdModal] = useState(false);
  const [pwdValue, setPwdValue] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        let adminFlag = session.user.email === BOOTSTRAP_ADMIN_EMAIL;
        if (!adminFlag) {
          const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
          adminFlag = data?.is_admin === true;
        }
        setIsAdmin(adminFlag);
        if (adminFlag) {
          fetchUsers();
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (generatingProfile) {
      setGenProgress(3);
      genIntervalRef.current = setInterval(() => {
        setGenProgress(p => {
          if (p >= 88) return p;
          return Math.min(p + (88 - p) * 0.06 + 0.5, 88);
        });
      }, 220);
    } else {
      clearInterval(genIntervalRef.current);
      setGenProgress(0);
    }
    return () => clearInterval(genIntervalRef.current);
  }, [generatingProfile]);

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

  const fetchProfileRequests = async () => {
    setProfileRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from('referee_profile_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfileRequests(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileRequestsLoading(false);
    }
  };

  const handleProfileRequestAction = async (type) => {
    if (!profileRequestAction) return;
    setProfileRequestActionLoading(true);
    const req = profileRequestAction.req;

    try {
      if (type === 'reject') {
        const { error } = await supabase
          .from('referee_profile_requests')
          .update({
            status: 'rejected',
            admin_notes: profileRequestNotes.trim() || null,
            reviewed_by: session.user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', req.id);
        if (error) throw error;
        setProfileRequestAction(null);
        setProfileRequestNotes('');
        await fetchProfileRequests();
        return;
      }

      // Approve: close modal first, then generate profile via Edge Function
      setProfileRequestAction(null);
      setProfileRequestNotes('');
      setGeneratingProfile(req.referee_name);

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await supabase.functions.invoke('generate-referee-profile', {
        body: {
          referee_name: req.referee_name,
          request_id:   req.id,
        },
      });

      if (res.error) throw new Error(res.error.message || 'Profile generation failed');
      if (res.data?.error) throw new Error(res.data.error);

      // Immediately reflect approval in local state so the status is visible without waiting for refetch
      setProfileRequests(prev => prev.map(r =>
        r.id === req.id
          ? { ...r, status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: session.user.id }
          : r
      ));
      await fetchProfileRequests();
    } catch (err) {
      setError(`Profile generation failed: ${err.message}`);
    } finally {
      setProfileRequestActionLoading(false);
      setGeneratingProfile(null);
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

  const saveAdminRoles = async () => {
    setPwdError('');
    setSavingAdmin(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      for (const [user_id, is_admin] of Object.entries(adminChanges)) {
        const res = await fetch(`${EDGE_BASE}/set-admin-role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ target_user_id: user_id, is_admin, password: pwdValue }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to update role');
      }
      // Refresh user list to show updated is_admin values
      setAdminChanges({});
      setPwdModal(false);
      setPwdValue('');
      await fetchUsers();
    } catch (err) {
      setPwdError(err?.message || String(err));
    } finally {
      setSavingAdmin(false);
    }
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

        {/* Global error banner (visible to logged-in admins) */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', marginBottom: 20, background: 'rgba(183,28,28,0.12)', border: '1px solid rgba(239,83,80,0.4)', borderRadius: 10, fontSize: 13, color: '#ef9a9a' }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
          </div>
        )}

        {/* Profile generation overlay */}
        {generatingProfile && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#0d2137', border: '1px solid rgba(29,158,117,0.4)', borderRadius: 20, padding: '40px 44px', width: '100%', maxWidth: 500, textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: 42, marginBottom: 18, display: 'inline-block', animation: 'spin 2s linear infinite' }}>⚙️</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e8f5e9', marginBottom: 8 }}>Generating Profile</div>
              <div style={{ fontSize: 16, color: '#5ecda4', fontWeight: 600, marginBottom: 28 }}>{generatingProfile}</div>

              {/* Progress bar track */}
              <div style={{ background: 'rgba(29,158,117,0.15)', borderRadius: 10, height: 10, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ position: 'relative', height: '100%', width: `${genProgress}%`, background: 'linear-gradient(90deg, #0e7a58, #1d9e75, #5ecda4)', borderRadius: 10, transition: 'width 0.35s ease', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)', animation: 'shimmer 1.6s infinite' }} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(29,158,117,0.7)', marginBottom: 20, textAlign: 'right' }}>{Math.round(genProgress)}%</div>

              <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.45)', lineHeight: 1.6 }}>
                AI is researching and building the referee's full stats profile.<br />
                This may take up to 30 seconds — please wait.
              </div>
            </div>
          </div>
        )}

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
          <button
            onClick={() => {
              setActiveTab('profile_requests');
              if (profileRequests.length === 0) fetchProfileRequests();
            }}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'profile_requests' ? styles.activeTab : {})
            }}
          >
            📋 Profile Requests
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

        {Object.keys(adminChanges).length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setPwdModal(true); setPwdError(''); setPwdValue(''); }}
              style={{ background: 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 22px', cursor: 'pointer' }}
            >
              💾 Save Changes ({Object.keys(adminChanges).length})
            </button>
          </div>
        )}

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Created At</th>
              <th style={styles.th}>Last Sign In</th>
              <th style={styles.th}>Confirmed</th>
              <th style={styles.th}>User ID</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = user.id === session?.user?.id;
                const currentAdmin = user.id in adminChanges ? adminChanges[user.id] : user.is_admin;
                return (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: user.email_confirmed_at ? '#1d9e75' : '#ff9800', fontWeight: 'bold' }}>
                        {user.email_confirmed_at ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={styles.td} title={user.id}>{user.id.substring(0, 8)}...</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={currentAdmin}
                        disabled={isSelf}
                        title={isSelf ? "Cannot change your own admin status" : undefined}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setAdminChanges(prev => {
                            // If reverting to original value, remove from pending changes
                            if (next === user.is_admin) {
                              const { [user.id]: _, ...rest } = prev;
                              return rest;
                            }
                            return { ...prev, [user.id]: next };
                          });
                        }}
                        style={{ width: 16, height: 16, cursor: isSelf ? 'not-allowed' : 'pointer', accentColor: '#1d9e75', opacity: isSelf ? 0.4 : 1 }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Password confirmation modal */}
        {pwdModal && (
          <div onClick={() => setPwdModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(29,158,117,0.35)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
              <h3 style={{ color: '#5ecda4', marginBottom: 8, fontSize: 18 }}>🔐 Confirm identity</h3>
              <p style={{ color: 'rgba(232,245,233,0.6)', fontSize: 13, marginBottom: 20 }}>
                Enter your password to apply admin role changes.
              </p>
              <input
                type="password"
                autoFocus
                value={pwdValue}
                onChange={e => setPwdValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pwdValue && saveAdminRoles()}
                placeholder="Your password"
                style={{ width: '100%', background: 'rgba(10,22,40,0.7)', border: `1px solid ${pwdError ? 'rgba(239,83,80,0.6)' : 'rgba(29,158,117,0.3)'}`, borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '11px 14px', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              />
              {pwdError && (
                <div style={{ color: '#ef9a9a', fontSize: 13, marginBottom: 14, background: 'rgba(183,28,28,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                  {pwdError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setPwdModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={saveAdminRoles}
                  disabled={savingAdmin || !pwdValue}
                  style={{ background: savingAdmin || !pwdValue ? 'rgba(29,158,117,0.3)' : 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 22px', cursor: savingAdmin || !pwdValue ? 'default' : 'pointer' }}
                >
                  {savingAdmin ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
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
                      <div style={{ fontSize: 13, color: '#e8f5e9', marginBottom: 12, background: 'rgba(29,158,117,0.05)', borderRadius: 8, padding: '8px 12px' }}>{r.question}</div>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>VAIR's Answer</div>
                      <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.8)', marginBottom: 12, background: 'rgba(13,33,55,0.5)', borderRadius: 8, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{r.vair_answer}</div>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Reporter's Explanation</div>
                      <div style={{ fontSize: 13, color: '#ef9a9a', marginBottom: 16, background: 'rgba(183,28,28,0.1)', borderRadius: 8, padding: '8px 12px' }}>{r.explanation}</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setActionModal({ type: 'accept', report: r })} style={{ background: 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}>✅ Accept</button>
                        <button onClick={() => setActionModal({ type: 'reject', report: r })} style={{ background: 'linear-gradient(135deg,#b71c1c,#e53935)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}>❌ Reject</button>
                      </div>
                    </div>
                  ))
                )}

                {/* Processed reports summary */}
                <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 16, marginTop: 8 }}>
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
                            <span style={{ color: r.status === 'accepted' ? '#5ecda4' : '#ef9a9a', fontWeight: 700 }}>
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
                <h3 style={{ color: '#1d9e75', fontSize: 16, marginBottom: 16, marginTop: 8 }}>
                  🧠 Active LLM Corrections ({corrections.filter(c => c.is_active).length})
                </h3>
                {corrections.filter(c => c.is_active).length === 0 ? (
                  <div style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13 }}>No active corrections.</div>
                ) : (
                  corrections.filter(c => c.is_active).map(c => (
                    <div key={c.id} style={{ background: 'rgba(29,158,117,0.05)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#5ecda4', fontFamily: 'monospace' }}>v {c.version_label}</span>
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
                <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540 }}>
                  <h3 style={{ color: '#5ecda4', marginBottom: 16 }}>✅ Accept report — add correction</h3>
                  <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Correction text (will be added to VAIR's knowledge) *</div>
                  <textarea value={correctionText} onChange={e => setCorrectionText(e.target.value)} placeholder="Write the correct ruling or clarification that VAIR should use going forward…" style={{ width: '100%', minHeight: 120, background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '10px 12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }} />
                  <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Admin notes (optional)</div>
                  <input value={correctionNotes} onChange={e => setCorrectionNotes(e.target.value)} placeholder="e.g. Law 12 clarification" style={{ width: '100%', background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '10px 12px', outline: 'none', boxSizing: 'border-box', marginBottom: 20 }} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setActionModal(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleAccept} disabled={actionLoading || !correctionText.trim()} style={{ background: 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 20px', cursor: actionLoading || !correctionText.trim() ? 'default' : 'pointer', opacity: actionLoading || !correctionText.trim() ? 0.6 : 1 }}>
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

        {/* Profile Requests Tab */}
        {activeTab === 'profile_requests' && (
          <>
            {profileRequestsLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(232,245,233,0.6)' }}>Loading requests…</div>
            ) : (
              <>
                <h3 style={{ color: '#ef9a9a', fontSize: 16, marginBottom: 16 }}>
                  ⏳ Pending ({profileRequests.filter(r => r.status === 'pending').length})
                </h3>
                {profileRequests.filter(r => r.status === 'pending').length === 0 ? (
                  <div style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13, marginBottom: 32 }}>No pending profile requests.</div>
                ) : (
                  profileRequests.filter(r => r.status === 'pending').map(req => (
                    <div key={req.id} style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#e8f5e9' }}>{req.referee_name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(232,245,233,0.4)' }}>{new Date(req.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.45)', marginBottom: 6 }}>Requested by: {req.requester_email}</div>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>Reason</div>
                      <div style={{ fontSize: 13, color: '#e8f5e9', background: 'rgba(29,158,117,0.05)', borderRadius: 8, padding: '8px 12px', marginBottom: req.additional_fields ? 12 : 16 }}>{req.reason}</div>
                      {req.additional_fields && (
                        <>
                          <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>Additional Notes</div>
                          <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.75)', background: 'rgba(13,33,55,0.5)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>{req.additional_fields}</div>
                        </>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => { setProfileRequestAction({ type: 'approve', req }); setProfileRequestNotes(''); }} style={{ background: 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}>✅ Approve</button>
                        <button onClick={() => { setProfileRequestAction({ type: 'reject', req }); setProfileRequestNotes(''); }} style={{ background: 'linear-gradient(135deg,#b71c1c,#e53935)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}>❌ Reject</button>
                      </div>
                    </div>
                  ))
                )}

                <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 16, marginTop: 8 }}>
                  📋 Reviewed ({profileRequests.filter(r => r.status !== 'pending').length})
                </h3>
                {profileRequests.filter(r => r.status !== 'pending').length === 0 ? (
                  <div style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13 }}>No reviewed requests yet.</div>
                ) : (
                  profileRequests.filter(r => r.status !== 'pending').map(req => {
                    const approved = req.status === 'approved';
                    return (
                      <div key={req.id} style={{ background: 'rgba(10,22,40,0.5)', border: `1px solid ${approved ? 'rgba(29,158,117,0.2)' : 'rgba(239,83,80,0.2)'}`, borderRadius: 12, padding: 18, marginBottom: 12, opacity: 0.85 }}>
                        {/* Status banner */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: approved ? 'rgba(29,158,117,0.14)' : 'rgba(183,28,28,0.14)', border: `1px solid ${approved ? 'rgba(29,158,117,0.3)' : 'rgba(239,83,80,0.3)'}`, borderRadius: 20, padding: '4px 14px', marginBottom: 14 }}>
                          <span style={{ fontSize: 14 }}>{approved ? '✅' : '❌'}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: approved ? '#5ecda4' : '#ef9a9a' }}>
                            {approved ? 'Profile Approved & Generated' : 'Request Rejected'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(232,245,233,0.75)', marginBottom: 3 }}>{req.referee_name}</div>
                            <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.35)' }}>Requested by {req.requester_email}</div>
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(232,245,233,0.3)', textAlign: 'right' }}>
                            {req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : '—'}
                          </div>
                        </div>
                        {req.admin_notes && (
                          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(232,245,233,0.5)', background: 'rgba(13,33,55,0.5)', borderRadius: 8, padding: '8px 12px' }}>
                            <span style={{ color: 'rgba(232,245,233,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 6 }}>Note:</span>
                            {req.admin_notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* Approve / Reject modal */}
            {profileRequestAction && (
              <div onClick={() => setProfileRequestAction(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: `1px solid ${profileRequestAction.type === 'approve' ? 'rgba(29,158,117,0.3)' : 'rgba(239,83,80,0.3)'}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
                  <h3 style={{ color: profileRequestAction.type === 'approve' ? '#5ecda4' : '#ef9a9a', marginBottom: 8, fontSize: 18 }}>
                    {profileRequestAction.type === 'approve' ? '✅ Approve & Generate Profile' : '❌ Reject Profile Request'}
                  </h3>
                  <p style={{ color: 'rgba(232,245,233,0.6)', fontSize: 13, marginBottom: 4 }}>
                    Referee: <strong style={{ color: '#e8f5e9' }}>{profileRequestAction.req.referee_name}</strong>
                  </p>
                  {profileRequestAction.type === 'approve' && (
                    <p style={{ color: 'rgba(94,205,164,0.6)', fontSize: 12, marginBottom: 16 }}>
                      AI will automatically generate the full profile (bio, leagues, estimated statistics) upon approval.
                    </p>
                  )}
                  <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)', marginBottom: 6, textTransform: 'uppercase' }}>Admin Notes (optional)</div>
                  <textarea
                    value={profileRequestNotes}
                    onChange={e => setProfileRequestNotes(e.target.value)}
                    placeholder={profileRequestAction.type === 'approve' ? 'e.g. Profile will be created within 48h…' : 'Reason for rejection…'}
                    rows={3}
                    style={{ width: '100%', background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '10px 12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 20 }}
                  />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setProfileRequestAction(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                    <button
                      onClick={() => handleProfileRequestAction(profileRequestAction.type)}
                      disabled={profileRequestActionLoading}
                      style={{ background: profileRequestAction.type === 'approve' ? 'linear-gradient(135deg,#0e7a58,#1d9e75)' : 'linear-gradient(135deg,#b71c1c,#e53935)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 22px', cursor: profileRequestActionLoading ? 'default' : 'pointer', opacity: profileRequestActionLoading ? 0.6 : 1 }}
                    >
                      {profileRequestActionLoading ? 'Processing…' : profileRequestAction.type === 'approve' ? 'Approve & Generate Profile' : 'Confirm Rejection'}
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
    background: 'transparent',
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
    border: '1px solid rgba(29,158,117,0.3)',
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
    color: '#1d9e75',
    margin: 0,
  },
  logoutBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(29,158,117,0.3)',
    background: 'rgba(29,158,117,0.1)',
    color: '#1d9e75',
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
    background: 'rgba(29,158,117,0.1)',
    padding: 20,
    borderRadius: 12,
    border: '1px solid rgba(29,158,117,0.2)',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1d9e75',
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
    borderBottom: '2px solid rgba(29,158,117,0.3)',
    color: '#1d9e75',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tr: {
    borderBottom: '1px solid rgba(29,158,117,0.1)',
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
    border: '1px solid rgba(29,158,117,0.3)',
    background: 'rgba(10,30,15,0.5)',
    color: '#e8f5e9',
    fontSize: 16,
    outline: 'none',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #0e7a58, #0a5c43)',
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
    borderBottom: '2px solid rgba(29,158,117,0.2)',
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
    color: '#1d9e75',
    borderBottomColor: '#1d9e75',
    fontWeight: 'bold',
  },
};
