import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Crown, Hourglass, Medal, Upload, X } from 'lucide-react';
import { uploadScreenshot } from '../lib/api';
import { useLeague } from '../lib/league';
import { Card, EmptyState, ErrorState, Page, SectionHeading, Skeleton, StatusBadge, inputCls } from '../components/ui';
import { Trophy } from '../components/Logo';
import { CUP_FORMATS, roundLabel } from '../lib/format';

// Works for any bracket size: r64 -> "Round of 64", ordered largest round first.
const roundSize = (r) => ({ f: 2, sf: 4, qf: 8 }[r] || Number(String(r).slice(1)) || 0);

const STATUS_KIND = { draft: 'draft', active: 'live', completed: 'done' };
const STATUS_LABEL = { draft: 'Upcoming', active: 'In progress', completed: 'Completed' };

function StandingsTable({ rows, caption }) {
  return (
    <div className="bg-card border border-line rounded-2xl overflow-hidden">
      <table className="w-full text-sm tabular">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-xs text-muted border-b border-line">
            <th scope="col" className="text-left font-semibold px-4 py-2.5">Player</th>
            <th scope="col" title="Won" className="text-center font-semibold w-9 py-2.5">W</th>
            <th scope="col" title="Drawn" className="text-center font-semibold w-9 py-2.5">D</th>
            <th scope="col" title="Lost" className="text-center font-semibold w-9 py-2.5">L</th>
            <th scope="col" title="Goal difference" className="text-center font-semibold w-10 py-2.5">GD</th>
            <th scope="col" title="Points" className="text-center font-semibold w-11 py-2.5 pr-2">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((tp, i) => (
            <tr key={tp.player_id}>
              <td className="px-4 py-2.5 font-medium text-ink">
                <span className="text-muted mr-2">{i + 1}.</span>{tp.name}
              </td>
              <td className="text-center text-ink">{tp.group_wins}</td>
              <td className="text-center text-ink">{tp.group_draws}</td>
              <td className="text-center text-ink">{tp.group_losses}</td>
              <td className="text-center text-muted">{tp.gd > 0 ? `+${tp.gd}` : tp.gd}</td>
              <td className="text-center font-bold text-brand-strong pr-2">{tp.group_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Header({ tournament }) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-nav/95 backdrop-blur border-b border-line h-14 px-4 flex items-center gap-2">
      <Link to="/tournaments" aria-label="Back to tournaments" className="-ml-2 w-10 h-10 flex items-center justify-center text-muted">
        <ArrowLeft size={20} />
      </Link>
      <h1 className="font-display font-bold text-2xl leading-none text-ink truncate">{tournament?.name || 'Tournament'}</h1>
    </header>
  );
}

export default function TournamentPage() {
  const { id } = useParams();
  const { playerById, reload: reloadLeague } = useLeague();
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}`, { cache: 'no-store' });
      if (res.status === 404) { setState('missing'); return; }
      if (!res.ok) throw new Error();
      const d = await res.json();
      if (!d?.tournament) { setState('missing'); return; }
      setData(d);
      setState('ready');
    } catch { setState('error'); }
  }, [id]);

  useEffect(() => { setState('loading'); setData(null); load(); }, [load]);

  const playerName = (pid) => playerById[pid]?.name || '—';

  const view = useMemo(() => {
    if (!data) return null;
    const { tournament, players, matches } = data;
    const groupMatches = matches.filter((m) => m.stage === 'group');
    const knockoutMatches = matches.filter((m) => m.stage === 'knockout');

    const knockoutByRound = {};
    knockoutMatches.forEach((m) => { (knockoutByRound[m.round] ||= []).push(m); });
    const rounds = Object.keys(knockoutByRound).sort((a, b) => roundSize(b) - roundSize(a));

    const groupByLabel = {};
    groupMatches.forEach((m) => { (groupByLabel[m.round] ||= []).push(m); });

    const row = (tp) => ({
      ...tp,
      name: playerById[tp.player_id]?.name || 'Unknown',
      gd: (tp.group_goals_for || 0) - (tp.group_goals_against || 0),
    });
    const rank = (a, b) => b.group_points - a.group_points || b.gd - a.gd || b.group_goals_for - a.group_goals_for;

    const groups = {};
    players.filter((p) => p.group_number).forEach((tp) => { (groups[`Group ${tp.group_number}`] ||= []).push(row(tp)); });
    Object.values(groups).forEach((arr) => arr.sort(rank));

    const rr = tournament.format === 'round_robin' ? players.map(row).sort(rank) : [];

    return { groupMatches, knockoutMatches, knockoutByRound, rounds, groupByLabel, groups, rr };
  }, [data, playerById]);

  if (state === 'loading') {
    return (
      <>
        <Header />
        <Page><div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-32" /></div></Page>
      </>
    );
  }
  if (state === 'error') return <><Header /><ErrorState message="We couldn't load this tournament." onRetry={() => { setState('loading'); load(); }} /></>;
  if (state === 'missing') {
    return (
      <>
        <Header />
        <Page>
          <EmptyState icon={Medal} title="Tournament not found"
            action={<Link to="/tournaments" className="inline-block rounded-xl bg-brand text-onBrand text-sm font-semibold px-4 py-2 hover:bg-brand-strong transition-colors">All tournaments</Link>}>
            It may have been removed.
          </EmptyState>
        </Page>
      </>
    );
  }

  const { tournament, players } = data;
  const reports = data.reports || [];
  const waitingByMatch = {};
  const screenshotByMatch = {};
  reports.forEach((r) => {
    if (r.status === 'pending') waitingByMatch[r.match_id] = r;
    else if (r.screenshot_url) screenshotByMatch[r.match_id] = r.screenshot_url;
  });
  const cardProps = (m) => ({
    match: m,
    playerName,
    tournamentId: id,
    canReport: tournament.status === 'active',
    waiting: waitingByMatch[m.id],
    screenshot: screenshotByMatch[m.id],
    onReported: async () => { await load(); reloadLeague(); },
  });
  const champion = tournament.champion_id ? playerById[tournament.champion_id] : null;
  const { groupMatches, knockoutMatches, knockoutByRound, rounds, groupByLabel, groups, rr } = view;
  const isGroupFormat = tournament.format === 'group_knockout' || tournament.format === 'round_robin';

  return (
    <>
      <Header tournament={tournament} />
      <Page className="space-y-8 max-w-4xl">
        <Link to="/tournaments" className="hidden lg:inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink -mb-4">
          <ArrowLeft size={15} aria-hidden="true" /> All tournaments
        </Link>

        <div>
          <h1 className="hidden lg:block font-display font-extrabold text-5xl leading-none text-ink">{tournament.name}</h1>
          <div className="flex flex-wrap items-center gap-2 lg:mt-3">
            <StatusBadge kind={STATUS_KIND[tournament.status] || 'draft'} label={STATUS_LABEL[tournament.status]} />
            <span className="text-sm text-muted">{CUP_FORMATS[tournament.format] || tournament.format}</span>
            {tournament.affects_elo ? <span className="text-xs font-semibold rounded-full bg-brand/15 text-brand-strong px-2.5 py-0.5">ELO counts</span> : null}
          </div>
        </div>

        {champion && (
          <section aria-label="Champion" className="relative overflow-hidden rounded-2xl text-white border border-white/10"
            style={{ background: 'radial-gradient(120% 160% at 90% 0%, rgb(208 166 79 / .30), transparent 55%), linear-gradient(135deg, #1a2438, #0e141e)' }}>
            <Trophy className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-24 opacity-90 pointer-events-none" />
            <div className="relative px-5 py-5">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E7C875]"><Crown size={13} aria-hidden="true" /> Champion</p>
              <p className="font-display font-extrabold text-4xl leading-none mt-1.5">{champion.name}</p>
            </div>
          </section>
        )}

        {tournament.format === 'round_robin' && rr.length > 0 && (
          <section>
            <SectionHeading>Standings</SectionHeading>
            <StandingsTable rows={rr} caption={`${tournament.name} standings`} />
          </section>
        )}

        {tournament.format === 'round_robin' && groupMatches.length > 0 && (
          <section>
            <SectionHeading>Fixtures</SectionHeading>
            <div className="grid md:grid-cols-2 gap-2">
              {groupMatches.map((m) => <MatchCard key={m.id} {...cardProps(m)} />)}
            </div>
          </section>
        )}

        {isGroupFormat && tournament.format !== 'round_robin' && Object.keys(groups).length > 0 && (
          <section className="space-y-6">
            {Object.entries(groups).sort().map(([label, gPlayers]) => (
              <div key={label}>
                <SectionHeading>{label}</SectionHeading>
                <div className="grid lg:grid-cols-2 gap-3 items-start">
                  <StandingsTable rows={gPlayers} caption={`${label} standings`} />
                  <div className="space-y-2">
                    {(groupByLabel[label] || []).map((m) => <MatchCard key={m.id} {...cardProps(m)} />)}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {knockoutMatches.length > 0 && (
          <section className="space-y-6">
            <SectionHeading>Knockout stage</SectionHeading>
            {rounds.map((round) => (
              <div key={round}>
                <h3 className="text-sm font-semibold text-muted mb-2">{roundLabel(round)}</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {knockoutByRound[round].map((m) => <MatchCard key={m.id} {...cardProps(m)} />)}
                </div>
              </div>
            ))}
          </section>
        )}

        {groupMatches.length === 0 && knockoutMatches.length === 0 && (
          <EmptyState icon={Medal} title={tournament.status === 'draft' ? 'Draw not made yet' : 'No fixtures yet'}>
            {tournament.status === 'draft' ? 'Fixtures appear once an admin starts the tournament.' : 'Check back soon.'}
          </EmptyState>
        )}

        <section>
          <SectionHeading>Participants ({players.length})</SectionHeading>
          {players.length === 0 ? (
            <EmptyState title="No players entered yet" />
          ) : (
            <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
              {players.map((tp) => (
                <li key={tp.player_id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Link to={`/players/${tp.player_id}`} className="flex-1 font-medium text-ink hover:underline truncate">
                    {playerById[tp.player_id]?.name || 'Unknown'}
                  </Link>
                  {tp.knockout_round === 'champion' && <span className="text-xs font-semibold text-accent">Champion</span>}
                  {tp.eliminated ? <span className="text-xs text-danger font-medium">Eliminated</span> : null}
                  {tp.group_number ? <span className="text-xs text-muted">Group {tp.group_number}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Page>
    </>
  );
}

function MatchCard({ match, playerName, tournamentId, canReport, waiting, screenshot, onReported }) {
  const played = match.status === 'played';
  const bye = played && (!match.player_a || !match.player_b);
  const winnerA = played && match.winner_id === match.player_a;
  const winnerB = played && match.winner_id === match.player_b;
  const ready = !played && match.player_a && match.player_b;

  const [open, setOpen] = useState(false);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (scoreA === '' || scoreB === '') { setError('Enter the score for both players.'); return; }
    if (match.stage === 'knockout' && Number(scoreA) === Number(scoreB)) {
      setError('Knockout matches cannot end in a draw.'); return;
    }
    setBusy(true);
    try {
      let screenshotUrl = null;
      if (file) {
        try { screenshotUrl = await uploadScreenshot(file); }
        catch { setError('Screenshot upload failed. Try again.'); setBusy(false); return; }
      }
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${match.id}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreA, scoreB, submittedBy: name, screenshotUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Could not send the result.'); }
      else { setOpen(false); setScoreA(''); setScoreB(''); setFile(null); await onReported(); }
    } catch { setError('Network error. Try again.'); }
    setBusy(false);
  }

  const small = 'rounded-lg px-2 py-2 text-sm bg-app border border-line text-ink focus:outline-none focus:ring-2 focus:ring-brand/40';
  const side = (pid, won, align) => (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <span className={`block truncate text-sm ${won ? 'font-semibold text-ink' : pid ? 'text-ink' : 'text-muted italic'}`}>
        {pid ? playerName(pid) : bye ? 'Bye' : 'To be decided'}
      </span>
    </div>
  );

  return (
    <div className={`bg-card border rounded-xl px-4 py-3 ${played ? 'border-line' : 'border-accent/30'}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        {side(match.player_a, winnerA, 'left')}
        <div className="font-display font-bold text-xl leading-none text-center min-w-[3.5rem] tabular text-ink">
          {bye ? <span className="text-muted text-xs font-sans font-medium">bye</span>
            : played ? `${match.score_a} – ${match.score_b}`
            : <span className="text-muted text-xs font-sans font-medium">vs</span>}
        </div>
        {side(match.player_b, winnerB, 'right')}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2">
        <StatusBadge kind={played ? 'done' : 'scheduled'} label={played ? 'Played' : 'To play'} />
        {played && screenshot && (
          <a href={screenshot} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-strong hover:underline">
            <Camera size={12} aria-hidden="true" /> Screenshot
          </a>
        )}
      </div>

      {ready && waiting && !open && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-accent">
          <Hourglass size={12} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          Reported {waiting.score_a} – {waiting.score_b} by {waiting.submitted_by || 'a player'}. Waiting for admin approval.
        </p>
      )}

      {ready && canReport && !open && (
        <button onClick={() => setOpen(true)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border border-line text-ink hover:bg-card2 transition-colors">
          <Upload size={12} aria-hidden="true" /> {waiting ? 'Report a different score' : 'Report result'}
        </button>
      )}

      {open && (
        <form onSubmit={submit} className="mt-3 pt-3 border-t border-line space-y-3">
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={99} inputMode="numeric" value={scoreA} onChange={(e) => setScoreA(e.target.value)}
              aria-label={`Goals for ${playerName(match.player_a)}`} placeholder="0" className={`${small} w-16 text-center font-bold tabular`} />
            <span className="text-muted text-sm font-bold" aria-hidden="true">–</span>
            <input type="number" min={0} max={99} inputMode="numeric" value={scoreB} onChange={(e) => setScoreB(e.target.value)}
              aria-label={`Goals for ${playerName(match.player_b)}`} placeholder="0" className={`${small} w-16 text-center font-bold tabular`} />
            <button type="button" onClick={() => { setOpen(false); setError(''); }} aria-label="Cancel"
              className="ml-auto w-9 h-9 flex items-center justify-center text-muted hover:text-ink"><X size={16} /></button>
          </div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
            placeholder="Your name" aria-label="Your name" className={`${inputCls} py-2`} />
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer rounded-lg focus-within:ring-2 focus-within:ring-brand/40 py-1">
            <Camera size={14} className="flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{file ? file.name : 'Add a screenshot of the final score'}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          {error && <p role="alert" className="text-xs text-danger font-medium">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold bg-brand text-onBrand hover:bg-brand-strong transition-colors disabled:opacity-60">
            {busy ? 'Sending…' : 'Send for approval'}
          </button>
        </form>
      )}
    </div>
  );
}
