import { CheckCircle2, Check, X } from 'lucide-react';
import { useAdmin, btn } from '../lib/admin';
import { AdminPage } from '../components/AdminShell';
import { EmptyState, StatusBadge } from '../components/ui';
import { daysAgo } from '../lib/format';

export default function AdminApprovals() {
  const { pending, playerName, busy, act, notify, reload } = useAdmin();

  const decide = (id, method, fail, ok) =>
    act(async () => {
      const res = await fetch(`/api/pending/${id}`, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify('error', data.error || fail); return; }
      notify('success', ok);
      await reload();
    });

  return (
    <AdminPage title="Approvals" subtitle="Reported results only count once you approve them.">
      {pending.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All caught up">Nothing is waiting for approval.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {pending.map((entry) => (
            <li key={entry.id} className="bg-card border border-accent/30 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {playerName(entry.player_a)}{' '}
                    <span className="font-display font-bold text-xl text-brand-strong tabular mx-1">{entry.score_a} – {entry.score_b}</span>{' '}
                    {playerName(entry.player_b)}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {entry.submitted_by ? `Reported by ${entry.submitted_by} · ` : ''}{daysAgo(entry.created_at)}
                  </p>
                </div>
                <StatusBadge kind="pending" />
              </div>

              {entry.screenshot_url && (
                <a href={entry.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mt-3 w-fit">
                  <img src={entry.screenshot_url} alt={`Screenshot of ${playerName(entry.player_a)} versus ${playerName(entry.player_b)}`}
                    className="max-h-56 rounded-xl border border-line object-contain" />
                </a>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => decide(entry.id, 'POST', 'Could not approve.', 'Result approved.')} disabled={busy} className={btn.primary}>
                  <Check size={15} aria-hidden="true" /> Approve
                </button>
                <button onClick={() => decide(entry.id, 'DELETE', 'Could not reject.', 'Result rejected.')} disabled={busy} className={btn.danger}>
                  <X size={15} aria-hidden="true" /> Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
