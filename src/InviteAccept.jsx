import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const EDGE_BASE = 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn';

// Landing page for the button in Admin-sent invitations
// (vaireferee.com/?invite=<token>). Invited people are pre-approved: the form
// comes pre-filled from the invitation, and submitting it creates the account
// (accept-invite edge function) and signs them straight in.
async function callAcceptInvite(body) {
  const res = await fetch(`${EDGE_BASE}/accept-invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

const inputStyle = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid rgba(29,158,117,0.3)",
  background: "rgba(10,30,15,0.5)",
  color: "#e8f5e9",
  fontSize: 16,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "rgba(232,245,233,0.6)", flex: 1, minWidth: 0 };

const primaryBtn = (busy) => ({
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: busy ? "rgba(29,158,117,0.2)" : "linear-gradient(135deg, #0e7a58, #0a5c43)",
  color: busy ? "#1d9e75" : "#e8f5e9",
  fontSize: 16,
  fontWeight: "bold",
  cursor: busy ? "default" : "pointer",
});

export default function InviteAccept({ token, onDone }) {
  const [status, setStatus] = useState('loading'); // loading | open | done | error
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [message, setMessage] = useState(null); // shown for error / already-used states
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    callAcceptInvite({ action: 'lookup', token })
      .then((d) => {
        setEmail(d.email);
        if (d.status === 'open') {
          setFirstName(d.first_name || '');
          setLastName(d.last_name || '');
          setStatus('open');
        } else {
          setMessage(`This invite has already been used — log in with ${d.email} and your password.`);
          setStatus('done');
        }
      })
      .catch((err) => {
        setMessage(err.message);
        setStatus('error');
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
    if (password !== password2) { setFormError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await callAcceptInvite({ action: 'accept', token, first_name: firstName, last_name: lastName, phone, password });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onDone();
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628, #0d2137)",
      color: "#e8f5e9",
      padding: 20,
      boxSizing: "border-box",
    }}>
      <div style={{
        background: "rgba(13, 33, 55, 0.8)",
        borderRadius: 16,
        padding: "32px 28px",
        maxWidth: 440,
        width: "100%",
        border: "1px solid rgba(29,158,117,0.3)",
        boxSizing: "border-box",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src="/vair-logo.svg" alt="VAiR logo" style={{ width: 200, maxWidth: "100%" }} />
        </div>

        {status === 'loading' && (
          <div style={{ textAlign: "center", color: "rgba(232,245,233,0.6)" }}>Loading your invite…</div>
        )}

        {(status === 'error' || status === 'done') && (
          <>
            <div style={{
              padding: 16,
              borderRadius: 8,
              background: status === 'error' ? "rgba(211,47,47,0.1)" : "rgba(29,158,117,0.1)",
              border: `1px solid ${status === 'error' ? "rgba(211,47,47,0.3)" : "rgba(29,158,117,0.3)"}`,
              color: status === 'error' ? "#ef5350" : "#5ecda4",
              fontSize: 14,
              lineHeight: 1.5,
              marginBottom: 16,
            }}>
              {message}
            </div>
            <button onClick={onDone} style={{ ...primaryBtn(false), width: "100%" }}>Go to login</button>
          </>
        )}

        {status === 'open' && (
          <>
            <h2 style={{ textAlign: "center", fontSize: 19, color: "#5ecda4", margin: "0 0 6px" }}>
              Welcome to VAiR{firstName ? `, ${firstName}` : ''}!
            </h2>
            <p style={{ textAlign: "center", fontSize: 13, color: "rgba(232,245,233,0.55)", margin: "0 0 22px", lineHeight: 1.5 }}>
              You've been invited — no approval needed. Check your details and create a password to get started.
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <label style={labelStyle}>
                  First name
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Last name (optional)
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" style={inputStyle} />
                </label>
              </div>
              <label style={labelStyle}>
                Email
                <input value={email} readOnly autoComplete="username" style={{ ...inputStyle, opacity: 0.65, cursor: "not-allowed" }} />
              </label>
              <label style={labelStyle}>
                Phone (optional)
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+1 555 000 0000" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Create a password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="At least 6 characters" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Confirm password
                <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required autoComplete="new-password" style={inputStyle} />
              </label>
              {formError && (
                <div style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(211,47,47,0.1)",
                  border: "1px solid rgba(211,47,47,0.3)",
                  color: "#ef5350",
                  fontSize: 14,
                }}>
                  {formError}
                </div>
              )}
              <button type="submit" disabled={saving} style={primaryBtn(saving)}>
                {saving ? "Creating your account…" : "Create password & get started"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
