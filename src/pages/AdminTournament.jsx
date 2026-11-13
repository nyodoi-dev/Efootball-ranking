
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Play, Check, Trash2, Users,
  Trophy, ChevronRight, Loader2,
} from 'lucide-react';

const ROUND_LABELS = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', f: 'Final' };
// Works for any bracket size: r64 -> "Round of 64", ordered largest round first.
const roundSize = (r) => ({ f: 2, sf: 4, qf: 8 }[r] || Number(String(r).slice(1)) || 0);
const roundLabel = (r) => ROUND_LABELS[r] || (/^r\d+$/.test(r) ? `Round of ${r.slice(1)}` : r);


export default function AdminTournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [scores, setScores] = useState({}); // matchId -> { a, b }

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [tRes, pRes] = await Promise.all([
      fetch(`/api/tournaments/${id}`, { cache: 'no-store' }),
      fetch('/api/players', { cache: 'no-store' }),
    ]);
    const tData = await tRes.json();
    const pData = await pRes.json();
    setData(tData);
    setAllPlayers(Array.isArray(pData) ? pData : []);
    setSelectedPlayers((tData.players || []).map(tp => tp.player_id));
    setLoading(false);
  }

  const playerById = useMemo(() => {
    const m = {}; allPlayers.forEach(p => (m[p.id] = p)); return m;
  }, [allPlayers]);

  function playerName(pid) { return playerById[pid]?.name || '—'; }

  function msg(type, text) { setMessage({ type, text }); setTimeout(() => setMessage(null), 4000); }

  async function savePlayers() {
    setBusy(true);
    const res = await fetch(`/api/tournaments/${id}/players`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerIds: selectedPlayers }),
    });
    const d = await res.json();
    if (!res.ok) msg('error', d.error); else { msg('success', 'Participants saved.'); await loadAll(); }
    setBusy(false);
  }

  async function startTournament() {
    if (!window.confirm('Start the tournament? Players cannot be changed after this.')) return;
    setBusy(true);
    const res = await fetch(`/api/tournaments/${id}/start`, { method: 'POST' });
    const d = await res.json();
    if (!res.ok) msg('error', d.error); else { msg('success', 'Tournament started!'); await loadAll(); }
    setBusy(false);
  }

  async function enterResult(matchId) {
    const s = scores[matchId];
    if (!s || s.a === '' || s.b === '' || isNaN(s.a) || isNaN(s.b)) {
      msg('error', 'Enter scores for both players.'); return;
    }
    // Knockout: no draws allowed
    const match = data.matches.find(m => m.id === matchId);
    if (match?.stage === 'knockout' && parseInt(s.a) === parseInt(s.b)) {
      msg('error', 'Knockout matches cannot end in a draw.'); return;
    }
    setBusy(true);
    const res = await fetch(`/api/tournaments/${id}/matches/${matchId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoreA: s.a, scoreB: s.b }),
    });
    const d = await res.json();
    if (!res.ok) msg('error', d.error);
    else { setScores(prev => { const n = { ...prev }; delete n[matchId]; return n; }); await loadAll(); }
    setBusy(false);
  }

  async function approveReport(reportId) {
    setBusy(true);
    const res = await fetch(`/api/tournaments/${id}/reports/${reportId}`, { method: 'POST' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) msg('error', d.error || 'Could not approve.'); else msg('success', 'Result approved.');
    await loadAll();
    setBusy(false);
  }

  async function rejectReport(reportId) {
    setBusy(true);
    await fetch(`/api/tournaments/${id}/reports/${reportId}`, { method: 'DELETE' });
    await loadAll();
    setBusy(false);
  }

  async function deleteTournament() {
    if (!window.confirm('Delete this tournament? This cannot be undone.')) return;
    setBusy(true);
    await fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
    navigate('/admin');
  }

  if (loading) return <div className="max-w-lg mx-auto px-4 py-10 text-center text-muted text-sm">Loading…</div>;
  if (!data?.tournament) return <div className="max-w-lg mx-auto px-4 py-10 text-center text-muted text-sm">Not found.</div>;

  const { tournament, players, matches } = data;
  const isDraft = tournament.status === 'draft';
  const isActive = tournament.status === 'active';
  const isCompleted = tournament.status === 'completed';

  const pendingMatches = matches.filter(m => m.status === 'pending' && m.player_a && m.player_b);
  const playedMatches = matches.filter(m => m.status === 'played' && m.player_a && m.player_b);
  const matchById = {};
  matches.forEach(m => (matchById[m.id] = m));
  const waitingReports = (data.reports || []).filter(r => r.status === 'pending' && matchById[r.match_id]?.status === 'pending');

  const groupMatches = pendingMatches.filter(m => m.stage === 'group');
  const knockoutMatches = pendingMatches.filter(m => m.stage === 'knockout');

  // Organize knockout rounds
  const knockoutByRound = {};
  knockoutMatches.forEach(m => {
    if (!knockoutByRound[m.round]) knockoutByRound[m.round] = [];
    knockoutByRound[m.round].push(m);
  });
  const groupByLabel = {};
  groupMatches.forEach(m => {
    if (!groupByLabel[m.round]) groupByLabel[m.round] = [];
    groupByLabel[m.round].push(m);
  });

  const champion = tournament.champion_id ? playerById[tournament.champion_id] : null;

  function ScoreInput({ matchId, match }) {
    const s = scores[matchId] || { a: '', b: '' };
    return (
      <div className="flex items-center gap-2 mt-2">
        <input type="number" min={0} value={s.a}
          onChange={e => setScores(p => ({ ...p, [matchId]: { ...s, a: e.target.value } }))}
          placeholder="0"
          className="w-14 rounded-lg px-2 py-1.5 text-sm text-center font-mono bg-app border border-line text-ink" />
        <span className="text-muted text-sm font-bold">–</span>
        <input type="number" min={0} value={s.b}
          onChange={e => setScores(p => ({ ...p, [matchId]: { ...s, b: e.target.value } }))}
          placeholder="0"
          className="w-14 rounded-lg px-2 py-1.5 text-sm text-center font-mono bg-app border border-line text-ink" />
        <button onClick={() => enterResult(matchId)} disabled={busy}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-brand text-onBrand disabled:opacity-60">
          <Check size={12} /> Save
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-app text-ink pb-10">
      <div className="sticky top-0 z-40 bg-nav border-b border-line px-4 py-3 flex items-center gap-3">
        <Link to="/admin" className="text-muted hover:text-ink"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{tournament.name}</h1>
          <p className="text-xs text-muted capitalize">{tournament.format.replace('_', ' ')} · {tournament.status}</p>
        </div>
        <button onClick={deleteTournament} className="text-red-400 hover:text-red-300">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="px-4 py-5 space-y-6">
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-400/20' : 'bg-green-500/10 text-green-400 border border-green-400/20'}`}>
            {message.text}
          </div>
        )}

        {/* Champion */}
        {champion && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--pitch))' }}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="text-4xl">🏆</div>
              <div>
                <p className="text-white/60 text-xs">Champion</p>
                <p className="font-bold text-xl text-white">{champion.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Draft: player selection */}
        {isDraft && (
          <section>
            <h2 className="font-bold text-base mb-3 flex items-center gap-2">
              <Users size={16} /> Select Participants
            </h2>
            <div className="bg-card border border-line rounded-2xl overflow-hidden mb-3">
              {allPlayers.map((p, i) => {
                const selected = selectedPlayers.includes(p.id);
                return (
                  <button key={p.id} onClick={() => setSelectedPlayers(prev =>
                    selected ? prev.filter(x => x !== p.id) : [...prev, p.id]
                  )}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${i === allPlayers.length - 1 ? '' : 'border-b border-line'} ${selected ? 'bg-teal-600/10' : 'hover:bg-line'}`}>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-teal-600 border-teal-600' : 'border-muted'}`}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-auto text-muted text-xs font-mono">{p.elo} ELO</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={savePlayers} disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-card border border-line text-ink disabled:opacity-60">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save ({selectedPlayers.length} players)
              </button>
              <button onClick={startTournament} disabled={busy || selectedPlayers.length < 2}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-brand text-onBrand disabled:opacity-60">
                <Play size={14} /> Start Tournament
              </button>
            </div>
          </section>
        )}

        {/* Results reported by players */}
        {isActive && waitingReports.length > 0 && (
          <section>
            <h2 className="font-bold text-base mb-2">Reported results ({waitingReports.length})</h2>
            <div className="space-y-2">
              {waitingReports.map(r => {
                const m = matchById[r.match_id];
                return (
                  <div key={r.id} className="bg-card border border-teal-500/40 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{playerName(m.player_a)}</span>
                      <span className="font-mono font-bold px-2">{r.score_a} – {r.score_b}</span>
                      <span>{playerName(m.player_b)}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {roundLabel(m.round)} · reported by {r.submitted_by}
                      {r.screenshot_url && (
                        <> · <a href={r.screenshot_url} target="_blank" rel="noreferrer" className="underline text-teal-400">screenshot</a></>
                      )}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => approveReport(r.id)} disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-brand text-onBrand disabled:opacity-60">
                        <Check size={12} /> Approve
                      </button>
                      <button onClick={() => rejectReport(r.id)} disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border border-red-400/40 text-red-400 disabled:opacity-60">
                        <Trash2 size={12} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Active: enter results */}
        {isActive && (
          <>
            {/* Group matches */}
            {Object.entries(groupByLabel).sort().map(([groupLabel, gMatches]) => (
              <section key={groupLabel}>
                <h2 className="font-bold text-base mb-2">{groupLabel} — Pending</h2>
                <div className="space-y-2">
                  {gMatches.map(m => (
                    <div key={m.id} className="bg-card border border-amber-400/20 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{playerName(m.player_a)}</span>
                        <span className="text-muted text-xs px-2">vs</span>
                        <span>{playerName(m.player_b)}</span>
                      </div>
                      {ScoreInput({ matchId: m.id, match: m })}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Knockout matches */}
            {Object.keys(knockoutByRound).sort((a, b) => roundSize(b) - roundSize(a)).map(round => (
              <section key={round}>
                <h2 className="font-bold text-base mb-2">
                  {roundLabel(round)} — Pending
                </h2>
                <div className="space-y-2">
                  {knockoutByRound[round].map(m => (
                    <div key={m.id} className="bg-card border border-amber-400/20 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{playerName(m.player_a)}</span>
                        <span className="text-muted text-xs px-2">vs</span>
                        <span>{playerName(m.player_b)}</span>
                      </div>
                      {ScoreInput({ matchId: m.id, match: m })}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {pendingMatches.length === 0 && (
              <div className="bg-card border border-line rounded-2xl p-6 text-center">
                <p className="text-muted text-sm">All matches played! Tournament will complete automatically.</p>
              </div>
            )}
          </>
        )}

        {/* Played matches log */}
        {playedMatches.length > 0 && (
          <section>
            <h2 className="font-bold text-base mb-2">Results</h2>
            <div className="bg-card border border-line rounded-2xl overflow-hidden">
              {playedMatches.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-3 px-4 py-3 text-sm ${i === playedMatches.length - 1 ? '' : 'border-b border-line'}`}>
                  <span className={`flex-1 ${m.winner_id === m.player_a ? 'font-bold text-green-400' : ''}`}>{playerName(m.player_a)}</span>
                  <span className="font-mono text-xs text-muted">{m.score_a} – {m.score_b}</span>
                  <span className={`flex-1 text-right ${m.winner_id === m.player_b ? 'font-bold text-green-400' : ''}`}>{playerName(m.player_b)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Public view link */}
        <Link to={`/tournaments/${id}`}
          className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium border border-line text-muted hover:text-ink">
          <Trophy size={16} /> View Public Tournament Page <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
