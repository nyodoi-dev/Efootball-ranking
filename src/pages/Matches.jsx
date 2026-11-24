import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Swords } from 'lucide-react';
import { useLeague } from '../lib/league';
import { EmptyState, LeagueGate, Page, SectionHeading, StatusBadge } from '../components/ui';
import { MatchRow } from '../components/MatchRow';
import { roundLabel } from '../lib/format';

const VIEWS = [
  ['all', 'All'],
  ['upcoming', 'Upcoming'],
  ['completed', 'Completed'],
];

function Upcoming() {
  const { fixtures, playerById } = useLeague();
  if (fixtures.length === 0) {
    return (
      <EmptyState icon={CalendarDays} title="No fixtures scheduled">
        Games from running tournaments show up here.
      </EmptyState>
    );
  }
  return (
    <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
      {fixtures.map((f) => (
        <li key={f.id}>
          <Link to={`/tournaments/${f.tournamentId}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-card2 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink truncate">
                {playerById[f.playerA]?.name || 'TBD'} <span className="text-muted font-normal">vs</span> {playerById[f.playerB]?.name || 'TBD'}
              </div>
              <div className="text-xs text-muted truncate">{f.tournamentName} · {roundLabel(f.round)}</div>
            </div>
            <StatusBadge kind="scheduled" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Completed() {
  const { matches, playerById } = useLeague();
  if (matches.length === 0) {
    return (
      <EmptyState icon={Swords} title="No matches yet"
        action={<Link to="/report" className="inline-block rounded-xl bg-brand text-onBrand text-sm font-semibold px-4 py-2 hover:bg-brand-strong transition-colors">Report a result</Link>}>
        Results appear here once they are approved.
      </EmptyState>
    );
  }
  return (
    <>
      <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
        {matches.slice(0, 30).map((m) => <MatchRow key={m.id} match={m} playerById={playerById} />)}
      </ul>
      <p className="text-center mt-3">
        <Link to="/history" className="text-sm font-semibold text-brand-strong hover:underline">See the full match history</Link>
      </p>
    </>
  );
}

function Centre() {
  const [view, setView] = useState('all');
  return (
    <>
      <div role="group" aria-label="Show matches" className="inline-flex rounded-xl bg-card2 p-1 mb-5">
        {VIEWS.map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} aria-pressed={view === id}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === id ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {(view === 'all' || view === 'upcoming') && (
          <section>
            {view === 'all' && <SectionHeading>Upcoming</SectionHeading>}
            <Upcoming />
          </section>
        )}
        {(view === 'all' || view === 'completed') && (
          <section>
            {view === 'all' && <SectionHeading>Completed</SectionHeading>}
            <Completed />
          </section>
        )}
      </div>
    </>
  );
}

export default function Matches() {
  return (
    <Page title="Matches" subtitle="Fixtures and results">
      <LeagueGate>
        <Centre />
      </LeagueGate>
    </Page>
  );
}
