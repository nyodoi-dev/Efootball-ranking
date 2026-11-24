import { useEffect, useMemo, useState } from 'react';
import { Loader2, Repeat } from 'lucide-react';
import { useLeague } from '../lib/league';
import { Card, EmptyState, ErrorState, LeagueGate, Page, inputCls } from '../components/ui';

function Compare() {
  const { players, playerById } = useLeague();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const name = (id) => playerById[id]?.name || 'Unknown';

  useEffect(() => {
    if (!a || !b || a === b) { setMatches(null); setFailed(false); return; }
    let live = true;
    setLoading(true);
    setFailed(false);
    fetch(`/api/head-to-head?a=${a}&b=${b}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (live) { setMatches(Array.isArray(d) ? d : []); setLoading(false); } })
      .catch(() => { if (live) { setFailed(true); setLoading(false); } });
    return () => { live = false; };
  }, [a, b, attempt]);

  const summary = useMemo(() => {
    if (!matches || !a || !b) return null;
    let aWins = 0, bWins = 0, draws = 0, aGoals = 0, bGoals = 0;
    matches.forEach((m) => {
      const aIsA = m.player_a === a;
      const ga = aIsA ? m.score_a : m.score_b;
      const gb = aIsA ? m.score_b : m.score_a;
      aGoals += ga; bGoals += gb;
      if (ga > gb) aWins++; else if (ga < gb) bWins++; else draws++;
    });
    return { aWins, bWins, draws, aGoals, bGoals, total: matches.length };
  }, [matches, a, b]);

  const picker = (id, label, value, onChange) => (
    <div>
      <label htmlFor={id} className="block text-xs text-muted mb-1.5">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">Select…</option>
        {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  );

  const ready = a && b && a !== b;
  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {picker('h2h-a', 'Player 1', a, setA)}
        {picker('h2h-b', 'Player 2', b, setB)}
      </div>

      {!ready ? (
        <EmptyState icon={Repeat} title="Pick two players">Choose two different players to see their record.</EmptyState>
      ) : loading ? (
        <Card className="p-8 text-center" role="status" aria-label="Loading">
          <Loader2 size={20} className="animate-spin text-brand-strong mx-auto" />
        </Card>
      ) : failed ? (
        <ErrorState message="We couldn't load that comparison." onRetry={() => setAttempt((n) => n + 1)} />
      ) : summary && summary.total === 0 ? (
        <EmptyState title="No matches between these players yet" />
      ) : summary ? (
        <>
          <Card className="p-5">
            <div className="grid grid-cols-3 text-center items-center">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate text-sm">{name(a)}</div>
                <div className="font-display font-bold text-5xl text-brand-strong mt-1 tabular">{summary.aWins}</div>
                <div className="text-muted text-xs">wins</div>
              </div>
              <div>
                <div className="text-muted text-xs">Draws</div>
                <div className="font-display font-bold text-4xl text-draw mt-1 tabular">{summary.draws}</div>
                <div className="text-muted text-xs">{summary.total} played</div>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate text-sm">{name(b)}</div>
                <div className="font-display font-bold text-5xl text-brand-strong mt-1 tabular">{summary.bWins}</div>
                <div className="text-muted text-xs">wins</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-line text-center text-sm text-muted tabular">
              Goals: {summary.aGoals} – {summary.bGoals}
            </div>
          </Card>
          <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
            {matches.map((m) => (
              <li key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="text-sm text-ink min-w-0 truncate">
                  {name(m.player_a)} <span className="text-muted tabular">{m.score_a} – {m.score_b}</span> {name(m.player_b)}
                </div>
                <div className="text-muted text-xs flex-shrink-0">{new Date(m.approved_at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export default function HeadToHead() {
  return (
    <Page title="Head-to-Head" subtitle="Compare any two players">
      <LeagueGate>
        <Compare />
      </LeagueGate>
    </Page>
  );
}
