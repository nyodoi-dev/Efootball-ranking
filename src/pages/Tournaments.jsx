import { Link } from 'react-router-dom';
import { Medal } from 'lucide-react';
import { useLeague } from '../lib/league';
import { EmptyState, LeagueGate, Page, SectionHeading, StatusBadge } from '../components/ui';
import { CUP_FORMATS } from '../lib/format';

const GROUPS = [
  { status: 'active', title: 'In progress', badge: 'live' },
  { status: 'draft', title: 'Upcoming', badge: 'scheduled' },
  { status: 'completed', title: 'Completed', badge: 'done' },
];

function Centre() {
  const { cups, playerById, isAdmin } = useLeague();

  if (cups.length === 0) {
    return (
      <EmptyState icon={Medal} title="No tournaments yet">
        {isAdmin
          ? <>Create one from the <Link to="/admin/tournaments" className="text-brand-strong font-semibold underline">Admin Panel</Link>.</>
          : 'Admins set tournaments up. They will appear here.'}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      {GROUPS.map(({ status, title, badge }) => {
        const items = cups.filter((c) => c.status === status);
        if (items.length === 0) return null;
        return (
          <section key={status}>
            <SectionHeading>{title}</SectionHeading>
            <ul className="grid md:grid-cols-2 gap-3">
              {items.map((t) => {
                const champ = t.champion_id ? playerById[t.champion_id] : null;
                return (
                  <li key={t.id}>
                    <Link to={`/tournaments/${t.id}`}
                      className="flex items-center gap-3 bg-card border border-line rounded-2xl px-4 py-4 hover:bg-card2 transition-colors h-full">
                      <span className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                        <Medal size={20} className="text-brand-strong" aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-ink truncate">{t.name}</span>
                        <span className="block text-xs text-muted truncate">
                          {CUP_FORMATS[t.format] || t.format}{t.affects_elo ? ' · ELO counts' : ''}
                          {champ ? ` · Winner: ${champ.name}` : ''}
                        </span>
                      </span>
                      <StatusBadge kind={badge} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default function Tournaments() {
  return (
    <Page title="Tournaments" subtitle="Cups, brackets and winners">
      <LeagueGate>
        <Centre />
      </LeagueGate>
    </Page>
  );
}
