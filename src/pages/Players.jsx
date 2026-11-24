import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { useLeague } from '../lib/league';
import { Avatar, EmptyState, FormDots, LeagueGate, Page, inputCls } from '../components/ui';

function Directory() {
  const { standings, formByPlayer } = useLeague();
  const [q, setQ] = useState('');

  // Rank is the position in the ELO table, whatever the search shows.
  const rank = useMemo(() => {
    const m = {};
    standings.forEach((p, i) => (m[p.id] = i + 1));
    return m;
  }, [standings]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? standings.filter((p) => p.name.toLowerCase().includes(needle)) : standings;
  }, [standings, q]);

  if (standings.length === 0) {
    return <EmptyState icon={Users} title="No players yet">An admin adds players from the admin page.</EmptyState>;
  }

  return (
    <>
      <div className="relative mb-5 max-w-md">
        <label htmlFor="player-search" className="sr-only">Search players</label>
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
        <input id="player-search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search players" className={`${inputCls} pl-10`} />
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Search} title="No players match">Try a different name.</EmptyState>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((p) => (
            <li key={p.id}>
              <Link to={`/players/${p.id}`}
                className="flex items-center gap-3 bg-card border border-line rounded-2xl px-4 py-3.5 hover:bg-card2 transition-colors h-full">
                <Avatar player={p} className="w-12 h-12" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate">{p.name}</div>
                  <div className="text-xs text-muted tabular mt-0.5">
                    Rank {rank[p.id]} · {p.wins}W {p.draws}D {p.losses}L
                  </div>
                  <div className="mt-1.5"><FormDots form={formByPlayer[p.id]} /></div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display font-bold text-2xl leading-none text-ink tabular">{p.elo}</div>
                  <div className="text-[11px] text-muted mt-0.5">ELO</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function Players() {
  return (
    <Page title="Players" subtitle="Everyone in the league">
      <LeagueGate>
        <Directory />
      </LeagueGate>
    </Page>
  );
}
