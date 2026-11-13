
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  LogOut, Plus, Pencil, Trash2, Check, X, KeyRound,
  ListChecks, Users, RotateCcw, Save, ShieldCheck, Trophy, AlertTriangle,
} from 'lucide-react';
import { signOut } from '../lib/api';

const TROPHY_TYPES = [
  { value: 'winner',      label: '🏆 Winner',       color: '#F59E0B' },
  { value: 'runner_up',   label: '🥈 Runner Up',     color: '#94A3B8' },
  { value: 'golden_boot', label: '👟 Golden Boot',   color: '#10B981' },
  { value: 'golden_glove',label: '🧤 Golden Glove',  color: '#3B82F6' },
  { value: 'top_scorer',  label: '⭐ Top Scorer',    color: '#F97316' },
  { value: 'season_mvp',  label: '🏅 Season MVP',    color: '#8B5CF6' },
];

const inputCls = 'w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-line text-chalk';
const selectCls = 'w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-line text-chalk';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [players, setPlayers]   = useState([]);
  const [pending, setPending]   = useState([]);
  const [season, setSeason]     = useState(null);
  const [trophies, setTrophies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [message, setMessage]   = useState(null);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingId, setEditingId]         = useState(null);
  const [editForm, setEditForm]           = useState({});
  const [resetConfirming, setResetConfirming] = useState(false);
  const [nextSeasonName, setNextSeasonName]   = useState('');

  const [fullResetStep, setFullResetStep] = useState(0); // 0=idle 1=confirm 2=type
  const [fullResetInput, setFullResetInput] = useState('');
  const [fullResetBusy, setFullResetBusy] = useState(false);
  const [fullResetMsg, setFullResetMsg] = useState(null);

  // Trophy form
  const [trophyPlayer, setTrophyPlayer]   = useState('');
  const [trophyType, setTrophyType]       = useState('winner');
  const [trophyComp, setTrophyComp]       = useState('');
  const [trophyCount, setTrophyCount]     = useState(1);
  const [trophyMsg, setTrophyMsg]         = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [pR, pdR, sR, tR] = await Promise.all([
        fetch('/api/players'), fetch('/api/pending'),
        fetch('/api/season'), fetch('/api/trophies'),
      ]);
      const pData = await pR.json(); setPlayers(Array.isArray(pData) ? pData : []);
      const pdData = await pdR.json(); setPending(Array.isArray(pdData) ? pdData : []);
      setSeason(await sR.json());
      const tData = await tR.json(); setTrophies(Array.isArray(tData) ? tData : []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Could not load admin data.' });
    }
    setLoading(false);
  }

  const playerById = useMemo(() => {
    const map = {}; players.forEach((p) => (map[p.id] = p)); return map;
  }, [players]);

  function playerName(id) { return playerById[id]?.name || 'Unknown'; }

  async function handleLogout() {
    await signOut();
    navigate('/admin/login');
  }

  async function addPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setBusy(true); setMessage(null);
    try {
      const res = await fetch('/api/players', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Could not add player.' }); }
      else { setNewPlayerName(''); await loadAll(); }
    } catch { setMessage({ type: 'error', text: 'Network error — try again.' }); }
    setBusy(false);
  }

  function startEdit(player) {
    setEditingId(player.id);
    setEditForm({ name: player.name, elo: player.elo, wins: player.wins, draws: player.draws, losses: player.losses, highest_rank: player.highest_rank || '' });
  }
  function cancelEdit() { setEditingId(null); setEditForm({}); }

  async function saveEdit(id) {
    setBusy(true); setMessage(null);
    try {
      const res = await fetch(`/api/players/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Could not save.' }); }
      else { cancelEdit(); await loadAll(); }
    } catch { setMessage({ type: 'error', text: 'Network error.' }); }
    setBusy(false);
  }

  async function resetPin(id) {
    if (!window.confirm(`Reset the profile PIN for ${playerName(id)}? They can then choose a new one.`)) return;
    setBusy(true); setMessage(null);
    try {
      const res = await fetch(`/api/players/${id}/pin`, { method: 'DELETE' });
      if (!res.ok) setMessage({ type: 'error', text: 'Could not reset the PIN.' });
      else { setMessage({ type: 'success', text: `PIN reset for ${playerName(id)}.` }); await loadAll(); }
    } catch { setMessage({ type: 'error', text: 'Network error.' }); }
    setBusy(false);
  }

  async function deletePlayer(id) {
    if (!window.confirm(`Remove ${playerName(id)}?`)) return;
    setBusy(true); setMessage(null);
    try {
      const res = await fetch(`/api/players/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Could not delete.' }); }
      else { await loadAll(); }
    } catch { setMessage({ type: 'error', text: 'Network error.' }); }
    setBusy(false);
  }

  async function approveMatch(id) {
    setBusy(true); setMessage(null);
    try {
      const res = await fetch(`/api/pending/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Could not approve.' }); }
      else { await loadAll(); }
    } catch { setMessage({ type: 'error', text: 'Network error.' }); }
    setBusy(false);
  }

  async function rejectMatch(id) {
    setBusy(true); setMessage(null);
    try {
      const res = await fetch(`/api/pending/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Could not reject.' }); }
      else { await loadAll(); }
    } catch { setMessage({ type: 'error', text: 'Network error.' }); }
    setBusy(false);
  }

  async function resetSeason() {
    setBusy(true); setMessage(null);
    try {
      const res = await fetch('/api/season/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextSeasonName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Could not reset.' }); }
      else {
        setMessage({ type: 'success', text: `${data.newSeason.name} has started.` });
        setResetConfirming(false); setNextSeasonName(''); await loadAll();
      }
    } catch { setMessage({ type: 'error', text: 'Network error.' }); }
    setBusy(false);
  }

  async function fullReset() {
    if (fullResetInput !== 'RESET') return;
    setFullResetBusy(true); setFullResetMsg(null);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setFullResetMsg({ type: 'error', text: data.error || 'Reset failed.' }); }
      else {
        setFullResetMsg({ type: 'success', text: 'Everything has been wiped. Fresh start!' });
        setFullResetStep(0); setFullResetInput('');
        await loadAll();
      }
    } catch { setFullResetMsg({ type: 'error', text: 'Network error.' }); }
    setFullResetBusy(false);
  }

  async function addTrophy() {
    setTrophyMsg(null);
    if (!trophyPlayer || !trophyComp.trim()) {
      setTrophyMsg({ type: 'error', text: 'Pick a player and enter a competition name.' }); return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/trophies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: trophyPlayer, competitionName: trophyComp.trim(), trophyType, count: Number(trophyCount) }),
      });
      const data = await res.json();
      if (!res.ok) { setTrophyMsg({ type: 'error', text: data.error || 'Could not add trophy.' }); }
      else {
        setTrophyComp(''); setTrophyCount(1);
        setTrophyMsg({ type: 'success', text: 'Trophy added!' });
        await loadAll();
      }
    } catch { setTrophyMsg({ type: 'error', text: 'Network error.' }); }
    setBusy(false);
  }

  async function deleteTrophy(id) {
    if (!window.confirm('Remove this trophy?')) return;
    setBusy(true);
    try {
      await fetch(`/api/trophies/${id}`, { method: 'DELETE' });
      await loadAll();
    } catch {}
    setBusy(false);
  }

  // Group trophies by player
  const trophiesByPlayer = useMemo(() => {
    const map = {};
    trophies.forEach((t) => {
      if (!map[t.player_id]) map[t.player_id] = [];
      map[t.player_id].push(t);
    });
    return map;
  }, [trophies]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-sans bg-pitch text-chalk min-h-screen">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} className="text-lime" />
          <h1 className="font-display font-bold text-3xl">Admin</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted hover:text-chalk">
          <LogOut size={16} /> Sign out
        </button>
      </header>

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : (
        <div className="space-y-10">
          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm ${message.type === 'error' ? 'bg-coral/20 text-coral' : 'bg-lime/20 text-lime'}`}>
              {message.text}
            </div>
          )}

          {/* ── Pending results ── */}
          <section>
            <h2 className="flex items-center gap-2 font-display font-semibold text-2xl mb-3">
              <ListChecks size={20} /> Pending Results
            </h2>
            {pending.length === 0 ? (
              <div className="bg-panel border border-line rounded-lg p-4 text-muted text-sm">Nothing awaiting approval.</div>
            ) : (
              <div className="space-y-3">
                {pending.map((entry) => (
                  <div key={entry.id} className="bg-panel border border-line rounded-lg p-4">
                    <div className="font-mono text-sm">
                      {playerName(entry.player_a)} {entry.score_a} – {entry.score_b} {playerName(entry.player_b)}
                    </div>
                    {entry.submitted_by && <div className="text-muted text-xs mt-1">Reported by {entry.submitted_by}</div>}
                    {entry.screenshot_url && (
                      <a href={entry.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mt-3">
                        <img src={entry.screenshot_url} alt="Screenshot" className="max-h-48 rounded-md border border-line object-contain" />
                      </a>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => approveMatch(entry.id)} disabled={busy}
                        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-brand text-onBrand disabled:opacity-60">
                        <Check size={14} /> Approve
                      </button>
                      <button onClick={() => rejectMatch(entry.id)} disabled={busy}
                        className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium border border-coral text-coral disabled:opacity-60">
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Roster ── */}
          <section>
            <h2 className="flex items-center gap-2 font-display font-semibold text-2xl mb-3">
              <Users size={20} /> Roster
            </h2>
            <div className="bg-panel border border-line rounded-lg overflow-hidden">
              {players.length === 0 ? (
                <div className="p-4 text-muted text-sm">No players yet.</div>
              ) : (
                players.map((p, i) => (
                  <div key={p.id} className={`p-4 ${i === players.length - 1 ? '' : 'border-b border-line'}`}>
                    {editingId === p.id ? (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-muted text-xs mb-1">Name</label>
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {['elo', 'wins', 'draws', 'losses'].map((field) => (
                            <div key={field}>
                              <label className="block text-muted text-xs mb-1 capitalize">{field}</label>
                              <input type="number" value={editForm[field]}
                                onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                                className="w-full rounded-md px-2 py-2 text-sm bg-panelAlt border border-line text-chalk font-mono" />
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="block text-muted text-xs mb-1">Highest eFootball rank</label>
                          <input value={editForm.highest_rank} onChange={(e) => setEditForm({ ...editForm, highest_rank: e.target.value })}
                            placeholder="e.g. Division 1, Legend" className={inputCls} />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveEdit(p.id)} disabled={busy}
                            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-brand text-onBrand disabled:opacity-60">
                            <Save size={14} /> Save
                          </button>
                          <button onClick={cancelEdit}
                            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium border border-line text-muted">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-muted text-xs mt-0.5">ELO {p.elo} · {p.wins}W {p.draws}D {p.losses}L</div>
                        </div>
                        {p.has_pin && (
                          <button onClick={() => resetPin(p.id)} disabled={busy} title="Reset profile PIN" aria-label={`Reset profile PIN for ${p.name}`}
                            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm border border-line text-muted hover:text-chalk disabled:opacity-60">
                            <KeyRound size={14} />
                          </button>
                        )}
                        <button onClick={() => startEdit(p)} aria-label={`Edit ${p.name}`}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm border border-line text-muted hover:text-chalk">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deletePlayer(p.id)} disabled={busy}
                          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm border border-coral text-coral disabled:opacity-60">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                placeholder="New player name" className="flex-1 rounded-md px-3 py-2 text-sm bg-panel border border-line text-chalk" />
              <button onClick={addPlayer} disabled={busy}
                className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium bg-brand text-onBrand disabled:opacity-60">
                <Plus size={16} /> Add
              </button>
            </div>
          </section>

          {/* ── Hall of Fame / Trophies ── */}
          <section>
            <h2 className="flex items-center gap-2 font-display font-semibold text-2xl mb-3">
              <Trophy size={20} /> Hall of Fame Trophies
            </h2>

            {/* Add trophy form */}
            <div className="bg-panel border border-line rounded-lg p-4 mb-4 space-y-3">
              <p className="text-muted text-xs">Add a trophy</p>
              <div>
                <label className="block text-muted text-xs mb-1">Player</label>
                <select value={trophyPlayer} onChange={(e) => setTrophyPlayer(e.target.value)} className={selectCls}>
                  <option value="">Select player…</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-muted text-xs mb-1">Trophy type</label>
                <select value={trophyType} onChange={(e) => setTrophyType(e.target.value)} className={selectCls}>
                  {TROPHY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-muted text-xs mb-1">Competition name (free text)</label>
                <input value={trophyComp} onChange={(e) => setTrophyComp(e.target.value)}
                  placeholder="e.g. UCL, Kings Cup, La Liga…"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-muted text-xs mb-1">Count (how many times)</label>
                <input type="number" min={1} value={trophyCount} onChange={(e) => setTrophyCount(e.target.value)}
                  className="w-24 rounded-md px-3 py-2 text-sm bg-panelAlt border border-line text-chalk font-mono" />
              </div>
              {trophyMsg && (
                <p className={`text-sm ${trophyMsg.type === 'error' ? 'text-coral' : 'text-lime'}`}>{trophyMsg.text}</p>
              )}
              <button onClick={addTrophy} disabled={busy}
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-brand text-onBrand disabled:opacity-60">
                <Plus size={16} /> Add Trophy
              </button>
            </div>

            {/* Existing trophies grouped by player */}
            {Object.keys(trophiesByPlayer).length === 0 ? (
              <div className="bg-panel border border-line rounded-lg p-4 text-muted text-sm">No trophies added yet.</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(trophiesByPlayer).map(([pid, pts]) => (
                  <div key={pid} className="bg-panel border border-line rounded-lg p-4">
                    <p className="font-semibold text-chalk mb-2">{playerName(pid)}</p>
                    <div className="space-y-2">
                      {pts.map((t) => {
                        const typeInfo = TROPHY_TYPES.find((x) => x.value === t.trophy_type) || TROPHY_TYPES[0];
                        return (
                          <div key={t.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm" style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                              <span className="text-chalk text-sm font-medium">{t.competition_name}</span>
                              {t.count > 1 && (
                                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full font-mono">{t.count}x</span>
                              )}
                            </div>
                            <button onClick={() => deleteTrophy(t.id)}
                              className="text-coral hover:text-coral/70 flex-shrink-0">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
<section>
  <h2 className="flex items-center gap-2 font-display font-semibold text-2xl mb-3">
    <Trophy size={20} /> Tournaments
  </h2>
  <Link to="/admin/tournaments"
    className="flex items-center gap-3 bg-panel border border-line rounded-lg px-4 py-3 hover:bg-panelAlt transition-colors">
    <Trophy size={18} className="text-lime flex-shrink-0" />
    <div className="flex-1">
      <p className="font-medium text-sm">Manage Tournaments</p>
      <p className="text-muted text-xs mt-0.5">Create and run knockout, group stage, or round robin tournaments</p>
    </div>
    <span className="text-muted text-xs">→</span>
  </Link>
</section>
          {/* ── Season ── */}
          <section>
            <h2 className="flex items-center gap-2 font-display font-semibold text-2xl mb-3">
              <RotateCcw size={20} /> Season
            </h2>
            <div className="bg-panel border border-line rounded-lg p-4">
              <p className="text-sm mb-1">Current: <span className="font-medium">{season?.current?.name || 'None'}</span></p>
              <p className="text-muted text-xs mb-4">
                Resetting archives everyone's ELO and resets all players to 1000 with a clean 0–0–0 record.
              </p>
              {!resetConfirming ? (
                <button onClick={() => setResetConfirming(true)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-coral text-coral">
                  <RotateCcw size={16} /> Reset table for a new season
                </button>
              ) : (
                <div className="space-y-2">
                  <input value={nextSeasonName} onChange={(e) => setNextSeasonName(e.target.value)}
                    placeholder={`Season name (e.g. "Season 2")`}
                    className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-line text-chalk" />
                  <div className="flex gap-2">
                    <button onClick={resetSeason} disabled={busy}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-coral text-pitch disabled:opacity-60">
                      <ShieldCheck size={16} /> Confirm reset
                    </button>
                    <button onClick={() => setResetConfirming(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium border border-line text-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {season?.past?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-line">
                  <p className="text-muted text-xs mb-2">Past seasons</p>
                  {season.past.map((s) => (
                    <div key={s.id} className="text-sm mb-1">{s.name} — ended {new Date(s.ended_at).toLocaleDateString()}</div>
                  ))}
                </div>
              )}
            </div>
          </section>
          {/* ── Full Reset ── */}
          <section>
            <h2 className="flex items-center gap-2 font-display font-semibold text-2xl mb-3 text-coral">
              <AlertTriangle size={20} /> Full Reset
            </h2>
            <div className="bg-panel border border-coral/30 rounded-lg p-4">
              <p className="text-muted text-xs mb-4">
                This permanently deletes <strong className="text-chalk">everything</strong> — all players, matches, trophies, pending results, and seasons. This cannot be undone.
              </p>

              {fullResetMsg && (
                <p className={`text-sm mb-3 ${fullResetMsg.type === 'error' ? 'text-coral' : 'text-lime'}`}>
                  {fullResetMsg.text}
                </p>
              )}

              {fullResetStep === 0 && (
                <button onClick={() => setFullResetStep(1)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium border border-coral text-coral">
                  <AlertTriangle size={16} /> Full Reset — Wipe Everything
                </button>
              )}

              {fullResetStep === 1 && (
                <div className="space-y-3">
                  <p className="text-coral text-sm font-semibold">Are you absolutely sure? This deletes every player, match, trophy and season permanently.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setFullResetStep(2)}
                      className="rounded-md px-3 py-2 text-sm font-medium bg-coral text-pitch">
                      Yes, I understand — continue
                    </button>
                    <button onClick={() => setFullResetStep(0)}
                      className="rounded-md px-3 py-2 text-sm font-medium border border-line text-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {fullResetStep === 2 && (
                <div className="space-y-3">
                  <p className="text-muted text-sm">Type <strong className="text-chalk font-mono">RESET</strong> to confirm:</p>
                  <input
                    value={fullResetInput}
                    onChange={(e) => setFullResetInput(e.target.value)}
                    placeholder="Type RESET"
                    className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-coral/40 text-chalk font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={fullReset}
                      disabled={fullResetInput !== 'RESET' || fullResetBusy}
                      className="rounded-md px-3 py-2 text-sm font-medium bg-coral text-pitch disabled:opacity-40">
                      {fullResetBusy ? 'Wiping…' : 'Confirm Full Reset'}
                    </button>
                    <button onClick={() => { setFullResetStep(0); setFullResetInput(''); }}
                      className="rounded-md px-3 py-2 text-sm font-medium border border-line text-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
