import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

const EDGE_BASE = 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1';

const KNOWN_SITES = [
  { label: "The Referee Group",    url: "https://www.therefereegroup.org" },
  { label: "EKC SRA",              url: "https://www.ekcsra.org" },
  { label: "NW Soccer Officials",  url: "https://www.nwsoccerofficials.org" },
];

function CredentialModal({ cred, onClose, onSaved, session }) {
  const isEdit = !!cred;
  const [siteUrl, setSiteUrl] = useState(cred?.site_url ?? KNOWN_SITES[0].url);
  const [siteName, setSiteName] = useState(cred?.site_name ?? KNOWN_SITES[0].label);
  const [username, setUsername] = useState(cred?.username ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSiteSelect = (url) => {
    setSiteUrl(url);
    const known = KNOWN_SITES.find(s => s.url === url);
    if (known) setSiteName(known.label);
  };

  const handleSave = async () => {
    if (!username.trim()) { setError("Username is required."); return; }
    if (!isEdit && !password.trim()) { setError("Password is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const body = { action: 'save', site_url: siteUrl, site_name: siteName, username: username.trim(), password: password || undefined };
      const res = await fetch(`${EDGE_BASE}/manage-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const overlayStyle = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  };
  const boxStyle = {
    background: "#0d1f14", border: "1px solid rgba(76,175,80,0.25)", borderRadius: 14,
    padding: 28, width: "100%", maxWidth: 440, color: "#e8f5e9",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };
  const labelStyle = { display: "block", fontSize: 12, color: "rgba(232,245,233,0.55)", marginBottom: 5, marginTop: 14 };
  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(76,175,80,0.2)",
    borderRadius: 8, color: "#e8f5e9", fontSize: 14, outline: "none",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          {isEdit ? "Edit Connection" : "Add Connection"}
        </div>

        <label style={labelStyle}>Website</label>
        <select
          value={siteUrl}
          onChange={e => handleSiteSelect(e.target.value)}
          style={inputStyle}
          disabled={isEdit}
        >
          {KNOWN_SITES.map(s => (
            <option key={s.url} value={s.url}>{s.label}</option>
          ))}
        </select>

        <label style={labelStyle}>Username</label>
        <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="Your login username" />

        <label style={labelStyle}>Password {isEdit && <span style={{ color: "rgba(232,245,233,0.35)" }}>(leave blank to keep current)</span>}</label>
        <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? "••••••••" : "Your login password"} />

        {error && <div style={{ marginTop: 10, fontSize: 13, color: "#ef9a9a" }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8f5e9", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "8px 20px", background: saving ? "rgba(76,175,80,0.3)" : "rgba(76,175,80,0.8)", border: "none", borderRadius: 8, color: "#fff", cursor: saving ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WebsiteConnections() {
  const [session, setSession] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | { cred }
  const [testing, setTesting] = useState({}); // { [site_url]: 'testing'|'ok'|'fail'|msg }
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchCredentials();
  }, [session]);

  const fetchCredentials = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${EDGE_BASE}/manage-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'list' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCredentials(data.credentials || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (siteUrl) => {
    if (!window.confirm("Remove this connection?")) return;
    setDeleting(siteUrl);
    try {
      const res = await fetch(`${EDGE_BASE}/manage-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'delete', site_url: siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setCredentials(prev => prev.filter(c => c.site_url !== siteUrl));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleTest = async (siteUrl) => {
    setTesting(prev => ({ ...prev, [siteUrl]: 'testing' }));
    try {
      const res = await fetch(`${EDGE_BASE}/manage-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'test', site_url: siteUrl }),
      });
      const data = await res.json();
      setTesting(prev => ({ ...prev, [siteUrl]: data.success ? 'ok' : (data.error || 'fail') }));
    } catch (e) {
      setTesting(prev => ({ ...prev, [siteUrl]: e.message }));
    }
  };

  const connectedUrls = new Set(credentials.map(c => c.site_url));
  const availableSites = KNOWN_SITES.filter(s => !connectedUrls.has(s.url));

  const pageStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1e0f 100%)",
    color: "#e8f5e9",
    fontFamily: "system-ui, -apple-system, sans-serif",
    padding: "24px 16px 40px",
  };

  const cardStyle = {
    background: "rgba(13,31,20,0.6)",
    border: "1px solid rgba(76,175,80,0.18)",
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
  };

  const badgeStyle = (ok) => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: ok ? "rgba(76,175,80,0.18)" : "rgba(239,154,154,0.18)",
    color: ok ? "#81c784" : "#ef9a9a",
    border: `1px solid ${ok ? "rgba(76,175,80,0.35)" : "rgba(239,154,154,0.35)"}`,
  });

  if (!session) {
    return (
      <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(232,245,233,0.5)", fontSize: 15 }}>
          Please log in to manage website connections.
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28, paddingTop: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(135deg,#4caf50,#81c784)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Website Connections
          </h1>
          <p style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", marginTop: 6, marginBottom: 0 }}>
            Connect your referee assignment websites so VAIR can automatically sync your games.
          </p>
        </div>

        {/* Add button */}
        {availableSites.length > 0 && (
          <button
            onClick={() => setModal('add')}
            style={{
              marginBottom: 20, padding: "9px 18px",
              background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.35)",
              borderRadius: 10, color: "#81c784", cursor: "pointer", fontSize: 14, fontWeight: 600,
            }}
          >
            + Add Connection
          </button>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,154,154,0.1)", border: "1px solid rgba(239,154,154,0.3)", borderRadius: 8, color: "#ef9a9a", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(232,245,233,0.4)", fontSize: 14 }}>
            Loading…
          </div>
        )}

        {/* Credentials list */}
        {!loading && credentials.length === 0 && (
          <div style={{ ...cardStyle, textAlign: "center", color: "rgba(232,245,233,0.4)", fontSize: 14, padding: 36 }}>
            No connections yet. Add one to start syncing your games.
          </div>
        )}

        {credentials.map(cred => {
          const testResult = testing[cred.site_url];
          const isTesting = testResult === 'testing';
          const testOk = testResult === 'ok';
          const testFail = testResult && testResult !== 'testing' && testResult !== 'ok';
          const lastSync = cred.last_scraped_at
            ? new Date(cred.last_scraped_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : null;
          const hasError = !!cred.last_error;

          return (
            <div key={cred.site_url} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{cred.site_name}</span>
                    {lastSync && !hasError && <span style={badgeStyle(true)}>Synced</span>}
                    {hasError && <span style={badgeStyle(false)}>Error</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(232,245,233,0.4)", marginTop: 2 }}>
                    {cred.site_url}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(232,245,233,0.45)", marginTop: 3 }}>
                    Username: <span style={{ color: "rgba(232,245,233,0.7)" }}>{cred.username}</span>
                  </div>
                  {lastSync && (
                    <div style={{ fontSize: 12, color: "rgba(232,245,233,0.35)", marginTop: 2 }}>
                      Last sync: {lastSync}
                    </div>
                  )}
                  {hasError && (
                    <div style={{ fontSize: 12, color: "#ef9a9a", marginTop: 4, wordBreak: "break-word" }}>
                      {cred.last_error}
                    </div>
                  )}
                  {testResult && testResult !== 'testing' && (
                    <div style={{ fontSize: 12, marginTop: 6, color: testOk ? "#81c784" : "#ef9a9a" }}>
                      {testOk ? "✓ Login successful" : `✗ ${testResult}`}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleTest(cred.site_url)}
                    disabled={isTesting}
                    style={{ padding: "5px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: "rgba(232,245,233,0.75)", cursor: isTesting ? "default" : "pointer", fontSize: 12 }}
                  >
                    {isTesting ? "Testing…" : "Test"}
                  </button>
                  <button
                    onClick={() => setModal({ cred })}
                    style={{ padding: "5px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: "rgba(232,245,233,0.75)", cursor: "pointer", fontSize: 12 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cred.site_url)}
                    disabled={deleting === cred.site_url}
                    style={{ padding: "5px 12px", background: "rgba(239,154,154,0.08)", border: "1px solid rgba(239,154,154,0.2)", borderRadius: 7, color: "#ef9a9a", cursor: deleting === cred.site_url ? "default" : "pointer", fontSize: 12 }}
                  >
                    {deleting === cred.site_url ? "…" : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Unconnected sites info */}
        {!loading && availableSites.length > 0 && credentials.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "rgba(232,245,233,0.35)", marginBottom: 10 }}>Not yet connected:</div>
            {availableSites.map(s => (
              <div key={s.url} style={{ ...cardStyle, opacity: 0.5, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(232,245,233,0.4)" }}>{s.url}</div>
                </div>
                <button
                  onClick={() => setModal('add')}
                  style={{ padding: "5px 12px", background: "rgba(76,175,80,0.1)", border: "1px solid rgba(76,175,80,0.25)", borderRadius: 7, color: "#81c784", cursor: "pointer", fontSize: 12 }}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sync info note */}
        <div style={{ marginTop: 24, padding: "12px 16px", background: "rgba(76,175,80,0.05)", border: "1px solid rgba(76,175,80,0.12)", borderRadius: 10, fontSize: 12, color: "rgba(232,245,233,0.4)", lineHeight: 1.6 }}>
          Games are synced automatically at <strong style={{ color: "rgba(232,245,233,0.6)" }}>10 AM, 5 PM, and 10 PM PST</strong> daily. You can also trigger a manual sync from the Games Organizer page.
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <CredentialModal
          cred={modal === 'add' ? null : modal.cred}
          session={session}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchCredentials(); }}
        />
      )}
    </div>
  );
}
