
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Play, Check, Trash2, Users,
  Trophy, ChevronRight, Loader2,
} from 'lucide-react';

const ROUND_LABELS = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', f: 'Final' };

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

  async function deleteTournament() {
    if (!window.confirm('Delete this tournament? This cannot be undone.')) return;
    setBusy(true);
    await fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
    navigate('/admin');
  }

  if (loading) return <div className="max-w-lg mx-auto px-4 py-10 text-center text-[#7A9BAD] text-sm">Loading…</div>;
  if (!data?.tournament) return <div className="max-w-lg mx-auto px-4 py-10 text-center text-[#7A9BAD] text-sm">Not found.</div>;

  const { tournament, players, matches } = data;
  const isDraft = tournament.status === 'draft';
  const isActive = tournament.status === 'active';
  const isCompleted = tournament.status === 'completed';

  const pendingMatches = matches.filter(m => m.status === 'pending' && m.player_a && m.player_b);
  const playedMatches = matches.filter(m => m.status === 'played');

  const groupMatches = pendingMatches.filter(m => m.stage === 'group');
  const knockoutMatches = pendingMatches.filter(m => m.stage === 'knockout');

  // Organize knockout rounds
  const knockoutRoundOrder = ['r32', 'r16', 'qf', 'sf', 'f'];
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
          className="w-14 rounded-lg px-2 py-1.5 text-sm text-center font-mono bg-[#0D1B24] border border-[#1E3040] text-[#E8F0F5]" />
        <span className="text-[#7A9BAD] text-sm font-bold">–</span>
        <input type="number" min={0} value={s.b}
          onChange={e => setScores(p => ({ ...p, [matchId]: { ...s, b: e.target.value } }))}
          placeholder="0"
          className="w-14 rounded-lg px-2 py-1.5 text-sm text-center font-mono bg-[#0D1B24] border border-[#1E3040] text-[#E8F0F5]" />
        <button onClick={() => enterResult(matchId)} disabled={busy}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-teal-600 text-white disabled:opacity-60">
          <Check size={12} /> Save
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-[#0D1B24] text-[#E8F0F5] pb-10">
      <div className="sticky top-0 z-40 bg-[#111E28] border-b border-[#1E3040] px-4 py-3 flex items-center gap-3">
        <Link to="/admin" className="text-[#7A9BAD] hover:text-[#E8F0F5]"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{tournament.name}</h1>
          <p className="text-xs text-[#7A9BAD] capitalize">{tournament.format.replace('_', ' ')} · {tournament.status}</p>
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
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#1B4D5C,#0F2A34)' }}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="text-4xl">🏆</div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Champion</p>
                <p className="font-bold text-xl text-white">{champion.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Draft: player selection */}
        {isDraft && (
          <section>
            <h2 className="font-bold text-base uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users size={16} /> Select Participants
            </h2>
            <div className="bg-[#162330] border border-[#1E3040] rounded-2xl overflow-hidden mb-3">
              {allPlayers.map((p, i) => {
                const selected = selectedPlayers.includes(p.id);
                return (
                  <button key={p.id} onClick={() => setSelectedPlayers(prev =>
                    selected ? prev.filter(x => x !== p.id) : [...prev, p.id]
                  )}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${i === allPlayers.length - 1 ? '' : 'border-b border-[#1E3040]'} ${selected ? 'bg-teal-600/10' : 'hover:bg-[#1E3040]'}`}>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-teal-600 border-teal-600' : 'border-[#4A6273]'}`}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-auto text-[#7A9BAD] text-xs font-mono">{p.elo} ELO</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={savePlayers} disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-[#162330] border border-[#1E3040] text-[#E8F0F5] disabled:opacity-60">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save ({selectedPlayers.length} players)
              </button>
              <button onClick={startTournament} disabled={busy || selectedPlayers.length < 2}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-teal-600 text-white disabled:opacity-60">
                <Play size={14} /> Start Tournament
              </button>
            </div>
          </section>
        )}

        {/* Active: enter results */}
        {isActive && (
          <>
            {/* Group matches */}
            {Object.entries(groupByLabel).sort().map(([groupLabel, gMatches]) => (
              <section key={groupLabel}>
                <h2 className="font-bold text-base uppercase tracking-wide mb-2">{groupLabel} — Pending</h2>
                <div className="space-y-2">
                  {gMatches.map(m => (
                    <div key={m.id} className="bg-[#162330] border border-amber-400/20 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{playerName(m.player_a)}</span>
                        <span className="text-[#7A9BAD] text-xs px-2">vs</span>
                        <span>{playerName(m.player_b)}</span>
                      </div>
                      <ScoreInput matchId={m.id} match={m} />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Knockout matches */}
            {knockoutRoundOrder.filter(r => knockoutByRound[r]).map(round => (
              <section key={round}>
                <h2 className="font-bold text-base uppercase tracking-wide mb-2">
                  {ROUND_LABELS[round] || round} — Pending
                </h2>
                <div className="space-y-2">
                  {knockoutByRound[round].map(m => (
                    <div key={m.id} className="bg-[#162330] border border-amber-400/20 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{playerName(m.player_a)}</span>
                        <span className="text-[#7A9BAD] text-xs px-2">vs</span>
                        <span>{playerName(m.player_b)}</span>
                      </div>
                      <ScoreInput matchId={m.id} match={m} />
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {pendingMatches.length === 0 && (
              <div className="bg-[#162330] border border-[#1E3040] rounded-2xl p-6 text-center">
                <p className="text-[#7A9BAD] text-sm">All matches played! Tournament will complete automatically.</p>
              </div>
            )}
          </>
        )}

        {/* Played matches log */}
        {playedMatches.length > 0 && (
          <section>
            <h2 className="font-bold text-base uppercase tracking-wide mb-2">Results</h2>
            <div className="bg-[#162330] border border-[#1E3040] rounded-2xl overflow-hidden">
              {playedMatches.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-3 px-4 py-3 text-sm ${i === playedMatches.length - 1 ? '' : 'border-b border-[#1E3040]'}`}>
                  <span className={`flex-1 ${m.winner_id === m.player_a ? 'font-bold text-green-400' : ''}`}>{playerName(m.player_a)}</span>
                  <span className="font-mono text-xs text-[#7A9BAD]">{m.score_a} – {m.score_b}</span>
                  <span className={`flex-1 text-right ${m.winner_id === m.player_b ? 'font-bold text-green-400' : ''}`}>{playerName(m.player_b)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Public view link */}
        <Link to={`/tournaments/${id}`}
          className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium border border-[#1E3040] text-[#7A9BAD] hover:text-[#E8F0F5]">
          <Trophy size={16} /> View Public Tournament Page <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
