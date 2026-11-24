import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight, ClipboardCheck, History, Medal, Repeat, ShieldCheck, Trophy, Users } from 'lucide-react';
import { useLeague } from '../lib/league';

// Phone-only destination (the sidebar covers this on desktop).
export default function More() {
  const { pending, isAdmin } = useLeague();
  const rows = [
    { to: '/players', label: 'Players', desc: 'Everyone in the league', Icon: Users },
    { to: '/tournaments', label: 'Tournaments', desc: 'Cups, brackets and winners', Icon: Medal },
    { to: '/stats', label: 'Statistics', desc: 'Who is climbing and scoring', Icon: BarChart3 },
    { to: '/head-to-head', label: 'Head-to-Head', desc: 'Compare any two players', Icon: Repeat },
    { to: '/history', label: 'Match History', desc: 'Every approved result', Icon: History },
    { to: '/hall-of-fame', label: 'Hall of Fame', desc: 'Trophies and past seasons', Icon: Trophy },
    {
      to: '/approvals', label: 'Approvals', Icon: ClipboardCheck,
      desc: pending.length ? `${pending.length} reported ${pending.length === 1 ? 'result' : 'results'} waiting` : 'Nothing waiting',
    },
  ];
  return (
    <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto w-full">
      <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
        {rows.map(({ to, label, desc, Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-card2 transition-colors">
              <Icon size={20} className="text-brand-strong flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink">{label}</span>
                <span className="block text-sm text-muted">{desc}</span>
              </span>
              <ChevronRight size={16} className="text-muted flex-shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link to={isAdmin ? '/admin' : '/admin/login'}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 hover:bg-card2 transition-colors">
        <ShieldCheck size={20} className="text-brand-strong flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink">{isAdmin ? 'Admin panel' : 'Admin'}</span>
          <span className="block text-sm text-muted">{isAdmin ? 'Approve results and manage the league' : 'Sign in to manage the league'}</span>
        </span>
        <ChevronRight size={16} className="text-muted flex-shrink-0" aria-hidden="true" />
      </Link>
    </div>
  );
}
