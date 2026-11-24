import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, ListChecks, Medal, Trophy, Users } from 'lucide-react';
import { useAdmin } from '../lib/admin';
import { AdminPage } from '../components/AdminShell';

export default function AdminOverview() {
  const { players, pending, trophies, season } = useAdmin();

  const cards = [
    {
      to: '/admin/approvals', Icon: ListChecks, title: 'Approvals',
      value: pending.length,
      desc: pending.length === 0 ? 'Nothing waiting for review' : `${pending.length === 1 ? 'Result' : 'Results'} waiting for review`,
      highlight: pending.length > 0,
    },
    { to: '/admin/players', Icon: Users, title: 'Players', value: players.length, desc: 'Add, edit, reset PINs or remove' },
    { to: '/admin/trophies', Icon: Trophy, title: 'Trophies', value: trophies.length, desc: 'Hall of Fame awards' },
    { to: '/admin/seasons', Icon: CalendarDays, title: 'Seasons', value: season?.current?.name || 'None', desc: 'Start a new season or reset everything' },
    { to: '/admin/tournaments', Icon: Medal, title: 'Tournaments', desc: 'Create and run knockout, group or round robin cups' },
  ];

  return (
    <AdminPage title="Overview" subtitle="Everything you manage for the league, in one place.">
      <ul className="grid sm:grid-cols-2 gap-3">
        {cards.map(({ to, Icon, title, value, desc, highlight }) => (
          <li key={to}>
            <Link to={to}
              className={`flex items-center gap-4 bg-card border rounded-2xl px-4 py-4 hover:bg-card2 transition-colors h-full ${
                highlight ? 'border-accent/40' : 'border-line'
              }`}>
              <span className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-brand-strong" aria-hidden="true" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-muted">{title}</span>
                {value !== undefined && (
                  <span className="block font-display font-bold text-3xl leading-none text-ink tabular mt-1 truncate">{value}</span>
                )}
                <span className="block text-xs text-muted mt-1">{desc}</span>
              </span>
              <ChevronRight size={16} className="text-muted flex-shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}
