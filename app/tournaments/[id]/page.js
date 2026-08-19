'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Users, Swords, CheckCircle2, Clock } from 'lucide-react';

const ROUND_LABELS = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-Finals', sf: 'Semi-Finals', f: 'Final' };

export default function TournamentPage({ params }) {
  const { id } = params;
  const [data, setData] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tournaments/${id}`, { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/players', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([tData, pData]) => {
      setData(tData);
      setAllPlayers(Array.isArray(pData) ? pData : []);
      setLoading(false);
    });
  }, [id]);

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
        <Link href="/" className="flex items-center gap-2 text-[#7A9BAD] text-sm mb-4 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Link>
        <p className="text-[#7A9BAD] text-sm">Tournament not found.</p>
      </div>
    );
  }

  const { tournament, players, matches } = data;
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
        <Link href="/" className="text-[#7A9BAD] hover:text-[#E8F0F5]"><ArrowLeft size={20} /></Link>
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
                    <MatchCard key={m.id} match={m} playerName={playerName} />
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
                    <MatchCard key={m.id} match={m} playerName={playerName} />
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

function MatchCard({ match, playerName }) {
  const played = match.status === 'played';
  const winnerA = played && match.winner_id === match.player_a;
  const winnerB = played && match.winner_id === match.player_b;

  return (
    <div className={`bg-[#162330] border rounded-xl px-4 py-3 flex items-center gap-3 ${played ? 'border-[#1E3040]' : 'border-amber-400/20'}`}>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${winnerA ? 'text-green-400' : ''} ${!match.player_a ? 'text-[#7A9BAD] italic' : ''}`}>
          {match.player_a ? playerName(match.player_a) : 'TBD'}
        </span>
      </div>
      <div className="font-mono text-sm font-bold text-center w-16">
        {played ? `${match.score_a} – ${match.score_b}` : <span className="text-[#7A9BAD] text-xs">vs</span>}
      </div>
      <div className="flex-1 min-w-0 text-right">
        <span className={`text-sm font-medium ${winnerB ? 'text-green-400' : ''} ${!match.player_b ? 'text-[#7A9BAD] italic' : ''}`}>
          {match.player_b ? playerName(match.player_b) : 'TBD'}
        </span>
      </div>
      {played
        ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
        : <Clock size={14} className="text-amber-400 flex-shrink-0" />
      }
    </div>
  );
}
