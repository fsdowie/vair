import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

const EDGE_BASE = 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1';

// Pixel bounds of the green pitch area within fieldlayout.png (324x417),
// measured from the source image — the number row (1-9) sits above the
// pitch and the letter column (a-i) sits to its right, both outside these
// bounds. Expressed as fractions so they still work at any rendered size.
const PITCH_LEFT_FRAC = 1 / 324;
const PITCH_RIGHT_FRAC = 302 / 324;
const PITCH_TOP_FRAC = 26 / 417;
const PITCH_BOTTOM_FRAC = 415 / 417;
const ROWS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

function zoneDescription(col, rowLetter) {
  const rowIdx = ROWS.indexOf(rowLetter);
  const third = rowIdx <= 2
    ? 'attacking third (near the Offensive End)'
    : rowIdx <= 5
      ? 'middle third, near midfield'
      : 'defensive third (near the Defensive End)';
  const side = col <= 3 ? 'left side' : col <= 6 ? 'central' : 'right side';
  return `${third}, ${side}`;
}

const REASONS = {
  player: {
    caution: [
      'Unsporting Behaviour',
      'Dissent (word or action)',
      'Persistent Infringement',
      'Delaying the Restart of Play',
      'Failure to Respect Required Distance',
      'Entering/Leaving the Field Without Permission',
      'Other (Referee Review Area / VAR signal misuse)',
    ],
    send_off: [
      'Serious Foul Play',
      'Violent Conduct',
      'Biting or Spitting',
      'Denying an Obvious Goal-Scoring Opportunity (Handball)',
      'Denying an Obvious Goal-Scoring Opportunity (Foul)',
      'Offensive, Insulting, or Abusive Language/Gestures',
      'Second Caution (Two Yellow Cards)',
    ],
  },
  team_official: {
    caution: [
      'Not Respecting the Technical Area',
      'Delaying the Restart of Play',
      'Dissent (word or action)',
      'Entering the Referee Review Area',
      'Provocative or Inflammatory Behaviour',
      'Persistent Unacceptable Behaviour',
      'Lack of Respect for the Game',
    ],
    send_off: [
      'Entering the Field to Confront an Official or Interfere with Play',
      'Physical or Aggressive Behaviour (incl. spitting/biting)',
      'Offensive, Insulting, or Abusive Language',
      'Violent Conduct',
      'Second Caution (Two Yellow Cards)',
    ],
  },
};

const INPUT = {
  width: '100%', background: 'rgba(10,22,40,0.7)',
  border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8,
  color: '#e8f5e9', fontSize: 13, padding: '9px 12px',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const LABEL = {
  display: 'block', fontSize: 12, color: 'rgba(232,245,233,0.6)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
};

const BLANK = {
  offenderType: 'player',
  offenderName: '',
  team: 'home',
  jerseyNumber: '',
  offense: 'caution',
  reason: '',
  minute: '',
  stoppage: '',
  description: '',
};

export default function MisconductReport() {
  const [session, setSession] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [fieldSpot, setFieldSpot] = useState(null); // { label, zone, xPct, yPct }
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null); // generated report text
  const [genError, setGenError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchHistory();
  }, [session]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('misconduct_reports')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(25);
    if (!error) setHistory(data || []);
    setHistoryLoading(false);
  };

  const deleteReport = async (id) => {
    if (!confirm('Delete this report from your history?')) return;
    await supabase.from('misconduct_reports').delete().eq('id', id);
    await fetchHistory();
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const reasonOptions = REASONS[form.offenderType][form.offense];

  const handleFieldClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xFracImg = (e.clientX - rect.left) / rect.width;
    const yFracImg = (e.clientY - rect.top) / rect.height;
    let xFracPitch = (xFracImg - PITCH_LEFT_FRAC) / (PITCH_RIGHT_FRAC - PITCH_LEFT_FRAC);
    let yFracPitch = (yFracImg - PITCH_TOP_FRAC) / (PITCH_BOTTOM_FRAC - PITCH_TOP_FRAC);
    xFracPitch = Math.min(1, Math.max(0, xFracPitch));
    yFracPitch = Math.min(1, Math.max(0, yFracPitch));
    const col = Math.min(9, Math.max(1, Math.floor(xFracPitch * 9) + 1));
    const rowIdx = Math.min(8, Math.max(0, Math.floor(yFracPitch * 9)));
    const rowLetter = ROWS[rowIdx];
    setFieldSpot({
      label: `${rowLetter.toUpperCase()}${col}`,
      zone: zoneDescription(col, rowLetter),
      xPct: xFracImg * 100,
      yPct: yFracImg * 100,
    });
  };

  const minuteLabel = form.minute
    ? `${form.minute}${form.stoppage ? `+${form.stoppage}` : ''}`
    : '';

  const canGenerate = form.offenderName.trim()
    && form.reason
    && minuteLabel
    && form.description.trim()
    && (form.offenderType !== 'player' || form.jerseyNumber.trim());

  const generateReport = async () => {
    if (!canGenerate || !session) return;
    setGenerating(true);
    setGenError(null);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch(`${EDGE_BASE}/generate-misconduct-report`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offenderType: form.offenderType,
          offenderName: form.offenderName,
          team: form.team,
          jerseyNumber: form.jerseyNumber,
          offense: form.offense,
          reason: form.reason,
          fieldSpot: fieldSpot?.label ?? null,
          fieldZone: fieldSpot?.zone ?? null,
          minute: minuteLabel,
          description: form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data.report);
      await fetchHistory();
    } catch (err) {
      setGenError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const startNew = () => {
    setForm(BLANK);
    setFieldSpot(null);
    setResult(null);
    setGenError(null);
    setCopied(false);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — nothing more we can do here
    }
  };

  const btn = (active) => ({
    background: active ? 'linear-gradient(135deg,#0e7a58,#1d9e75)' : 'rgba(255,255,255,0.06)',
    border: active ? 'none' : '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, color: active ? '#fff' : 'rgba(232,245,233,0.75)',
    fontSize: 13, fontWeight: active ? 600 : 400, padding: '9px 16px', cursor: 'pointer',
    flex: 1,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'transparent', color: '#e8f5e9', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 14px 120px', borderBottom: '1px solid rgba(29,158,117,0.2)', background: 'rgba(10,22,40,0.95)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, background: 'linear-gradient(135deg,#1d9e75,#5ecda4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 2 }}>
          📋 Misconduct Report Builder
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)' }}>
          Answer a few questions, VAIR writes the report and cites the Law
        </p>
      </div>

      <div style={{ flex: 1, padding: '24px 16px', maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Offender type */}
            <div>
              <span style={LABEL}>Offender</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn(form.offenderType === 'player')} onClick={() => setForm(f => ({ ...f, offenderType: 'player', reason: '' }))}>Player</button>
                <button style={btn(form.offenderType === 'team_official')} onClick={() => setForm(f => ({ ...f, offenderType: 'team_official', reason: '', jerseyNumber: '' }))}>Team Official / Coach</button>
              </div>
            </div>

            {/* Name, team, jersey */}
            <div style={{ display: 'grid', gridTemplateColumns: form.offenderType === 'player' ? '2fr 1fr 1fr' : '2fr 1fr', gap: 12 }}>
              <div>
                <span style={LABEL}>Name</span>
                <input style={INPUT} value={form.offenderName} onChange={set('offenderName')} placeholder="e.g. J. Smith" />
              </div>
              <div>
                <span style={LABEL}>Team</span>
                <select style={INPUT} value={form.team} onChange={set('team')}>
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                </select>
              </div>
              {form.offenderType === 'player' && (
                <div>
                  <span style={LABEL}>Jersey #</span>
                  <input style={INPUT} value={form.jerseyNumber} onChange={set('jerseyNumber')} placeholder="e.g. 9" inputMode="numeric" />
                </div>
              )}
            </div>

            {/* Offense */}
            <div>
              <span style={LABEL}>Offense</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn(form.offense === 'caution')} onClick={() => setForm(f => ({ ...f, offense: 'caution', reason: '' }))}>🟨 Caution</button>
                <button style={btn(form.offense === 'send_off')} onClick={() => setForm(f => ({ ...f, offense: 'send_off', reason: '' }))}>🟥 Send-off</button>
              </div>
            </div>

            {/* Reason */}
            <div>
              <span style={LABEL}>Reason</span>
              <select style={INPUT} value={form.reason} onChange={set('reason')}>
                <option value="" disabled>Select a reason…</option>
                {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Field spot */}
            <div>
              <span style={LABEL}>Field Spot {fieldSpot ? `— ${fieldSpot.label} (${fieldSpot.zone})` : '(click the pitch)'}</span>
              <div
                onClick={handleFieldClick}
                style={{ position: 'relative', maxWidth: 260, cursor: 'crosshair', border: '1px solid rgba(29,158,117,0.25)', borderRadius: 8, overflow: 'hidden' }}
              >
                <img ref={imgRef} src="/fieldlayout.png" alt="Field layout grid" style={{ display: 'block', width: '100%' }} draggable={false} />
                {fieldSpot && (
                  <div style={{
                    position: 'absolute', left: `${fieldSpot.xPct}%`, top: `${fieldSpot.yPct}%`,
                    width: 14, height: 14, marginLeft: -7, marginTop: -7,
                    borderRadius: '50%', background: '#ef5350', border: '2px solid #fff',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
                  }} />
                )}
              </div>
            </div>

            {/* Minute */}
            <div>
              <span style={LABEL}>Minute {minuteLabel && `— ${minuteLabel}'`}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 260 }}>
                <input style={{ ...INPUT, width: 90 }} type="number" min={1} max={90} value={form.minute} onChange={set('minute')} placeholder="e.g. 82" />
                <span style={{ fontSize: 13, color: 'rgba(232,245,233,0.5)' }}>+</span>
                <input style={{ ...INPUT, width: 70 }} type="number" min={1} max={15} value={form.stoppage} onChange={set('stoppage')} placeholder="stoppage" />
              </div>
            </div>

            {/* Description */}
            <div>
              <span style={LABEL}>What happened? (plain language — VAIR will rephrase it and cite the Law)</span>
              <textarea
                style={{ ...INPUT, minHeight: 100, resize: 'vertical' }}
                value={form.description}
                onChange={set('description')}
                placeholder="e.g. He slid in late from behind and caught the attacker on the ankle, no attempt to play the ball"
              />
            </div>

            {genError && (
              <div style={{ background: 'rgba(183,28,28,0.15)', border: '1px solid rgba(239,83,80,0.4)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef9a9a' }}>
                {genError}
              </div>
            )}

            <button
              onClick={generateReport}
              disabled={!canGenerate || generating}
              style={{
                background: !canGenerate || generating ? 'rgba(29,158,117,0.2)' : 'linear-gradient(135deg,#0e7a58,#1d9e75)',
                border: 'none', borderRadius: 10, color: !canGenerate || generating ? '#1d9e75' : '#fff',
                fontSize: 15, fontWeight: 600, padding: '13px 20px', cursor: !canGenerate || generating ? 'default' : 'pointer',
              }}
            >
              {generating ? '⏳ Writing report…' : '📝 Generate Report'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(13,33,55,0.6)', border: '1px solid rgba(29,158,117,0.25)', borderRadius: 12, padding: 20, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {result}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => copyToClipboard(result)} style={{ ...btn(true), flex: 'none' }}>
                {copied ? '✅ Copied' : '📋 Copy to Clipboard'}
              </button>
              <button onClick={startNew} style={{ ...btn(false), flex: 'none' }}>+ New Report</button>
            </div>
          </div>
        )}

        {/* History */}
        <div style={{ marginTop: 40, borderTop: '1px solid rgba(29,158,117,0.15)', paddingTop: 20 }}>
          <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(232,245,233,0.5)', marginBottom: 12 }}>
            Past Reports
          </h3>
          {historyLoading ? (
            <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.4)' }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(232,245,233,0.4)' }}>No reports yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(r => (
                <div key={r.id} style={{ background: 'rgba(13,33,55,0.5)', border: '1px solid rgba(29,158,117,0.15)', borderRadius: 10, padding: '12px 14px' }}>
                  <div
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 12 }}
                  >
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.offense === 'send_off' ? '🟥' : '🟨'}{' '}
                      {r.offender_type === 'player' ? `#${r.jersey_number} ` : ''}{r.offender_name} ({r.team}) — {r.minute}'
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(232,245,233,0.4)', whiteSpace: 'nowrap' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {expandedId === r.id && (
                    <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'rgba(232,245,233,0.85)' }}>
                      {r.generated_report}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button onClick={() => copyToClipboard(r.generated_report)} style={{ ...btn(false), flex: 'none', fontSize: 12, padding: '6px 12px' }}>📋 Copy</button>
                        <button onClick={() => deleteReport(r.id)} style={{ ...btn(false), flex: 'none', fontSize: 12, padding: '6px 12px', color: '#ef9a9a' }}>🗑 Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
