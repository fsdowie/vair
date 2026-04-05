import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  'https://iunehbdazfzgfclkvvgd.supabase.co',
  'sb_publishable_SU4BJ5e9RLDl-3iSZHo-3g_mbHpD9cn'
);

const today = () => new Date().toISOString().split('T')[0];

const INPUT = {
  width: '100%', background: 'rgba(10,22,40,0.7)',
  border: '1px solid rgba(76,175,80,0.3)', borderRadius: 8,
  color: '#e8f5e9', fontSize: 13, padding: '8px 12px',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const COLS = ['Date', 'Time', 'League', 'Level', 'G', 'Field', 'Home', 'Away', 'Ref', 'AR1', 'AR2'];
const BLANK = { date: '', time: '', league: '', level: '', gender: '', field: '', home_team: '', away_team: '', referee: '', ar1: '', ar2: '', description: '', score_home: '', score_away: '' };

export default function GamesOrganizer() {
  const [view, setView] = useState('future'); // future | past
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [session, setSession] = useState(null);
  const [selected, setSelected] = useState(null); // game being viewed/edited
  const [showForm, setShowForm] = useState(false); // manual add modal
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
      .from('games')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: view === 'future' })
      .order('time', { ascending: true });

    const { data, error } = view === 'future'
      ? await query.gte('date', t)
      : await query.lt('date', t);

    if (!error) setGames(data || []);
    setLoading(false);
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-games');
      if (error) throw error;
      const total = (data.results || []).reduce((s, r) => s + (r.scraped || 0), 0);
      setSyncMsg(`Synced ${total} game(s) from ${data.results?.length || 0} site(s).`);
      await fetchGames();
    } catch (err) {
      setSyncMsg('Sync failed: ' + err.message);
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 5000);
  };

  const openAdd = () => { setForm(BLANK); setShowForm(true); };

  const openEdit = (game) => {
    setForm({
      date: game.date || '',
      time: game.time?.slice(0, 5) || '',
      league: game.league || '',
      level: game.level || '',
      gender: game.gender || '',
      field: game.field || '',
      home_team: game.home_team || '',
      away_team: game.away_team || '',
      referee: game.referee || '',
      ar1: game.ar1 || '',
      ar2: game.ar2 || '',
      description: game.description || '',
      score_home: game.score_home ?? '',
      score_away: game.score_away ?? '',
      _id: game.id,
    });
    setShowForm(true);
  };

  const saveGame = async () => {
    if (!form.date) return;
    setSaving(true);
    const payload = {
      user_id: session.user.id,
      date: form.date,
      time: form.time ? form.time + ':00' : null,
      league: form.league || null,
      level: form.level || null,
      gender: form.gender || null,
      field: form.field || null,
      home_team: form.home_team || null,
      away_team: form.away_team || null,
      referee: form.referee || null,
      ar1: form.ar1 || null,
      ar2: form.ar2 || null,
      description: form.description || null,
      score_home: form.score_home !== '' ? parseInt(form.score_home) : null,
      score_away: form.score_away !== '' ? parseInt(form.score_away) : null,
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
    background: active ? 'linear-gradient(135deg,#2e7d32,#4caf50)' : 'rgba(255,255,255,0.06)',
    border: 'none', borderRadius: 8, color: active ? '#fff' : 'rgba(232,245,233,0.7)',
    fontSize: 13, fontWeight: active ? 600 : 400, padding: '8px 18px', cursor: 'pointer',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(135deg,#0a1628,#0d2137)', color: '#e8f5e9', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid rgba(76,175,80,0.2)', background: 'rgba(10,22,40,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, background: 'linear-gradient(135deg,#4caf50,#81c784)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 2 }}>
            📅 Games Organizer
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(232,245,233,0.5)' }}>Your assigned matches</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={btnStyle(view === 'future')} onClick={() => setView('future')}>⏭ Future</button>
          <button style={btnStyle(view === 'past')} onClick={() => setView('past')}>⏮ Past</button>
          <button onClick={syncNow} disabled={syncing} style={{ ...btnStyle(false), background: syncing ? 'rgba(255,255,255,0.04)' : 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)' }}>
            {syncing ? '⏳ Syncing…' : '🔄 Sync Now'}
          </button>
          <button onClick={openAdd} style={{ ...btnStyle(false), background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)' }}>+ Add Game</button>
        </div>
      </div>

      {syncMsg && (
        <div style={{ background: 'rgba(76,175,80,0.12)', borderBottom: '1px solid rgba(76,175,80,0.2)', padding: '8px 24px', fontSize: 13, color: '#81c784' }}>
          {syncMsg}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto', padding: '16px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(232,245,233,0.4)' }}>Loading…</div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(232,245,233,0.4)' }}>
            No {view} games found. {view === 'future' ? 'Try syncing to pull games from your connected sites.' : ''}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {COLS.map(c => (
                  <th key={c} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid rgba(76,175,80,0.25)', color: '#4caf50', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
                <th style={{ padding: '8px 10px', borderBottom: '2px solid rgba(76,175,80,0.25)' }}></th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid rgba(76,175,80,0.08)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(76,175,80,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelected(g)}
                >
                  <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: '#81c784' }}>{formatDate(g.date)}</td>
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

      {/* Game detail modal */}
      {selected && (
        <GameDetailModal
          game={selected}
          onClose={() => setSelected(null)}
          onSave={saveDetails}
          onEdit={() => { openEdit(selected); setSelected(null); }}
          onDelete={() => deleteGame(selected.id)}
          formatDate={formatDate}
          formatTime={formatTime}
        />
      )}

      {/* Add/Edit game modal */}
      {showForm && (
        <GameFormModal
          form={form}
          setForm={setForm}
          onClose={() => setShowForm(false)}
          onSave={saveGame}
          saving={saving}
          isEdit={!!form._id}
        />
      )}
    </div>
  );
}

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
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(76,175,80,0.25)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#81c784' }}>
            {formatDate(game.date)} {formatTime(game.time)}
          </h3>
          {game.source_site && <span style={{ fontSize: 11, color: 'rgba(232,245,233,0.3)', fontFamily: 'monospace' }}>#{game.match_id}</span>}
        </div>

        <div style={{ background: 'rgba(10,22,40,0.5)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          {row('League', game.league)} {row('Level', game.level)} {row('Gender', game.gender)}
          {row('Field', game.field)}
          {row('Home', game.home_team)} {row('Away', game.away_team)}
          {row('Referee', game.referee)} {row('AR1', game.ar1)} {row('AR2', game.ar2)}
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
            {isPast && <button onClick={() => onSave(game, desc, sh, sa)} style={{ background: 'linear-gradient(135deg,#2e7d32,#4caf50)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', cursor: 'pointer' }}>Save</button>}
            {!isPast && <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 13, padding: '8px 18px', cursor: 'pointer' }}>Close</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameFormModal({ form, setForm, onClose, onSave, saving, isEdit }) {
  const f = (k) => ({ value: form[k] || '', onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });
  const label = (text, req) => (
    <label style={{ fontSize: 11, color: 'rgba(232,245,233,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 5 }}>
      {text}{req && <span style={{ color: '#ef9a9a' }}> *</span>}
    </label>
  );
  const field = (lbl, key, type = 'text', req = false) => (
    <div>
      {label(lbl, req)}
      <input type={type} {...f(key)} style={INPUT} />
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d2137', border: '1px solid rgba(76,175,80,0.25)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#81c784', marginBottom: 20 }}>{isEdit ? '✏️ Edit Game' : '➕ Add Game'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('Date', 'date', 'date', true)}
          {field('Time', 'time', 'time')}
          {field('League', 'league')}
          {field('Level', 'level')}
          {field('Gender', 'gender')}
          {field('Field', 'field')}
          {field('Home Team', 'home_team')}
          {field('Away Team', 'away_team')}
          {field('Referee', 'referee')}
          {field('AR1', 'ar1')}
          {field('AR2', 'ar2')}
          <div style={{ gridColumn: '1/-1' }}>
            {label('Description')}
            <textarea {...f('description')} style={{ ...INPUT, minHeight: 70, resize: 'vertical' }} />
          </div>
          <div>
            {label('Score Home')}
            <input type="number" min="0" {...f('score_home')} style={INPUT} />
          </div>
          <div>
            {label('Score Away')}
            <input type="number" min="0" {...f('score_away')} style={INPUT} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#e8f5e9', fontSize: 14, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={onSave} disabled={saving || !form.date} style={{ background: !form.date ? 'rgba(76,175,80,0.2)' : 'linear-gradient(135deg,#2e7d32,#4caf50)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 20px', cursor: !form.date ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
