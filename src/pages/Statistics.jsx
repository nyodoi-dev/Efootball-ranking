import { TrendingUp, Trophy, BarChart3 } from 'lucide-react';
import { useLeague } from '../lib/league';
import { Card, EmptyState, LeagueGate, Page, SectionHeading } from '../components/ui';
import { signed } from '../lib/format';

function Board({ icon: Icon, title, empty, rows }) {
  return (
    <div>
      <p className="text-muted text-xs font-semibold mb-2 flex items-center gap-1.5">
        <Icon size={13} aria-hidden="true" /> {title}
      </p>
      {rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted">{empty}</Card>
      ) : (
        <ol className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="text-ink truncate"><span className="text-muted tabular mr-2">{i + 1}.</span>{r.name}</span>
              <span className={`font-bold tabular flex-shrink-0 ${r.cls}`}>{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Period({ title, data }) {
  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      <div className="grid md:grid-cols-2 gap-4">
        <Board icon={TrendingUp} title="Most ELO gained" empty="No matches yet."
          rows={data.eloLeaders.map((l) => ({ id: l.playerId, name: l.name, value: signed(l.eloGain), cls: l.eloGain >= 0 ? 'text-win' : 'text-danger' }))} />
        <Board icon={Trophy} title={`Best win rate (min ${data.minGames})`} empty="Not enough matches."
          rows={data.winRateLeaders.map((l) => ({ id: l.playerId, name: l.name, value: `${Math.round(l.winRate * 100)}%`, cls: 'text-brand-strong' }))} />
      </div>
    </section>
  );
}

function Stats() {
  const { stats, season } = useLeague();
  if (!stats) {
    return <EmptyState icon={BarChart3} title="Statistics aren't available right now">Try again in a moment.</EmptyState>;
  }
  return (
    <div className="space-y-8">
      <Period title="This week" data={stats.weekly} />
      <Period title="This month" data={stats.monthly} />
      <section>
        <SectionHeading>Top scorers{season?.current ? `, ${season.current.name}` : ''}</SectionHeading>
        {stats.topScorers.length === 0 ? (
          <EmptyState icon={Trophy} title="No goals recorded yet" />
        ) : (
          <ol className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line md:max-w-xl">
            {stats.topScorers.map((s, i) => (
              <li key={s.playerId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-ink truncate"><span className="text-muted tabular mr-2">{i + 1}.</span>{s.name}</span>
                <span className="font-bold tabular text-brand-strong flex-shrink-0">{s.goals} {s.goals === 1 ? 'goal' : 'goals'}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export default function Statistics() {
  return (
    <Page title="Statistics" subtitle="Who is climbing and scoring">
      <LeagueGate>
        <Stats />
      </LeagueGate>
    </Page>
  );
}
