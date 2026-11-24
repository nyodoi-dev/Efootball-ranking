import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSignedIn } from './api';

// One place that loads the league's data and derives what every page needs,
// so pages don't each fetch and re-sort the same lists.

const LeagueContext = createContext(null);

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used inside <LeagueProvider>');
  return ctx;
}

const list = (d) => (Array.isArray(d) ? d : []);

function getJson(url) {
  return fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return r.json();
  });
}

const EMPTY = { players: [], matches: [], pending: [], season: null, stats: null, trophies: [], cups: [] };

export function LeagueProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [fixtures, setFixtures] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    // Keep showing what we have while refreshing; only blank out on first load.
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    const [pl, ma, pe, se, st, tr, cu] = await Promise.allSettled([
      getJson('/api/players'),
      getJson('/api/matches'),
      getJson('/api/pending'),
      getJson('/api/season'),
      getJson('/api/stats'),
      getJson('/api/trophies'),
      getJson('/api/tournaments'),
    ]);
    // Players and matches are the core of every page; the rest can fail quietly.
    if (pl.status !== 'fulfilled' || ma.status !== 'fulfilled') {
      setStatus('error');
      return;
    }
    const val = (r) => (r.status === 'fulfilled' ? r.value : null);
    const cups = list(val(cu));
    setData({
      players: list(pl.value),
      matches: list(ma.value),
      pending: list(val(pe)),
      season: val(se)?.current !== undefined ? val(se) : null,
      stats: val(st)?.weekly ? val(st) : null,
      trophies: list(val(tr)),
      cups,
    });
    setStatus('ready');

    // Upcoming fixtures are the unplayed games of running tournaments.
    const live = cups.filter((c) => c.status === 'active').slice(0, 4);
    const details = await Promise.allSettled(live.map((c) => getJson(`/api/tournaments/${c.id}`)));
    const next = [];
    details.forEach((d, i) => {
      if (d.status !== 'fulfilled') return;
      const t = live[i];
      list(d.value?.matches).forEach((m) => {
        if (m.status === 'pending' && m.player_a && m.player_b) {
          next.push({
            id: m.id,
            tournamentId: t.id,
            tournamentName: t.name,
            stage: m.stage,
            round: m.round,
            order: m.match_order ?? 0,
            playerA: m.player_a,
            playerB: m.player_b,
          });
        }
      });
    });
    setFixtures(next);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { isSignedIn().then(setIsAdmin); }, []);

  const derived = useMemo(() => {
    const { players, matches, cups, season } = data;
    const playerById = {};
    players.forEach((p) => (playerById[p.id] = p));

    const standings = [...players].sort((a, b) => b.elo - a.elo);

    // Oldest to newest results per player, for form dots and streaks.
    const formByPlayer = {};
    players.forEach((p) => (formByPlayer[p.id] = []));
    [...matches].reverse().forEach((m) => {
      const a = m.score_a > m.score_b ? 'W' : m.score_a < m.score_b ? 'L' : 'D';
      const b = a === 'W' ? 'L' : a === 'L' ? 'W' : 'D';
      if (formByPlayer[m.player_a]) formByPlayer[m.player_a].push(a);
      if (formByPlayer[m.player_b]) formByPlayer[m.player_b].push(b);
    });

    // Matches of the running season (the API returns every season's latest results).
    const seasonId = season?.current?.id;
    const seasonMatches = seasonId ? matches.filter((m) => m.season_id === seasonId) : matches;

    // Goals for/against per player this season.
    const goals = {};
    seasonMatches.forEach((m) => {
      const a = (goals[m.player_a] ||= { gf: 0, ga: 0 });
      const b = (goals[m.player_b] ||= { gf: 0, ga: 0 });
      a.gf += m.score_a; a.ga += m.score_b;
      b.gf += m.score_b; b.ga += m.score_a;
    });

    const liveCups = cups.filter((c) => c.status === 'active');

    // The champion is the winner of the most recently completed tournament.
    const done = cups
      .filter((c) => c.status === 'completed' && c.champion_id)
      .sort((a, b) => String(b.completed_at || b.created_at).localeCompare(String(a.completed_at || a.created_at)));
    let champion = null;
    for (const c of done) {
      if (playerById[c.champion_id]) { champion = { player: playerById[c.champion_id], tournament: c }; break; }
    }

    return { playerById, standings, formByPlayer, seasonMatches, goals, liveCups, champion };
  }, [data]);

  const value = useMemo(
    () => ({ ...data, ...derived, fixtures, status, isAdmin, reload: load }),
    [data, derived, fixtures, status, isAdmin, load]
  );

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}
