import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

const EDGE_BASE = 'https://iunehbdazfzgfclkvvgd.supabase.co/functions/v1';

const today = () => new Date().toISOString().split('T')[0];

const INPUT = {
  width: '100%', background: 'rgba(10,22,40,0.7)',
  border: '1px solid rgba(29,158,117,0.3)', borderRadius: 8,
  color: '#e8f5e9', fontSize: 13, padding: '8px 12px',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const COLS = ['Date', 'Time', 'League', 'Level', 'G', 'Field', 'Home', 'Away', 'Ref', 'AR1', 'AR2'];
const BLANK = {
  date: '', time: '', league: '', division: '', level: '', gender: '', field: '',
  home_team: '', away_team: '', referee: '', ar1: '', ar2: '',
  client: '', season: '', area: '', match_id: '',
  description: '', score_home: '', score_away: '',
  half_duration: '', halftime_duration: '', comments: '',
};

export default function GamesOrganizer() {
  const [view, setView] = useState('future');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchGames();
  }, [session, view]);

  const fetchGames = async () => {
    setLoading(true);
    const t = today();
    const query = supabase
      .from('games').select('*').eq('user_id', session.user.id)
      .order('date', { ascending: view === 'future' })
      .order('time', { ascending: true });
    const { data, error } = view === 'future'
      ? await query.gte('date', t) : await query.lt('date', t);
    if (!error) setGames(data || []);
    setLoading(false);
  };

  const openAdd = () => { setForm(BLANK); setShowForm(true); };
  const openEdit = (game) => {
    setForm({
      date: game.date || '', time: game.time?.slice(0, 5) || '',
      league: game.league || '', division: game.division || '',
      level: game.level || '', gender: game.gender || '',
      field: game.field || '', home_team: game.home_team || '',
      away_team: game.away_team || '', referee: game.referee || '',
      ar1: game.ar1 || '', ar2: game.ar2 || '',
      client: game.client || '', season: game.season || '',
      area: game.area || '', match_id: game.match_id || '',
      description: game.description || '',
      score_home: game.score_home ?? '', score_away: game.score_away ?? '',
      half_duration: game.half_duration ?? '', halftime_duration: game.halftime_duration ?? '',
      comments: game.comments || '',
      _id: game.id,
    });
    setShowForm(true);
  };

  const saveGame = async () => {
    if (!form.date) return;
    setSaving(true);
    const payload = {
      user_id: session.user.id,
      date: form.date, time: form.time ? form.time + ':00' : null,
      league: form.league || null, division: form.division || null,
      level: form.level || null, gender: form.gender || null,
      field: form.field || null, home_team: form.home_team || null,
      away_team: form.away_team || null, referee: form.referee || null,
      ar1: form.ar1 || null, ar2: form.ar2 || null,
      client: form.client || null, season: form.season || null,
      area: form.area || null, match_id: form.match_id || null,
      description: form.description || null,
      score_home: form.score_home !== '' ? parseInt(form.score_home) : null,
      score_away: form.score_away !== '' ? parseInt(form.score_away) : null,
      half_duration: form.half_duration !== '' ? parseInt(form.half_duration) : null,
      halftime_duration: form.halftime_duration !== '' ? parseInt(form.halftime_duration) : null,
      comments: form.comments || null,
      updated_at: new Date().toISOString(),
    };
    if (form._id) {
      await supabase.from('games').update(payload).eq('id', form._id);
    } else {
      await supabase.from('games').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    await fetchGames();
  };

  const saveDetails = async (game, description, scoreHome, scoreAway) => {
    await supabase.from('games').update({
      description: description || null,
      score_home: scoreHome !== '' ? parseInt(scoreHome) : null,
      score_away: scoreAway !== '' ? parseInt(scoreAway) : null,
    }).eq('id', game.id);
    await fetchGames();
    setSelected(null);
  };

  const deleteGame = async (id) => {
    if (!confirm('Delete this game?')) return;
    await supabase.from('games').delete().eq('id', id);
    await fetchGames();
    setSelected(null);
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
  };
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'pm' : 'am'}`;
  };

  const btnStyle = (active) => ({
    background: active ? 'linear-gradient(135deg,#0e7a58,#1d9e75)' : 'rgba(255,255,255,0.06)',
    border: 'none', borderRadius: 8, color: active ? '#fff' : 'rgba(232,245,233,0.7)',
    fontSize: 13, fontWeight: active ? 600 : 400, padding: '8px 18px', cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: "transparent", color: '#e8f5e9', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 14px 120px', borderBottom: '1px solid rgba(29,158,117,0.2)', background: 'rgba(10,22,40,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, background: 'linear-gradient(135deg,#1d9e75,#5ecda4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 2 }}>
            📅 Games Organizer
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)' }}>Your assigned matches</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={btnStyle(view === 'future')} onClick={() => setView('future')}>⏭ Future</button>
          <button style={btnStyle(view === 'past')} onClick={() => setView('past')}>⏮ Past</button>
          <button onClick={() => setShowUpload(true)} style={{ ...btnStyle(false), background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)' }}>📤 Upload Game</button>
          <button onClick={openAdd} style={{ ...btnStyle(false), background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>+ Add Manually</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto', padding: '16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(232,245,233,0.4)' }}>Loading…</div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(232,245,233,0.4)' }}>
            No {view} games found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {COLS.map(c => (
                  <th key={c} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid rgba(29,158,117,0.25)', color: '#1d9e75', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
                <th style={{ padding: '8px 10px', borderBottom: '2px solid rgba(29,158,117,0.25)' }}></th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid rgba(29,158,117,0.08)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(29,158,117,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelected(g)}
                >
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: '#5ecda4' }}>{formatDate(g.date)}</td>
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: 'rgba(232,245,233,0.6)' }}>{formatTime(g.time)}</td>
                  <td style={{ padding: '9px 10px' }}>{g.league || '—'}</td>
                  <td style={{ padding: '9px 10px' }}>{g.level || '—'}</td>
                  <td style={{ padding: '9px 10px' }}>{g.gender || '—'}</td>
                  <td style={{ padding: '9px 10px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.field || '—'}</td>
                  <td style={{ padding: '9px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.home_team || '—'}</td>
                  <td style={{ padding: '9px 10px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.away_team || '—'}</td>
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>{g.referee || '—'}</td>
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: 'rgba(232,245,233,0.6)' }}>{g.ar1 || '—'}</td>
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: 'rgba(232,245,233,0.6)' }}>{g.ar2 || '—'}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(g); }} style={{ background: 'none', border: 'none', color: 'rgba(232,245,233,0.4)', cursor: 'pointer', fontSize: 14 }} title="Edit">✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <GameDetailModal game={selected} onClose={() => setSelected(null)}
          onSave={saveDetails} onEdit={() => { openEdit(selected); setSelected(null); }}
          onDelete={() => deleteGame(selected.id)} formatDate={formatDate} formatTime={formatTime} />
      )}
      {showForm && (
        <GameFormModal form={form} setForm={setForm} onClose={() => setShowForm(false)}
          onSave={saveGame} saving={saving} isEdit={!!form._id} />
      )}
      {showUpload && session && (
        <UploadGameModal session={session} onClose={() => setShowUpload(false)}
          onSaved={() => { setShowUpload(false); fetchGames(); }} />
      )}
    </div>
  );
}

/* ── Upload Game Modal ─────────────────────────────────────── */
function UploadGameModal({ session, onClose, onSaved }) {
  const [stage, setStage] = useState('upload'); // 'upload' | 'review'
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mediaType, setMediaType] = useState('image/png');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileInputRef = useRef();

  const loadFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    loadFile(e.dataTransfer.files[0]);
  };

  const handleExtract = async () => {
    if (!imageBase64) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch(`${EDGE_BASE}/extract-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Extraction failed');
      const g = data.game;
      setForm(prev => ({
        ...prev,
        match_id:   g.match_number || '',
        date:       g.date        || '',
        time:       g.time        || '',
        field:      g.field       || '',
        gender:     g.gender      || '',
        level:      g.level       || '',
        league:     g.league      || '',
        division:   g.division    || '',
        client:     g.client      || '',
        season:     g.season      || '',
        area:       g.area        || '',
        home_team:  g.home_team   || '',
        away_team:  g.away_team   || '',
        referee:    g.referee     || '',
        ar1:        g.ar1         || '',
        ar2:        g.ar2         || '',
      }));
      setStage('review');
    } catch (e) {
      setExtractError(e.message);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.half_duration || !form.halftime_duration) {
      setSubmitError('Half duration and halftime duration are required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.from('games').insert({
        user_id: session.user.id,
        match_id: form.match_id || null,
        source_site: 'therefereegroup.org',
        date: form.date, time: form.time ? form.time + ':00' : null,
        league: form.league || null, division: form.division || null,
        level: form.level || null, gender: form.gender || null,
        field: form.field || null, home_team: form.home_team || null,
        away_team: form.away_team || null, referee: form.referee || null,
        ar1: form.ar1 || null, ar2: form.ar2 || null,
        client: form.client || null, season: form.season || null,
        area: form.area || null,
        half_duration: parseInt(form.half_duration),
        halftime_duration: parseInt(form.halftime_duration),
        comments: form.comments || null,
      });
      if (error) throw error;
      onSaved();
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const overlay = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const box = { background: '#0d2137', border: '1px solid rgba(29,158,117,0.25)', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' };
  const lbl = (text, req) => (
    <label style={{ fontSize: 11, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>
      {text}{req && <span style={{ color: '#ef9a9a' }}> *</span>}
    </label>
  );
  const inp = (key, type = 'text') => (
    <input type={type} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={INPUT} />
  );
  const fld = (label, key, type = 'text', req = false) => (
    <div><label style={{ fontSize: 11, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>{label}{req && <span style={{ color: '#ef9a9a' }}> *</span>}</label>{inp(key, type)}</div>
  );

  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid rgba(29,158,117,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#5ecda4' }}>📤 Upload Game</div>
            <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.4)', marginTop: 2 }}>
              {stage === 'upload' ? 'Drop a screenshot to extract match details' : 'Review extracted details and complete your report'}
            </div>
          </div>
          {stage === 'review' && (
            <button onClick={() => setStage('upload')} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: 'rgba(232,245,233,0.6)', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>← Back</button>
          )}
        </div>

        <div style={{ padding: '20px 24px 24px' }}>

          {/* ── Stage 1: Upload ── */}
          {stage === 'upload' && (
            <>
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#1d9e75' : imagePreview ? 'rgba(29,158,117,0.4)' : 'rgba(29,158,117,0.2)'}`,
                  borderRadius: 12, padding: imagePreview ? 12 : '40px 20px',
                  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
                  background: dragOver ? 'rgba(29,158,117,0.06)' : 'rgba(10,22,40,0.4)',
                  marginBottom: 16,
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, objectFit: 'contain' }} />
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🖼</div>
                    <div style={{ fontSize: 14, color: 'rgba(232,245,233,0.7)', marginBottom: 6 }}>Drop a screenshot here</div>
                    <div style={{ fontSize: 12, color: 'rgba(232,245,233,0.35)' }}>or click to browse — PNG, JPG</div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => loadFile(e.target.files[0])} />

              {imagePreview && (
                <button onClick={() => { setImagePreview(null); setImageBase64(null); }} style={{ background: 'none', border: 'none', color: 'rgba(232,245,233,0.4)', fontSize: 12, cursor: 'pointer', marginBottom: 12, padding: 0 }}>
                  ✕ Remove image
                </button>
              )}

              {extractError && (
                <div style={{ background: 'rgba(239,154,154,0.1)', border: '1px solid rgba(239,154,154,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef9a9a', fontSize: 13, marginBottom: 14 }}>
                  {extractError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={handleExtract}
                  disabled={!imageBase64 || extracting}
                  style={{ background: !imageBase64 ? 'rgba(29,158,117,0.2)' : 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 22px', cursor: !imageBase64 ? 'default' : 'pointer', opacity: extracting ? 0.7 : 1, minWidth: 120 }}
                >
                  {extracting ? '⏳ Extracting…' : '✨ Extract Details'}
                </button>
              </div>
            </>
          )}

          {/* ── Stage 2: Review ── */}
          {stage === 'review' && (
            <>
              {/* Small image preview */}
              {imagePreview && (
                <img src={imagePreview} alt="Match screenshot" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 8, marginBottom: 18, border: '1px solid rgba(29,158,117,0.15)' }} />
              )}

              {/* Section: Match Details */}
              <div style={{ fontSize: 11, color: '#1d9e75', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 12 }}>Match Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {fld('Date', 'date', 'date')}
                {fld('Time', 'time', 'time')}
                {fld('League', 'league')}
                {fld('Division', 'division')}
                {fld('Level', 'level')}
                {fld('Gender', 'gender')}
                <div style={{ gridColumn: '1/-1' }}>{fld('Field', 'field')}</div>
                <div style={{ gridColumn: '1/-1' }}>{fld('Home Team', 'home_team')}</div>
                <div style={{ gridColumn: '1/-1' }}>{fld('Away Team', 'away_team')}</div>
                {fld('Referee', 'referee')}
                {fld('AR1', 'ar1')}
                {fld('AR2', 'ar2')}
              </div>

              {/* Secondary details (collapsed visually) */}
              <details style={{ marginBottom: 20 }}>
                <summary style={{ fontSize: 11, color: 'rgba(232,245,233,0.4)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Additional Details (Client, Season, Area, Match #)</summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  {fld('Client', 'client')}
                  {fld('Season', 'season')}
                  {fld('Area', 'area')}
                  {fld('Match #', 'match_id')}
                </div>
              </details>

              {/* Section: Complete Your Report */}
              <div style={{ borderTop: '1px solid rgba(29,158,117,0.15)', paddingTop: 18, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#1d9e75', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 12 }}>Complete Your Report</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {fld('Half Duration (min)', 'half_duration', 'number', true)}
                  {fld('Halftime Duration (min)', 'halftime_duration', 'number', true)}
                </div>
                <div>
                  {lbl('Comments (optional)')}
                  <textarea value={form.comments || ''} onChange={e => setForm(p => ({ ...p, comments: e.target.value }))} placeholder="Add any notes about the match…" style={{ ...INPUT, minHeight: 80, resize: 'vertical' }} />
                </div>
              </div>

              {submitError && (
                <div style={{ background: 'rgba(239,154,154,0.1)', border: '1px solid rgba(239,154,154,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef9a9a', fontSize: 13, marginBottom: 14 }}>
                  {submitError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ background: submitting ? 'rgba(29,158,117,0.3)' : 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 24px', cursor: submitting ? 'default' : 'pointer', minWidth: 100 }}
                >
                  {submitting ? 'Saving…' : '✅ Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Game Detail Modal ─────────────────────────────────────── */
function GameDetailModal({ game, onClose, onSave, onEdit, onDelete, formatDate, formatTime }) {
  const isPast = game.date < today();
  const [desc, setDesc] = useState(game.description || '');
  const [sh, setSh] = useState(game.score_home ?? '');
  const [sa, setSa] = useState(game.score_away ?? '');

  const row = (label, value) => value ? (
    <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: 'rgba(232,245,233,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', minWidth: 72 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#e8f5e9' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(29,158,117,0.25)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#5ecda4' }}>{formatDate(game.date)} {formatTime(game.time)}</h3>
          {game.match_id && <span style={{ fontSize: 11, color: 'rgba(232,245,233,0.3)', fontFamily: 'monospace' }}>#{game.match_id}</span>}
        </div>
        <div style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          {row('League', game.league)} {row('Division', game.division)}
          {row('Level', game.level)} {row('Gender', game.gender)}
          {row('Field', game.field)}
          {row('Home', game.home_team)} {row('Away', game.away_team)}
          {row('Referee', game.referee)} {row('AR1', game.ar1)} {row('AR2', game.ar2)}
          {row('Half', game.half_duration ? `${game.half_duration} min` : null)}
          {row('Halftime', game.halftime_duration ? `${game.halftime_duration} min` : null)}
          {row('Comments', game.comments)}
        </div>
        {isPast && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Score</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="number" min="0" value={sh} onChange={e => setSh(e.target.value)} placeholder="Home" style={{ ...INPUT, maxWidth: 80, textAlign: 'center' }} />
                <span style={{ color: 'rgba(232,245,233,0.4)' }}>–</span>
                <input type="number" min="0" value={sa} onChange={e => setSa(e.target.value)} placeholder="Away" style={{ ...INPUT, maxWidth: 80, textAlign: 'center' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add match notes…" style={{ ...INPUT, minHeight: 80, resize: 'vertical' }} />
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button onClick={onDelete} style={{ background: 'rgba(183,28,28,0.2)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 8, color: '#ef9a9a', fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}>🗑 Delete</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '8px 14px', cursor: 'pointer' }}>✏️ Edit</button>
            {isPast && <button onClick={() => onSave(game, desc, sh, sa)} style={{ background: 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}>Save</button>}
            {!isPast && <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '8px 18px', cursor: 'pointer' }}>Close</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Game Form Modal (manual add/edit) ─────────────────────── */
function GameFormModal({ form, setForm, onClose, onSave, saving, isEdit }) {
  const f = (k) => ({ value: form[k] || '', onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const label = (text, req) => (
    <label style={{ fontSize: 11, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>
      {text}{req && <span style={{ color: '#ef9a9a' }}> *</span>}
    </label>
  );
  const field = (lbl, key, type = 'text', req = false) => (
    <div>{label(lbl, req)}<input type={type} {...f(key)} style={INPUT} /></div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(29,158,117,0.25)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#5ecda4', marginBottom: 20 }}>{isEdit ? '✏️ Edit Game' : '➕ Add Game'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('Date', 'date', 'date', true)}
          {field('Time', 'time', 'time')}
          {field('League', 'league')}
          {field('Division', 'division')}
          {field('Level', 'level')}
          {field('Gender', 'gender')}
          {field('Field', 'field')}
          {field('Match #', 'match_id')}
          {field('Home Team', 'home_team')}
          {field('Away Team', 'away_team')}
          {field('Referee', 'referee')}
          {field('AR1', 'ar1')}
          {field('AR2', 'ar2')}
          {field('Half Duration (min)', 'half_duration', 'number')}
          {field('Halftime Duration (min)', 'halftime_duration', 'number')}
          <div style={{ gridColumn: '1/-1' }}>
            {label('Comments')}
            <textarea {...f('comments')} style={{ ...INPUT, minHeight: 70, resize: 'vertical' }} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            {label('Description / Notes')}
            <textarea {...f('description')} style={{ ...INPUT, minHeight: 60, resize: 'vertical' }} />
          </div>
          <div>{label('Score Home')}<input type="number" min="0" {...f('score_home')} style={INPUT} /></div>
          <div>{label('Score Away')}<input type="number" min="0" {...f('score_away')} style={INPUT} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onSave} disabled={saving || !form.date} style={{ background: !form.date ? 'rgba(29,158,117,0.2)' : 'linear-gradient(135deg,#0e7a58,#1d9e75)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 20px', cursor: !form.date ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
