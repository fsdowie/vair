import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const BOOTSTRAP_ADMIN_EMAIL = 'fsdowie@yahoo.com';

const EDGE_BASE = 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1';

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

function formatNum(n) {
  return (n ?? 0).toLocaleString();
}

function formatUsd(n) {
  const v = n ?? 0;
  // Sub-cent costs are common (a cached question is ~$0.02), so show more
  // precision below a dollar.
  return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(Math.abs(v) < 1 && v !== 0 ? 3 : 2);
}

function formatDay(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [userTotals, setUserTotals] = useState([]);
  const [rateLimit, setRateLimit] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [billing, setBilling] = useState(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [billingSaving, setBillingSaving] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [reports, setReports] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [actionModal, setActionModal] = useState(null); // { type: 'accept'|'reject', report }
  const [correctionText, setCorrectionText] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // correction id

  // Beta-tester invites
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResult, setInviteResult] = useState(null); // { sent: string[], failed: { email, error }[] }

  // "What's new" reminders to existing users
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [reminderSelected, setReminderSelected] = useState({}); // { [user_id]: true }
  const [reminderNote, setReminderNote] = useState('');
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderResult, setReminderResult] = useState(null); // { sent: string[], failed: { email, error }[] }

  // Access requests from the public "Sign Up" (request access) form
  const [accessRequests, setAccessRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestBusy, setRequestBusy] = useState({}); // { [request_id]: true } while an action runs
  const [requestResult, setRequestResult] = useState(null); // { sent: string[], failed: { email, error }[], verb }

  // Admin role management
  const [adminChanges, setAdminChanges] = useState({}); // { [user_id]: is_admin }
  // Shared password-confirmation modal for sensitive user actions:
  // { type: 'roles' } | { type: 'end_date', user, endDated } | { type: 'delete', user }
  const [confirmAction, setConfirmAction] = useState(null);
  const [pwdValue, setPwdValue] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

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
          fetchAccessRequests(); // so the tab can show how many are pending
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

  const fetchUsageStats = async () => {
    setUsageLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-usage-stats');
      if (error) throw error;
      setUserTotals(data?.userTotals || []);
      setRateLimit(data?.rateLimit || null);
      setBilling(data?.billing || null);
      setUsageLoading(false);
    } catch (err) {
      setError(err.message);
      setUsageLoading(false);
    }
  };

  // Add/remove a credit payment or change the renewal day, then reload.
  const updateBilling = async (body) => {
    setBillingSaving(true);
    try {
      const { error } = await supabase.functions.invoke('get-usage-stats', { body });
      if (error) throw error;
      await fetchUsageStats();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBillingSaving(false);
    }
  };

  const addPayment = async () => {
    const ok = await updateBilling({ action: 'add_payment', paid_on: payDate, amount: Number(payAmount), note: payNote });
    if (ok) { setPayAmount(''); setPayNote(''); }
  };

  // Tick every second while the Token Usage tab is open so the reset
  // countdown (e.g. "resets in 42s") stays live without re-fetching.
  useEffect(() => {
    if (activeTab !== 'token_usage') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Raw fetch so the error body is readable on non-2xx (supabase.functions.invoke drops it)
  const callOutreach = async (body) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const rawRes = await fetch(`${EDGE_BASE}/send-outreach-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': 'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn',
      },
      body: JSON.stringify(body),
    });
    const res = await rawRes.json().catch(() => ({}));
    if (!rawRes.ok || res?.error) throw new Error(res?.error ?? `HTTP ${rawRes.status}`);
    return res;
  };

  const splitResults = (results = []) => ({
    sent: results.filter(r => r.ok).map(r => r.email),
    failed: results.filter(r => !r.ok),
  });

  const fetchInvites = async () => {
    setInvitesLoading(true);
    try {
      const res = await callOutreach({ action: 'list', kind: 'invite' });
      setInvites(res.emails ?? []);
    } catch (err) {
      setError(`Could not load invites: ${err?.message ?? String(err)}`);
    } finally {
      setInvitesLoading(false);
    }
  };

  const fetchReminders = async () => {
    setRemindersLoading(true);
    try {
      const res = await callOutreach({ action: 'list', kind: 'reminder' });
      setReminders(res.emails ?? []);
    } catch (err) {
      setError(`Could not load reminders: ${err?.message ?? String(err)}`);
    } finally {
      setRemindersLoading(false);
    }
  };

  const parsedInviteEmails = inviteEmails.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean);

  const handleSendInvites = async () => {
    if (parsedInviteEmails.length === 0) return;
    setInviteSending(true);
    setInviteResult(null);
    try {
      const res = await callOutreach({ action: 'invite', emails: parsedInviteEmails, name: inviteName, note: inviteNote });
      const result = splitResults(res.results);
      setInviteResult(result);
      // Keep only the addresses that failed so they can be retried
      setInviteEmails(result.failed.map(f => f.email).join('\n'));
      if (result.failed.length === 0) { setInviteName(''); setInviteNote(''); }
      await fetchInvites();
    } catch (err) {
      setInviteResult({ sent: [], failed: [{ email: '', error: err?.message ?? String(err) }] });
    } finally {
      setInviteSending(false);
    }
  };

  // Users who can receive a reminder (end-dated accounts are excluded)
  const remindableUsers = users.filter(u => !u.is_ended);
  const lastRemindedAt = {};
  reminders.forEach(r => {
    if (r.status === 'sent' && !lastRemindedAt[r.email]) lastRemindedAt[r.email] = r.created_at;
  });

  const toggleReminderUser = (id) => setReminderSelected(prev => {
    const next = { ...prev };
    if (next[id]) delete next[id]; else next[id] = true;
    return next;
  });

  const selectReminderUsers = (predicate) => {
    const next = {};
    remindableUsers.filter(predicate).forEach(u => { next[u.id] = true; });
    setReminderSelected(next);
  };

  const handleSendReminders = async () => {
    const ids = Object.keys(reminderSelected);
    if (ids.length === 0) return;
    setReminderSending(true);
    setReminderResult(null);
    try {
      const res = await callOutreach({ action: 'remind', user_ids: ids, note: reminderNote });
      const result = splitResults(res.results);
      setReminderResult(result);
      if (result.failed.length === 0) { setReminderSelected({}); setReminderNote(''); }
      await fetchReminders();
    } catch (err) {
      setReminderResult({ sent: [], failed: [{ email: '', error: err?.message ?? String(err) }] });
    } finally {
      setReminderSending(false);
    }
  };

  const fetchAccessRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await callOutreach({ action: 'list_requests' });
      setAccessRequests(res.requests ?? []);
    } catch (err) {
      setError(`Could not load access requests: ${err?.message ?? String(err)}`);
    } finally {
      setRequestsLoading(false);
    }
  };

  // action: 'activate_request' | 'remind_request' | 'reject_request'
  const handleRequestAction = async (action, ids) => {
    if (ids.length === 0) return;
    const verb = { activate_request: 'Invite sent to', remind_request: 'Reminder sent to', reject_request: 'Dismissed' }[action];
    setRequestBusy(prev => ({ ...prev, ...Object.fromEntries(ids.map(id => [id, true])) }));
    setRequestResult(null);
    try {
      const res = await callOutreach({ action, request_ids: ids });
      setRequestResult({ ...splitResults(res.results), verb });
      await fetchAccessRequests();
    } catch (err) {
      setRequestResult({ sent: [], failed: [{ email: '', error: err?.message ?? String(err) }], verb });
    } finally {
      setRequestBusy(prev => {
        const next = { ...prev };
        ids.forEach(id => delete next[id]);
        return next;
      });
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

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setPwdError('');
    setPwdSaving(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      if (confirmAction.type === 'roles') {
        for (const [user_id, is_admin] of Object.entries(adminChanges)) {
          const res = await fetch(`${EDGE_BASE}/set-admin-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ target_user_id: user_id, is_admin, password: pwdValue }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Failed to update role');
        }
        setAdminChanges({});
      } else if (confirmAction.type === 'end_date') {
        const res = await fetch(`${EDGE_BASE}/end-date-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            target_user_id: confirmAction.user.id,
            end_dated: confirmAction.endDated,
            password: pwdValue,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to update user');
      } else if (confirmAction.type === 'delete') {
        const res = await fetch(`${EDGE_BASE}/delete-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ target_user_id: confirmAction.user.id, password: pwdValue }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to delete user');
      }

      setConfirmAction(null);
      setPwdValue('');
      await fetchUsers();
    } catch (err) {
      setPwdError(err?.message || String(err));
    } finally {
      setPwdSaving(false);
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
      {/* Fixed-position toast: error */}
      {error && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, maxWidth: 420, width: 'calc(100% - 48px)', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'rgba(16,4,4,0.97)', border: '1px solid rgba(239,83,80,0.55)', borderRadius: 12, fontSize: 13, color: '#ef9a9a', boxShadow: '0 8px 32px rgba(0,0,0,0.55)' }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>✕</button>
        </div>
      )}


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
              setActiveTab('requests');
              fetchAccessRequests();
            }}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'requests' ? styles.activeTab : {})
            }}
          >
            📥 Access Requests
            {accessRequests.some(r => r.status === 'pending') && (
              <span style={{ marginLeft: 8, background: '#ffc107', color: '#0a1628', borderRadius: 999, fontSize: 11, fontWeight: 800, padding: '2px 7px' }}>
                {accessRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
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
              setActiveTab('token_usage');
              if (userTotals.length === 0) fetchUsageStats();
            }}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'token_usage' ? styles.activeTab : {})
            }}
          >
            🔋 Token Usage
          </button>
          <button
            onClick={() => {
              setActiveTab('invites');
              if (invites.length === 0) fetchInvites();
            }}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'invites' ? styles.activeTab : {})
            }}
          >
            ✉️ Invite Testers
          </button>
          <button
            onClick={() => {
              setActiveTab('reminders');
              if (reminders.length === 0) fetchReminders();
            }}
            style={{
              ...styles.tabButton,
              ...(activeTab === 'reminders' ? styles.activeTab : {})
            }}
          >
            🔔 Reminders
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
              onClick={() => { setConfirmAction({ type: 'roles' }); setPwdError(''); setPwdValue(''); }}
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
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = user.id === session?.user?.id;
                const isBootstrapAdmin = user.email === BOOTSTRAP_ADMIN_EMAIL;
                const currentAdmin = user.id in adminChanges ? adminChanges[user.id] : user.is_admin;
                const protectedUser = isSelf || isBootstrapAdmin;
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
                    <td style={styles.td}>
                      <span style={{ color: user.is_ended ? '#ef9a9a' : '#1d9e75', fontWeight: 'bold' }}>
                        {user.is_ended ? 'Ended' : 'Active'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setConfirmAction({ type: 'end_date', user, endDated: !user.is_ended }); setPwdError(''); setPwdValue(''); }}
                          disabled={protectedUser}
                          title={protectedUser ? "Cannot change this account's status" : undefined}
                          style={{ background: 'rgba(255,152,0,0.15)', border: '1px solid rgba(255,152,0,0.3)', borderRadius: 6, color: '#ffb74d', fontSize: 12, padding: '6px 10px', cursor: protectedUser ? 'not-allowed' : 'pointer', opacity: protectedUser ? 0.4 : 1 }}
                        >
                          {user.is_ended ? 'Reactivate' : 'End Date'}
                        </button>
                        <button
                          onClick={() => { setConfirmAction({ type: 'delete', user }); setPwdError(''); setPwdValue(''); }}
                          disabled={protectedUser}
                          title={protectedUser ? "Cannot delete this account" : undefined}
                          style={{ background: 'rgba(183,28,28,0.15)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 6, color: '#ef9a9a', fontSize: 12, padding: '6px 10px', cursor: protectedUser ? 'not-allowed' : 'pointer', opacity: protectedUser ? 0.4 : 1 }}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Password confirmation modal */}
        {confirmAction && (
          <div onClick={() => setConfirmAction(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(29,158,117,0.35)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
              <h3 style={{ color: '#5ecda4', marginBottom: 8, fontSize: 18 }}>🔐 Confirm identity</h3>
              <p style={{ color: 'rgba(232,245,233,0.6)', fontSize: 13, marginBottom: 20 }}>
                {confirmAction.type === 'delete'
                  ? `Enter your password to permanently delete ${confirmAction.user?.email}.`
                  : confirmAction.type === 'end_date'
                  ? `Enter your password to ${confirmAction.endDated ? 'end-date' : 're-activate'} ${confirmAction.user?.email}.`
                  : 'Enter your password to apply admin role changes.'}
              </p>
              <input
                type="password"
                autoFocus
                value={pwdValue}
                onChange={e => setPwdValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pwdValue && runConfirmedAction()}
                placeholder="Your password"
                style={{ width: '100%', background: 'rgba(10,22,40,0.7)', border: `1px solid ${pwdError ? 'rgba(239,83,80,0.6)' : 'rgba(29,158,117,0.3)'}`, borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '11px 14px', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              />
              {pwdError && (
                <div style={{ color: '#ef9a9a', fontSize: 13, marginBottom: 14, background: 'rgba(183,28,28,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                  {pwdError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmAction(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={runConfirmedAction}
                  disabled={pwdSaving || !pwdValue}
                  style={{ background: pwdSaving || !pwdValue ? 'rgba(29,158,117,0.3)' : 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 22px', cursor: pwdSaving || !pwdValue ? 'default' : 'pointer' }}
                >
                  {pwdSaving ? 'Saving…' : 'Confirm'}
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

        {/* Token Usage Tab */}
        {activeTab === 'token_usage' && (
          <>
            {usageLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(232,245,233,0.6)' }}>Loading usage…</div>
            ) : (
              <>
                <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 6 }}>
                  ⚡ Live API Capacity
                </h3>
                <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.4)', marginBottom: 16 }}>
                  From the Anthropic account VAIR connects through — shared across all users, as of the last question asked.
                </div>
                {!rateLimit ? (
                  <div style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13, marginBottom: 32 }}>
                    No data yet — capacity is recorded the next time someone asks a question.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
                    {[
                      { label: 'Input tokens', remaining: rateLimit.input_tokens_remaining, limit: rateLimit.input_tokens_limit, reset: rateLimit.input_tokens_reset },
                      { label: 'Output tokens', remaining: rateLimit.output_tokens_remaining, limit: rateLimit.output_tokens_limit, reset: rateLimit.output_tokens_reset },
                      { label: 'Total tokens', remaining: rateLimit.tokens_remaining, limit: rateLimit.tokens_limit, reset: rateLimit.tokens_reset },
                      { label: 'Requests', remaining: rateLimit.requests_remaining, limit: rateLimit.requests_limit, reset: rateLimit.requests_reset },
                    ].filter(c => c.limit != null).map(c => {
                      const pct = c.limit > 0 ? Math.max(0, Math.min(100, (c.remaining / c.limit) * 100)) : 0;
                      return (
                        <div key={c.label} style={{ flex: '1 1 200px', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 12, padding: '16px 18px' }}>
                          <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{c.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#e8f5e9', marginBottom: 8 }}>
                            {formatNum(c.remaining)} <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(232,245,233,0.4)' }}>/ {formatNum(c.limit)}</span>
                          </div>
                          <div style={{ background: 'rgba(29,158,117,0.15)', borderRadius: 6, height: 6, overflow: 'hidden', marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct < 15 ? 'linear-gradient(90deg,#b71c1c,#e53935)' : 'linear-gradient(90deg,#0e7a58,#1d9e75)', borderRadius: 6, transition: 'width 0.3s ease' }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(232,245,233,0.4)' }}>{formatCountdown(c.reset, now) || '—'}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(() => {
                  const highlighted = userTotals.find(u => u.user_email === HIGHLIGHTED_USER_EMAIL);
                  return (
                    <>
                      <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 6 }}>
                        🎯 {HIGHLIGHTED_USER_EMAIL}
                      </h3>
                      {!highlighted ? (
                        <div style={{ color: 'rgba(232,245,233,0.4)', fontSize: 13, marginBottom: 32 }}>
                          No usage recorded yet for this account.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
                          {[
                            { label: 'Questions', value: highlighted.questions },
                            { label: 'Input', value: highlighted.input_tokens },
                            { label: 'Output', value: highlighted.output_tokens },
                            { label: 'Cache Write', value: highlighted.cache_creation_input_tokens },
                            { label: 'Cache Read', value: highlighted.cache_read_input_tokens },
                            { label: 'Total', value: highlighted.total_tokens },
                            { label: 'Cost', value: highlighted.cost, usd: true, emphasize: true },
                          ].map(c => (
                            <div key={c.label} style={{ flex: '1 1 130px', background: c.emphasize ? 'rgba(29,158,117,0.16)' : 'rgba(29,158,117,0.08)', border: `1px solid ${c.emphasize ? 'rgba(29,158,117,0.4)' : 'rgba(29,158,117,0.2)'}`, borderRadius: 12, padding: '14px 16px' }}>
                              <div style={{ fontSize: 11, color: 'rgba(232,245,233,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{c.label}</div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: c.emphasize ? '#5ecda4' : '#e8f5e9' }}>{c.usd ? formatUsd(c.value) : formatNum(c.value)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}

                <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 16 }}>
                  📊 Token Usage by User
                </h3>
                <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>User</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Questions</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Input</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Output</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Cache Write</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Cache Read</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTotals.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                          No token usage recorded yet
                        </td>
                      </tr>
                    ) : (
                      userTotals.map(u => (
                        <tr
                          key={u.user_id}
                          style={u.user_email === HIGHLIGHTED_USER_EMAIL
                            ? { ...styles.tr, background: 'rgba(29,158,117,0.1)' }
                            : styles.tr}
                        >
                          <td style={{ ...styles.td, fontWeight: u.user_email === HIGHLIGHTED_USER_EMAIL ? 700 : 400 }}>
                            {u.user_email === HIGHLIGHTED_USER_EMAIL ? '🎯 ' : ''}{u.user_email}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatNum(u.questions)}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatNum(u.input_tokens)}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatNum(u.output_tokens)}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatNum(u.cache_creation_input_tokens)}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatNum(u.cache_read_input_tokens)}</td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>{formatNum(u.total_tokens)}</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#5ecda4' }}>{formatUsd(u.cost)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.4)', marginTop: 8, marginBottom: 32 }}>
                  Cost is estimated from the logged tokens at Anthropic's list prices for the model that answered (Claude Sonnet 5: $2 input, $10 output, $4 cache write, $0.20 cache read per million tokens), before tax.
                </div>

                {billing && (() => {
                  const balance = billing.periods[0]?.balance ?? 0;
                  const fieldStyle = { background: 'rgba(10,22,40,0.7)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '8px 10px', outline: 'none' };
                  return (
                    <>
                      <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 6 }}>
                        🗓️ Usage by Billing Period
                      </h3>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.4)', marginBottom: 12, lineHeight: 1.5 }}>
                        Periods start on day{' '}
                        <select
                          value={billing.renewalDay}
                          disabled={billingSaving}
                          onChange={e => updateBilling({ action: 'set_renewal_day', renewal_day: Number(e.target.value) })}
                          style={{ ...fieldStyle, padding: '2px 6px', fontSize: 12 }}
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>{' '}
                        of each month (your Claude Pro renewal). The $20 Claude Pro fee covers Claude.ai, not the API. VAiR&apos;s questions are paid from API credits, so only the credit payments below count toward the balance.
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Period</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Questions</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Tokens</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Cost</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Credits added</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Credit balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billing.periods.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                                No usage or payments recorded yet
                              </td>
                            </tr>
                          ) : billing.periods.map((p, i) => (
                            <tr key={p.start} style={i === 0 ? { ...styles.tr, background: 'rgba(29,158,117,0.1)' } : styles.tr}>
                              <td style={{ ...styles.td, fontWeight: i === 0 ? 700 : 400 }}>
                                <span style={{ whiteSpace: 'nowrap' }}>{formatDay(p.start)} –</span> <span style={{ whiteSpace: 'nowrap' }}>{formatDay(p.end)}</span>{i === 0 ? ' (current)' : ''}
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>{formatNum(p.questions)}</td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>{formatNum(p.tokens)}</td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>{formatUsd(p.cost)}</td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>{p.payments ? formatUsd(p.payments) : '—'}</td>
                              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: p.balance < 0 ? '#ef5350' : '#5ecda4' }}>{formatUsd(p.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.4)', marginTop: 8, marginBottom: 32, lineHeight: 1.5 }}>
                        Balance = credit payments minus VAiR&apos;s tracked cost. It can differ from the Anthropic console: questions asked before token tracking began (Aug 4, 2026) and any other use of the API key aren&apos;t counted. Add a negative adjustment payment to line it up with the console.
                      </div>

                      <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 12 }}>
                        💳 API Credit Payments <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(232,245,233,0.5)' }}>· estimated balance {formatUsd(balance)}</span>
                      </h3>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={fieldStyle} />
                        <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount (USD, before tax)" style={{ ...fieldStyle, width: 190 }} />
                        <input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Note (e.g. extra credits)" style={{ ...fieldStyle, flex: '1 1 160px' }} />
                        <button
                          onClick={addPayment}
                          disabled={billingSaving || !payDate || !Number(payAmount)}
                          style={{ ...styles.button, padding: '8px 16px', fontSize: 13, opacity: billingSaving || !payDate || !Number(payAmount) ? 0.5 : 1 }}
                        >
                          Add payment
                        </button>
                      </div>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Date</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                            <th style={styles.th}>Note</th>
                            <th style={styles.th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {billing.payments.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                                No credit payments added yet
                              </td>
                            </tr>
                          ) : [...billing.payments].reverse().map(p => (
                            <tr key={p.id} style={styles.tr}>
                              <td style={styles.td}>{formatDay(p.paid_on)}</td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>{formatUsd(Number(p.amount))}</td>
                              <td style={{ ...styles.td, color: 'rgba(232,245,233,0.7)' }}>{p.note || '—'}</td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>
                                <button
                                  onClick={() => updateBilling({ action: 'delete_payment', id: p.id })}
                                  disabled={billingSaving}
                                  style={{ background: 'transparent', border: '1px solid rgba(232,245,233,0.25)', borderRadius: 8, color: 'rgba(232,245,233,0.7)', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}

        {/* Access Requests Tab */}
        {activeTab === 'requests' && (() => {
          const pending = accessRequests.filter(r => r.status === 'pending');
          const activated = accessRequests.filter(r => r.status === 'activated');
          const notConnected = activated.filter(r => !r.last_sign_in_at);
          const smallBtn = { ...styles.button, padding: '6px 14px', fontSize: 13 };
          const ghostBtn = { background: 'transparent', border: '1px solid rgba(232,245,233,0.25)', borderRadius: 8, color: 'rgba(232,245,233,0.7)', fontSize: 13, padding: '6px 12px', cursor: 'pointer' };
          const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');
          return (
            <>
              <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 6 }}>
                📥 Access requests
              </h3>
              <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.5)', marginBottom: 20, lineHeight: 1.5 }}>
                People who filled in the Sign Up form (each request is also emailed to vaireferee@gmail.com).
                <strong style={{ color: 'rgba(232,245,233,0.8)' }}> Activate</strong> creates their account and emails them a
                link to create their password. <strong style={{ color: 'rgba(232,245,233,0.8)' }}>Remind</strong> sends a fresh
                link to anyone who hasn't connected yet.
              </div>

              {requestResult && (
                <div style={{ marginBottom: 16 }}>
                  {requestResult.sent.length > 0 && (
                    <div style={{ ...styles.note, background: 'rgba(29,158,117,0.1)', borderColor: 'rgba(29,158,117,0.3)', color: '#5ecda4', marginBottom: 8 }}>
                      ✅ {requestResult.verb} {requestResult.sent.join(', ')}
                    </div>
                  )}
                  {requestResult.failed.map((f, i) => (
                    <div key={i} style={{ ...styles.error, marginBottom: 8 }}>
                      ❌ {f.email ? `${f.email}: ` : ''}{f.error}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <h3 style={{ color: '#5ecda4', fontSize: 15, margin: 0 }}>Pending ({pending.length})</h3>
                {pending.length > 1 && (
                  <button style={smallBtn} onClick={() => handleRequestAction('activate_request', pending.slice(0, 50).map(r => r.id))}>
                    Activate all{pending.length > 50 ? ' (first 50)' : ''}
                  </button>
                )}
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Requested</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {requestsLoading && accessRequests.length === 0 ? (
                    <tr><td colSpan="4" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>Loading requests…</td></tr>
                  ) : pending.length === 0 ? (
                    <tr><td colSpan="4" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>No pending requests</td></tr>
                  ) : (
                    pending.map(r => (
                      <tr key={r.id} style={styles.tr}>
                        <td style={styles.td}>{r.first_name} {r.last_name}</td>
                        <td style={styles.td}>{r.email}</td>
                        <td style={styles.td}>{fmt(r.created_at)}</td>
                        <td style={{ ...styles.td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button
                            style={{ ...smallBtn, marginRight: 8, opacity: requestBusy[r.id] ? 0.5 : 1 }}
                            disabled={!!requestBusy[r.id]}
                            onClick={() => handleRequestAction('activate_request', [r.id])}
                          >
                            {requestBusy[r.id] ? 'Working…' : 'Activate'}
                          </button>
                          <button
                            style={{ ...ghostBtn, opacity: requestBusy[r.id] ? 0.5 : 1 }}
                            disabled={!!requestBusy[r.id]}
                            onClick={() => handleRequestAction('reject_request', [r.id])}
                          >
                            Dismiss
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '28px 0 12px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#5ecda4', fontSize: 15, margin: 0 }}>
                  Activated ({activated.length}) — {notConnected.length} not connected yet
                </h3>
                {notConnected.length > 1 && (
                  <button style={smallBtn} onClick={() => handleRequestAction('remind_request', notConnected.slice(0, 50).map(r => r.id))}>
                    Remind all not connected{notConnected.length > 50 ? ' (first 50)' : ''}
                  </button>
                )}
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Activated</th>
                    <th style={styles.th}>Last emailed</th>
                    <th style={styles.th}>Connected</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {activated.length === 0 ? (
                    <tr><td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>No activated requests yet</td></tr>
                  ) : (
                    activated.map(r => (
                      <tr key={r.id} style={styles.tr}>
                        <td style={styles.td}>{r.first_name} {r.last_name}</td>
                        <td style={styles.td}>{r.email}</td>
                        <td style={styles.td}>{fmt(r.activated_at)}</td>
                        <td style={styles.td} title={r.email_count ? `${r.email_count} email${r.email_count === 1 ? '' : 's'} sent` : ''}>
                          {fmt(r.last_emailed_at)}
                        </td>
                        <td style={{ ...styles.td, color: r.last_sign_in_at ? '#5ecda4' : '#ffc107' }}>
                          {r.last_sign_in_at ? `✅ ${fmt(r.last_sign_in_at)}` : 'Not yet'}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          {!r.last_sign_in_at && (
                            <button
                              style={{ ...smallBtn, opacity: requestBusy[r.id] ? 0.5 : 1 }}
                              disabled={!!requestBusy[r.id]}
                              onClick={() => handleRequestAction('remind_request', [r.id])}
                            >
                              {requestBusy[r.id] ? 'Sending…' : 'Remind'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          );
        })()}

        {/* Invite Testers Tab */}
        {activeTab === 'invites' && (
          <>
            <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 6 }}>
              ✉️ Invite beta testers
            </h3>
            <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.5)', marginBottom: 20, lineHeight: 1.5 }}>
              Sends a personal "you've been hand-picked" invitation that walks through everything VAiR can do
              and asks for feedback. Addresses without an account get one, with a personal link to create their
              password. Replies come straight back to your email. Each recipient gets their own email — they
              never see each other's addresses.
            </div>

            <div style={{ ...styles.form, marginBottom: 28 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(232,245,233,0.7)' }}>
                Email addresses (one per line, or separated by commas)
                <textarea
                  value={inviteEmails}
                  onChange={e => setInviteEmails(e.target.value)}
                  rows={4}
                  placeholder={'jane.ref@example.com\nmark@example.com'}
                  style={{ ...styles.input, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(232,245,233,0.7)' }}>
                First name (optional — only used when inviting one person)
                <input
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  disabled={parsedInviteEmails.length > 1}
                  placeholder={parsedInviteEmails.length > 1 ? 'Multiple recipients — greeting will be "Hi there"' : 'e.g. Jane'}
                  style={{ ...styles.input, fontSize: 14, opacity: parsedInviteEmails.length > 1 ? 0.5 : 1 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(232,245,233,0.7)' }}>
                Personal note (optional — shown highlighted near the top of the email)
                <textarea
                  value={inviteNote}
                  onChange={e => setInviteNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="e.g. Great working your game last Saturday — would love your take on this."
                  style={{ ...styles.input, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  onClick={handleSendInvites}
                  disabled={inviteSending || parsedInviteEmails.length === 0}
                  style={{
                    ...styles.button,
                    padding: '10px 24px',
                    fontSize: 14,
                    opacity: inviteSending || parsedInviteEmails.length === 0 ? 0.5 : 1,
                    cursor: inviteSending || parsedInviteEmails.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {inviteSending
                    ? 'Sending…'
                    : `Send ${parsedInviteEmails.length || ''} invite${parsedInviteEmails.length === 1 ? '' : 's'}`}
                </button>
                <span style={{ fontSize: 12, color: 'rgba(232,245,233,0.4)' }}>Up to 50 at a time</span>
              </div>

              {inviteResult && (
                <div>
                  {inviteResult.sent.length > 0 && (
                    <div style={{ ...styles.note, background: 'rgba(29,158,117,0.1)', borderColor: 'rgba(29,158,117,0.3)', color: '#5ecda4', marginBottom: 8 }}>
                      ✅ Sent to {inviteResult.sent.join(', ')}
                    </div>
                  )}
                  {inviteResult.failed.map((f, i) => (
                    <div key={i} style={{ ...styles.error, marginBottom: 8 }}>
                      ❌ {f.email ? `${f.email}: ` : ''}{f.error}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 12 }}>
              Sent invites
            </h3>
            {invitesLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'rgba(232,245,233,0.6)' }}>Loading invites…</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                        No invites sent yet
                      </td>
                    </tr>
                  ) : (
                    invites.map(inv => (
                      <tr key={inv.id} style={styles.tr}>
                        <td style={styles.td}>{inv.email}</td>
                        <td style={styles.td}>{inv.recipient_name || '—'}</td>
                        <td style={{ ...styles.td, color: inv.status === 'sent' ? '#5ecda4' : '#ef5350' }} title={inv.error || ''}>
                          {inv.status === 'sent' ? '✅ Sent' : '❌ Failed'}
                        </td>
                        <td style={styles.td}>{new Date(inv.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (() => {
          const selectedCount = Object.keys(reminderSelected).length;
          const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
          const pillBtn = { background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 999, color: '#5ecda4', fontSize: 12, padding: '5px 12px', cursor: 'pointer' };
          return (
            <>
              <h3 style={{ color: '#5ecda4', fontSize: 16, marginBottom: 6 }}>
                🔔 Remind users to come back
              </h3>
              <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.5)', marginBottom: 20, lineHeight: 1.5 }}>
                Sends a "What's new in VAiR" email: the Misconduct Report Builder, the 2026/27 Laws update and
                National 1 League rules, with a button to log in and a request for feedback. Replies come straight
                back to your email. End-dated accounts are left out.
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button style={pillBtn} onClick={() => selectReminderUsers(() => true)}>Select all ({remindableUsers.length})</button>
                <button style={pillBtn} onClick={() => selectReminderUsers(u => !u.last_sign_in_at || new Date(u.last_sign_in_at).getTime() < fourteenDaysAgo)}>
                  Not logged in for 14+ days
                </button>
                <button style={pillBtn} onClick={() => selectReminderUsers(u => !lastRemindedAt[u.email?.toLowerCase()])}>
                  Never reminded
                </button>
                <button style={pillBtn} onClick={() => setReminderSelected({})}>Clear</button>
              </div>

              <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 10, marginBottom: 16 }}>
                <table style={{ ...styles.table, marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 36 }}></th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Last Sign In</th>
                      <th style={styles.th}>Last Reminded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remindableUsers.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ ...styles.td, textAlign: 'center', color: 'rgba(232,245,233,0.5)' }}>
                          No active users
                        </td>
                      </tr>
                    ) : (
                      remindableUsers.map(u => {
                        const reminded = lastRemindedAt[u.email?.toLowerCase()];
                        return (
                          <tr key={u.id} style={{ ...styles.tr, cursor: 'pointer' }} onClick={() => toggleReminderUser(u.id)}>
                            <td style={styles.td}>
                              <input type="checkbox" checked={!!reminderSelected[u.id]} readOnly style={{ accentColor: '#1d9e75', cursor: 'pointer' }} />
                            </td>
                            <td style={styles.td}>{u.email}</td>
                            <td style={styles.td}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}</td>
                            <td style={{ ...styles.td, color: reminded ? '#e8f5e9' : 'rgba(232,245,233,0.4)' }}>
                              {reminded ? new Date(reminded).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ ...styles.form, marginBottom: 28 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'rgba(232,245,233,0.7)' }}>
                  Personal note (optional — shown highlighted near the top of the email)
                  <textarea
                    value={reminderNote}
                    onChange={e => setReminderNote(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="e.g. We'd love you to try the new report builder after your game this weekend."
                    style={{ ...styles.input, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    onClick={handleSendReminders}
                    disabled={reminderSending || selectedCount === 0}
                    style={{
                      ...styles.button,
                      padding: '10px 24px',
                      fontSize: 14,
                      opacity: reminderSending || selectedCount === 0 ? 0.5 : 1,
                      cursor: reminderSending || selectedCount === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {reminderSending
                      ? 'Sending…'
                      : `Send reminder${selectedCount === 1 ? '' : 's'}${selectedCount ? ` to ${selectedCount}` : ''}`}
                  </button>
                  <span style={{ fontSize: 12, color: 'rgba(232,245,233,0.4)' }}>Up to 50 at a time</span>
                </div>

                {reminderResult && (
                  <div>
                    {reminderResult.sent.length > 0 && (
                      <div style={{ ...styles.note, background: 'rgba(29,158,117,0.1)', borderColor: 'rgba(29,158,117,0.3)', color: '#5ecda4', marginBottom: 8 }}>
                        ✅ Sent to {reminderResult.sent.join(', ')}
                      </div>
                    )}
                    {reminderResult.failed.map((f, i) => (
                      <div key={i} style={{ ...styles.error, marginBottom: 8 }}>
                        ❌ {f.email ? `${f.email}: ` : ''}{f.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {remindersLoading && (
                <div style={{ textAlign: 'center', padding: 12, color: 'rgba(232,245,233,0.6)', fontSize: 13 }}>Loading reminder history…</div>
              )}
            </>
          );
        })()}
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
    flexWrap: 'wrap',
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
