
import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Camera, Upload, Hourglass, X } from 'lucide-react';
import { uploadScreenshot } from '../lib/api';

const ROUND_LABELS = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-Finals', sf: 'Semi-Finals', f: 'Final' };

export default function TournamentPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    return Promise.all([
      fetch(`/api/tournaments/${id}`, { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/players', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([tData, pData]) => {
      setData(tData);
      setAllPlayers(Array.isArray(pData) ? pData : []);
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, [id]);

  const playerById = useMemo(() => {
    const m = {};
    allPlayers.forEach(p => (m[p.id] = p));
    return m;
  }, [allPlayers]);

  function playerName(id) { return playerById[id]?.name || '—'; }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <p className="text-[#7A9BAD] text-sm">Loading tournament…</p>
      </div>
    );
  }

  if (!data || !data.tournament) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <Link to="/" className="flex items-center gap-2 text-[#7A9BAD] text-sm mb-4 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Link>
        <p className="text-[#7A9BAD] text-sm">Tournament not found.</p>
      </div>
    );
  }

  const { tournament, players, matches } = data;
  const reports = data.reports || [];
  const waitingByMatch = {};
  const screenshotByMatch = {};
  reports.forEach(r => {
    if (r.status === 'pending') waitingByMatch[r.match_id] = r;
    else if (r.screenshot_url) screenshotByMatch[r.match_id] = r.screenshot_url;
  });
  const cardProps = (m) => ({
    match: m,
    playerName,
    tournamentId: id,
    canReport: tournament.status === 'active',
    waiting: waitingByMatch[m.id],
    screenshot: screenshotByMatch[m.id],
    onReported: load,
  });
  const formatLabel = { knockout: 'Knockout', group_knockout: 'Group + Knockout', round_robin: 'Round Robin' };
  const statusColor = { draft: 'text-[#7A9BAD]', active: 'text-amber-400', completed: 'text-green-500' };

  const champion = tournament.champion_id ? playerById[tournament.champion_id] : null;

  // Group stage data
  const groupMatches = matches.filter(m => m.stage === 'group');
  const knockoutMatches = matches.filter(m => m.stage === 'knockout');

  // Organize knockout by round
  const knockoutByRound = {};
  knockoutMatches.forEach(m => {
    if (!knockoutByRound[m.round]) knockoutByRound[m.round] = [];
    knockoutByRound[m.round].push(m);
  });

  const knockoutRoundOrder = ['r32', 'r16', 'qf', 'sf', 'f'];
  const sortedKnockoutRounds = knockoutRoundOrder.filter(r => knockoutByRound[r]);

  // Organize group stage by group
  const groupByLabel = {};
  groupMatches.forEach(m => {
    if (!groupByLabel[m.round]) groupByLabel[m.round] = [];
    groupByLabel[m.round].push(m);
  });

  // Group standings
  const groupStandings = {};
  players.filter(p => p.group_number).forEach(tp => {
    const g = `Group ${tp.group_number}`;
    if (!groupStandings[g]) groupStandings[g] = [];
    const player = playerById[tp.player_id];
    groupStandings[g].push({
      ...tp,
      name: player?.name || 'Unknown',
      gd: (tp.group_goals_for || 0) - (tp.group_goals_against || 0),
    });
  });
  Object.values(groupStandings).forEach(arr =>
    arr.sort((a, b) => b.group_points - a.group_points || b.gd - a.gd || b.group_goals_for - a.group_goals_for)
  );

  // Round robin standings
  const rrStandings = tournament.format === 'round_robin'
    ? [...players].map(tp => ({
        ...tp,
        name: playerById[tp.player_id]?.name || 'Unknown',
        gd: (tp.group_goals_for || 0) - (tp.group_goals_against || 0),
      })).sort((a, b) => b.group_points - a.group_points || b.gd - a.gd || b.group_goals_for - a.group_goals_for)
    : [];

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-[#0D1B24] text-[#E8F0F5] pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#111E28] border-b border-[#1E3040] px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-[#7A9BAD] hover:text-[#E8F0F5]"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{tournament.name}</h1>
          <p className="text-xs text-[#7A9BAD]">{formatLabel[tournament.format]} · <span className={statusColor[tournament.status] || ''}>{tournament.status}</span></p>
        </div>
        {tournament.affects_elo && (
          <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full">ELO</span>
        )}
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Champion banner */}
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

        {/* Round Robin Standings */}
        {tournament.format === 'round_robin' && (
          <section>
            <h2 className="font-bold text-lg uppercase tracking-wide mb-2">Standings</h2>
            <div className="bg-[#162330] border border-[#1E3040] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] text-xs text-[#7A9BAD] uppercase tracking-wide px-4 py-2 border-b border-[#1E3040]">
                <span>Player</span><span className="w-7 text-center">W</span><span className="w-7 text-center">D</span><span className="w-7 text-center">L</span><span className="w-8 text-center">Pts</span>
              </div>
              {rrStandings.map((tp, i) => (
                <div key={tp.player_id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-4 py-2.5 text-sm ${i === rrStandings.length - 1 ? '' : 'border-b border-[#1E3040]'}`}>
                  <span className="font-medium">{i + 1}. {tp.name}</span>
                  <span className="w-7 text-center text-green-400">{tp.group_wins}</span>
                  <span className="w-7 text-center text-amber-400">{tp.group_draws}</span>
                  <span className="w-7 text-center text-red-400">{tp.group_losses}</span>
                  <span className="w-8 text-center font-bold text-teal-400">{tp.group_points}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tournament.format === 'round_robin' && groupMatches.length > 0 && (
          <section>
            <h2 className="font-bold text-lg uppercase tracking-wide mb-2">Fixtures</h2>
            <div className="space-y-2">
              {groupMatches.map(m => <MatchCard key={m.id} {...cardProps(m)} />)}
            </div>
          </section>
        )}

        {/* Group Stage */}
        {(tournament.format === 'group_knockout' || tournament.format === 'round_robin') && Object.keys(groupStandings).length > 0 && (
          <section className="space-y-4">
            {Object.entries(groupStandings).sort().map(([groupLabel, gPlayers]) => (
              <div key={groupLabel}>
                <h2 className="font-bold text-base uppercase tracking-wide mb-2">{groupLabel}</h2>
                <div className="bg-[#162330] border border-[#1E3040] rounded-2xl overflow-hidden mb-2">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] text-xs text-[#7A9BAD] uppercase tracking-wide px-4 py-2 border-b border-[#1E3040]">
                    <span>Player</span><span className="w-7 text-center">W</span><span className="w-7 text-center">D</span><span className="w-7 text-center">L</span><span className="w-8 text-center">Pts</span>
                  </div>
                  {gPlayers.map((tp, i) => (
                    <div key={tp.player_id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-4 py-2.5 text-sm ${i === gPlayers.length - 1 ? '' : 'border-b border-[#1E3040]'}`}>
                      <span className="font-medium">{i + 1}. {tp.name}</span>
                      <span className="w-7 text-center text-green-400">{tp.group_wins}</span>
                      <span className="w-7 text-center text-amber-400">{tp.group_draws}</span>
                      <span className="w-7 text-center text-red-400">{tp.group_losses}</span>
                      <span className="w-8 text-center font-bold text-teal-400">{tp.group_points}</span>
                    </div>
                  ))}
                </div>
                {/* Group fixtures */}
                <div className="space-y-2">
                  {(groupByLabel[groupLabel] || []).map(m => (
                    <MatchCard key={m.id} {...cardProps(m)} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Knockout bracket */}
        {knockoutMatches.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-bold text-lg uppercase tracking-wide">Knockout Stage</h2>
            {sortedKnockoutRounds.map(round => (
              <div key={round}>
                <h3 className="text-sm font-semibold text-[#7A9BAD] uppercase tracking-wide mb-2">
                  {ROUND_LABELS[round] || round}
                </h3>
                <div className="space-y-2">
                  {knockoutByRound[round].map(m => (
                    <MatchCard key={m.id} {...cardProps(m)} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Participants */}
        <section>
          <h2 className="font-bold text-lg uppercase tracking-wide mb-2">Participants ({players.length})</h2>
          <div className="bg-[#162330] border border-[#1E3040] rounded-2xl overflow-hidden">
            {players.map((tp, i) => (
              <div key={tp.player_id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i === players.length - 1 ? '' : 'border-b border-[#1E3040]'}`}>
                <span className="flex-1 font-medium">{playerById[tp.player_id]?.name || 'Unknown'}</span>
                {tp.knockout_round === 'champion' && <span className="text-amber-400">🏆</span>}
                {tp.eliminated && <span className="text-xs text-red-400">Eliminated</span>}
                {tp.group_number && <span className="text-xs text-[#7A9BAD]">Group {tp.group_number}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MatchCard({ match, playerName, tournamentId, canReport, waiting, screenshot, onReported }) {
  const played = match.status === 'played';
  const bye = played && (!match.player_a || !match.player_b);
  const winnerA = played && match.winner_id === match.player_a;
  const winnerB = played && match.winner_id === match.player_b;
  const ready = !played && match.player_a && match.player_b;

  const [open, setOpen] = useState(false);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (scoreA === '' || scoreB === '') { setError('Enter the score for both players.'); return; }
    if (match.stage === 'knockout' && Number(scoreA) === Number(scoreB)) {
      setError('Knockout matches cannot end in a draw.'); return;
    }
    setBusy(true);
    try {
      let screenshotUrl = null;
      if (file) {
        try { screenshotUrl = await uploadScreenshot(file); }
        catch { setError('Screenshot upload failed. Try again.'); setBusy(false); return; }
      }
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreA, scoreB, submittedBy: name, screenshotUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not send the result.'); }
      else { setOpen(false); setScoreA(''); setScoreB(''); setFile(null); await onReported(); }
    } catch { setError('Network error. Try again.'); }
    setBusy(false);
  }

  const inputCls = 'rounded-lg px-2 py-2 text-sm bg-[#0D1B24] border border-[#1E3040] text-[#E8F0F5]';

  return (
    <div className={`bg-[#162330] border rounded-xl px-4 py-3 ${played ? 'border-[#1E3040]' : 'border-amber-400/20'}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${winnerA ? 'text-green-400' : ''} ${!match.player_a ? 'text-[#7A9BAD] italic' : ''}`}>
            {match.player_a ? playerName(match.player_a) : bye ? 'Bye' : 'TBD'}
          </span>
        </div>
        <div className="font-mono text-sm font-bold text-center w-16">
          {bye ? <span className="text-[#7A9BAD] text-xs">bye</span>
            : played ? `${match.score_a} – ${match.score_b}`
            : <span className="text-[#7A9BAD] text-xs">vs</span>}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <span className={`text-sm font-medium ${winnerB ? 'text-green-400' : ''} ${!match.player_b ? 'text-[#7A9BAD] italic' : ''}`}>
            {match.player_b ? playerName(match.player_b) : bye ? 'Bye' : 'TBD'}
          </span>
        </div>
        {played
          ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
          : <Clock size={14} className="text-amber-400 flex-shrink-0" />
        }
      </div>

      {played && screenshot && (
        <a href={screenshot} target="_blank" rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#7A9BAD] hover:text-[#E8F0F5]">
          <Camera size={12} /> View screenshot
        </a>
      )}

      {ready && waiting && !open && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
          <Hourglass size={12} className="flex-shrink-0" />
          Reported {waiting.score_a} – {waiting.score_b} by {waiting.submitted_by}. Waiting for admin approval.
        </p>
      )}

      {ready && canReport && !open && (
        <button onClick={() => setOpen(true)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-[#1E3040] text-[#E8F0F5] hover:bg-[#1E3040]">
          <Upload size={12} /> {waiting ? 'Report a different score' : 'Report result'}
        </button>
      )}

      {open && (
        <form onSubmit={submit} className="mt-3 pt-3 border-t border-[#1E3040] space-y-3">
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={99} inputMode="numeric" value={scoreA} onChange={e => setScoreA(e.target.value)}
              aria-label={`Goals for ${playerName(match.player_a)}`} placeholder="0"
              className={`${inputCls} w-16 text-center font-mono`} />
            <span className="text-[#7A9BAD] text-sm font-bold">–</span>
            <input type="number" min={0} max={99} inputMode="numeric" value={scoreB} onChange={e => setScoreB(e.target.value)}
              aria-label={`Goals for ${playerName(match.player_b)}`} placeholder="0"
              className={`${inputCls} w-16 text-center font-mono`} />
            <button type="button" onClick={() => { setOpen(false); setError(''); }} aria-label="Cancel"
              className="ml-auto text-[#7A9BAD] hover:text-[#E8F0F5]"><X size={16} /></button>
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={40}
            placeholder="Your name" aria-label="Your name" className={`${inputCls} w-full px-3`} />
          <label className="flex items-center gap-2 text-xs text-[#7A9BAD] cursor-pointer">
            <Camera size={14} className="flex-shrink-0" />
            <span className="truncate">{file ? file.name : 'Add a screenshot of the final score'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-teal-600 text-white disabled:opacity-60">
            {busy ? 'Sending…' : 'Send for approval'}
          </button>
        </form>
      )}
    </div>
  );
}
