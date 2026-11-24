import { Link } from 'react-router-dom';
import { CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { useLeague } from '../lib/league';
import { EmptyState, LeagueGate, Page, StatusBadge } from '../components/ui';
import { daysAgo } from '../lib/format';

function Queue() {
  const { pending, playerById, isAdmin } = useLeague();
  const name = (id) => playerById[id]?.name || 'Unknown';

  if (pending.length === 0) {
    return <EmptyState icon={CheckCircle2} title="All results approved">Nothing is waiting for review.</EmptyState>;
  }
  return (
    <div className="max-w-2xl space-y-3">
      {pending.map((m) => (
        <div key={m.id} className="bg-card border border-accent/30 rounded-2xl px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {name(m.player_a)} <span className="text-brand-strong tabular">{m.score_a} – {m.score_b}</span> {name(m.player_b)}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {m.submitted_by ? `Reported by ${m.submitted_by} · ` : ''}{daysAgo(m.created_at)}
              </p>
            </div>
            <StatusBadge kind="pending" />
          </div>
          {m.screenshot_url && (
            <a href={m.screenshot_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-strong text-xs font-semibold mt-2 hover:underline">
              <ImageIcon size={12} aria-hidden="true" /> View screenshot
            </a>
          )}
        </div>
      ))}
      <p className="text-xs text-muted text-center pt-1">
        {isAdmin
          ? <>Review and approve these in the <Link to="/admin/approvals" className="text-brand-strong font-semibold underline">Admin Panel</Link>.</>
          : 'An admin approves each result before it counts.'}
      </p>
    </div>
  );
}

export default function Approvals() {
  return (
    <Page title="Approvals" subtitle="Reported results waiting for review">
      <LeagueGate>
        <Queue />
      </LeagueGate>
    </Page>
  );
}
