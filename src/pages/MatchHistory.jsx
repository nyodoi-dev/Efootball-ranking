import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { useLeague } from '../lib/league';
import { EmptyState, LeagueGate, Page, inputCls } from '../components/ui';
import { MatchRow } from '../components/MatchRow';

function Log() {
  const { matches, players, playerById } = useLeague();
  const [who, setWho] = useState('');

  const shown = useMemo(
    () => (who ? matches.filter((m) => m.player_a === who || m.player_b === who) : matches),
    [matches, who]
  );

  if (matches.length === 0) {
    return <EmptyState icon={History} title="No matches confirmed yet">Approved results will be listed here.</EmptyState>;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 max-w-xs">
        <label htmlFor="history-player" className="block text-xs text-muted mb-1.5">Show results for</label>
        <select id="history-player" value={who} onChange={(e) => setWho(e.target.value)} className={inputCls}>
          <option value="">All players</option>
          {[...players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={History} title="No matches for this player yet" />
      ) : (
        <>
          <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
            {shown.map((m) => <MatchRow key={m.id} match={m} playerById={playerById} />)}
          </ul>
          <p className="text-xs text-muted text-center mt-3">
            {shown.length} {shown.length === 1 ? 'result' : 'results'}{matches.length >= 200 && !who ? ', the latest 200 shown' : ''}
          </p>
        </>
      )}
    </div>
  );
}

export default function MatchHistory() {
  return (
    <Page title="Match History" subtitle="Every approved result">
      <LeagueGate>
        <Log />
      </LeagueGate>
    </Page>
  );
}
