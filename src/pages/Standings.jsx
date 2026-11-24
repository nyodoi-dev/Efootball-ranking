import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useLeague } from '../lib/league';
import { Avatar, EmptyState, FormDots, LeagueGate, Page } from '../components/ui';
import { signed } from '../lib/format';

function Table() {
  const { standings, formByPlayer, goals, matches } = useLeague();
  if (standings.length === 0) {
    return <EmptyState icon={Users} title="No players yet">An admin adds players from the admin page.</EmptyState>;
  }
  const rankCls = (i) => (i === 0 ? 'text-brand-strong' : 'text-muted');
  const g = (p) => goals[p.id] || { gf: 0, ga: 0 };

  return (
    <>
      {/* Phones: one compact row per player. */}
      <ol className="md:hidden bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
        {standings.map((p, i) => (
          <li key={p.id}>
            <Link to={`/players/${p.id}`} className="relative flex items-center gap-3 px-4 py-3.5 hover:bg-card2 transition-colors">
              {i === 0 && <span className="absolute left-0 inset-y-0 w-1 bg-brand" aria-hidden="true" />}
              <span className={`w-7 text-center font-display font-bold text-2xl leading-none tabular ${rankCls(i)}`}>
                {i + 1}<span className="sr-only">.</span>
              </span>
              <Avatar player={p} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{p.name}</div>
                <div className="mt-1"><FormDots form={formByPlayer[p.id]} /></div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display font-bold text-2xl leading-none text-ink tabular">{p.elo}</div>
                <div className="text-xs text-muted mt-1 tabular">{p.wins}W {p.draws}D {p.losses}L</div>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      {/* Tablet and desktop: the full table. */}
      <div className="hidden md:block bg-card border border-line rounded-2xl overflow-x-auto">
        <table className="w-full text-sm tabular">
          <caption className="sr-only">League standings, ranked by ELO</caption>
          <thead>
            <tr className="text-xs text-muted border-b border-line">
              <th scope="col" className="text-left font-semibold px-4 py-3 w-12">#</th>
              <th scope="col" className="text-left font-semibold px-2 py-3">Player</th>
              <th scope="col" className="text-right font-semibold px-3 py-3">ELO</th>
              <th scope="col" title="Played" className="text-right font-semibold px-3 py-3">P</th>
              <th scope="col" title="Won" className="text-right font-semibold px-3 py-3">W</th>
              <th scope="col" title="Drawn" className="text-right font-semibold px-3 py-3">D</th>
              <th scope="col" title="Lost" className="text-right font-semibold px-3 py-3">L</th>
              <th scope="col" title="Goals for" className="text-right font-semibold px-3 py-3">GF</th>
              <th scope="col" title="Goals against" className="text-right font-semibold px-3 py-3">GA</th>
              <th scope="col" title="Goal difference" className="text-right font-semibold px-3 py-3">GD</th>
              <th scope="col" className="text-left font-semibold px-4 py-3">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {standings.map((p, i) => {
              const { gf, ga } = g(p);
              return (
                <tr key={p.id} className="hover:bg-card2 transition-colors">
                  <td className={`px-4 py-3 font-display font-bold text-xl ${rankCls(i)} ${i === 0 ? 'shadow-[inset_4px_0_0_rgb(var(--brand))]' : ''}`}>{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <Link to={`/players/${p.id}`} className="flex items-center gap-3 font-semibold text-ink hover:underline">
                      <Avatar player={p} className="w-9 h-9" /> <span className="truncate">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-display font-bold text-lg text-ink">{p.elo}</td>
                  <td className="px-3 py-3 text-right text-muted">{p.wins + p.draws + p.losses}</td>
                  <td className="px-3 py-3 text-right text-ink">{p.wins}</td>
                  <td className="px-3 py-3 text-right text-ink">{p.draws}</td>
                  <td className="px-3 py-3 text-right text-ink">{p.losses}</td>
                  <td className="px-3 py-3 text-right text-muted">{gf}</td>
                  <td className="px-3 py-3 text-right text-muted">{ga}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${gf - ga > 0 ? 'text-win' : gf - ga < 0 ? 'text-danger' : 'text-muted'}`}>{signed(gf - ga)}</td>
                  <td className="px-4 py-3"><FormDots form={formByPlayer[p.id]} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted mt-3 text-center md:text-left">
        Ranked by ELO. Goals count this season's results{matches.length >= 200 ? ', from the latest 200 matches' : ''}.
      </p>
    </>
  );
}

export default function Standings() {
  return (
    <Page title="Standings" subtitle="Ranked by ELO rating">
      <LeagueGate>
        <Table />
      </LeagueGate>
    </Page>
  );
}
