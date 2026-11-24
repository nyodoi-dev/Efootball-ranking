import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { Avatar, EmptyState, LeagueGate, Page } from '../components/ui';
import { Trophy } from '../components/Logo';
import { TROPHY_TYPES } from '../lib/format';

function Legends() {
  const { playerById, trophies } = useLeague();

  const byPlayer = useMemo(() => {
    const map = {};
    trophies.forEach((t) => { (map[t.player_id] ||= []).push(t); });
    return map;
  }, [trophies]);

  // Most titles first, so the biggest legends lead.
  const ids = Object.keys(byPlayer)
    .filter((id) => playerById[id])
    .sort((x, y) => {
      const wins = (id) => byPlayer[id].filter((t) => t.trophy_type === 'winner').reduce((s, t) => s + t.count, 0);
      return wins(y) - wins(x);
    });

  if (ids.length === 0) {
    return (
      <EmptyState title="No legends yet">
        <span className="block"><Trophy className="w-16 h-[4.5rem] mx-auto mb-3 opacity-80" /></span>
        An admin can award trophies from the Admin Panel.
      </EmptyState>
    );
  }

  return (
    <ul className="grid md:grid-cols-2 gap-4">
      {ids.map((pid) => {
        const player = playerById[pid];
        const list = byPlayer[pid];
        const titles = list.filter((t) => t.trophy_type === 'winner').reduce((s, t) => s + t.count, 0);
        return (
          <li key={pid} className="bg-card border border-line rounded-2xl overflow-hidden">
            <div className="h-1.5 bg-brand" aria-hidden="true" />
            <div className="p-4">
              <Link to={`/players/${pid}`} className="flex items-center gap-3 mb-4 group">
                <Avatar player={player} className="w-14 h-14" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-2xl leading-tight text-ink truncate group-hover:underline">{player.name}</h3>
                  <p className="text-muted text-xs mt-0.5">
                    {titles > 0 ? `${titles} ${titles === 1 ? 'title' : 'titles'} · ` : ''}{list.length} trophy {list.length === 1 ? 'record' : 'records'}
                  </p>
                </div>
              </Link>
              <ul className="space-y-2">
                {list.map((t) => {
                  const info = TROPHY_TYPES[t.trophy_type] || TROPHY_TYPES.winner;
                  return (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                      style={{ background: `${info.color}1F`, borderColor: `${info.color}55` }}>
                      <span className="text-lg flex-shrink-0" aria-hidden="true">{info.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-ink">{t.competition_name}</span>
                        <span className="text-muted text-xs ml-2">{info.label}</span>
                      </div>
                      {t.count > 1 && (
                        <span className="flex-shrink-0 font-bold text-xs px-2 py-0.5 rounded-full bg-brand/15 text-brand-strong tabular">{t.count}×</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function HallOfFame() {
  return (
    <Page title="Hall of Fame" subtitle="Legends of the Super League">
      <LeagueGate>
        <Legends />
      </LeagueGate>
    </Page>
  );
}
