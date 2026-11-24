import { Link } from 'react-router-dom';
import {
  Swords, Flame, Target, Medal, Users, Plus, ListOrdered, ClipboardCheck, ChevronRight,
  CalendarDays, Crown, Percent, Trophy as TrophyIcon,
} from 'lucide-react';
import { useLeague } from '../lib/league';
import { Avatar, Card, EmptyState, LeagueGate, PageSkeleton, SectionHeading, StatusBadge } from '../components/ui';
import { Trophy } from '../components/Logo';
import { MatchRow } from '../components/MatchRow';
import { roundLabel } from '../lib/format';

// League-wide dashboard. Every name, number and date comes from the league's
// own data; sections with nothing to show say so instead of inventing content.

function Hero({ champion, season }) {
  const seasonName = season?.current?.name || 'Between seasons';
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden rounded-3xl text-white border border-white/10"
      style={{ background: 'radial-gradient(120% 140% at 85% 20%, rgb(208 166 79 / .30), transparent 55%), linear-gradient(135deg, #1a2438 0%, #0e141e 100%)' }}
    >
            <div className="trophy-stage absolute right-3 sm:right-10 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
        <span className="trophy-halo" />
        <Trophy className="trophy-glow relative w-28 h-32 sm:w-40 sm:h-44 lg:w-52 lg:h-56" />
        <svg className="trophy-spark s1" viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" fill="#F6E3A1" /></svg>
        <svg className="trophy-spark s2" viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" fill="#F6E3A1" /></svg>
        <svg className="trophy-spark s3" viewBox="0 0 24 24"><path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" fill="#F6E3A1" /></svg>
      </div>
      <div className="relative px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 max-w-[70%] sm:max-w-[62%]">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-brand text-onBrand text-xs font-bold uppercase tracking-wider px-2.5 py-1">
          <Crown size={13} aria-hidden="true" /> {champion ? 'Current champion' : seasonName}
        </span>
        <h1 id="hero-title" className="font-display font-extrabold uppercase text-4xl sm:text-5xl lg:text-6xl leading-[0.95] mt-3">
          The race for glory
        </h1>
        <p className="mt-3 text-sm sm:text-base text-white/85">One league. One champion. Every match counts.</p>

        {champion ? (
          <div className="mt-5 flex items-center gap-3">
            <Avatar player={champion.player} className="w-11 h-11" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#E7C875]">Reigning champion</div>
              <div className="font-semibold text-lg leading-tight truncate">{champion.player.name}</div>
              <div className="text-xs text-white/65 truncate">{champion.tournament.name}</div>
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-white/70">No champion recorded yet.</p>
        )}
      </div>
    </section>
  );
}

function PendingBanner({ count }) {
  if (!count) return null;
  return (
    <Link to="/approvals"
      className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 hover:bg-accent/15 transition-colors">
      <ClipboardCheck size={18} className="text-accent flex-shrink-0" aria-hidden="true" />
      <span className="flex-1 text-sm text-ink">
        <span className="font-semibold">{count} {count === 1 ? 'result' : 'results'}</span> waiting for approval
      </span>
      <ChevronRight size={16} className="text-muted" aria-hidden="true" />
    </Link>
  );
}

function Snapshot({ players, seasonMatches, standings, liveCups }) {
  const leader = standings[0];
  const tiles = [
    { Icon: Users, value: players.length, label: players.length === 1 ? 'Player' : 'Players' },
    { Icon: Swords, value: seasonMatches.length, label: seasonMatches.length === 1 ? 'Match played' : 'Matches played' },
    { Icon: ListOrdered, value: leader ? leader.elo : '—', label: leader ? `Top ELO, ${leader.name}` : 'Top ELO' },
    { Icon: Medal, value: liveCups.length, label: liveCups.length === 1 ? 'Cup in progress' : 'Cups in progress' },
  ];
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="font-display font-bold text-2xl leading-none text-ink">League snapshot</h2>
      <p className="text-sm text-muted mt-1.5">The battle for the title continues. Keep pushing up the table.</p>
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {tiles.map(({ Icon, value, label }) => (
          <li key={label} className="rounded-xl bg-card2 px-3 py-3 text-center min-w-0">
            <Icon size={18} className="text-brand-strong mx-auto" aria-hidden="true" />
            <div className="font-display font-bold text-3xl leading-none text-ink tabular mt-2">{value}</div>
            <div className="text-xs text-muted mt-1.5 truncate">{label}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuickActions() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Link to="/report"
        className="flex items-center gap-3 rounded-2xl bg-brand text-onBrand px-4 py-3.5 hover:bg-brand-strong transition-colors">
        <span className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center flex-shrink-0">
          <Plus size={20} aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold">Report Match</span>
          <span className="block text-sm opacity-80">Submit a result</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
      <Link to="/standings"
        className="flex items-center gap-3 rounded-2xl bg-card border border-line px-4 py-3.5 hover:bg-card2 transition-colors">
        <span className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
          <TrophyIcon size={19} className="text-brand-strong" aria-hidden="true" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink">View Standings</span>
          <span className="block text-sm text-muted">Check the league table</span>
        </span>
        <ChevronRight size={18} className="text-muted" aria-hidden="true" />
      </Link>
    </div>
  );
}

function RecentMatches({ matches, playerById }) {
  const latest = matches.slice(0, 5);
  return (
    <section>
      <SectionHeading to="/history" action="View all">Recent matches</SectionHeading>
      {latest.length === 0 ? (
        <EmptyState icon={Swords} title="No matches yet"
          action={<Link to="/report" className="inline-block rounded-xl bg-brand text-onBrand text-sm font-semibold px-4 py-2 hover:bg-brand-strong transition-colors">Report a result</Link>}>
          Results appear here once they are approved.
        </EmptyState>
      ) : (
        <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
          {latest.map((m) => <MatchRow key={m.id} match={m} playerById={playerById} />)}
        </ul>
      )}
    </section>
  );
}

function StandingsPreview({ standings }) {
  const top = standings.slice(0, 5);
  return (
    <section>
      <SectionHeading to="/standings" action="Full table">Top of the table</SectionHeading>
      {top.length === 0 ? (
        <EmptyState icon={Users} title="No players yet">An admin adds players from the admin page.</EmptyState>
      ) : (
        <ol className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
          {top.map((p, i) => (
            <li key={p.id}>
              <Link to={`/players/${p.id}`} className="relative flex items-center gap-3 px-4 py-3 hover:bg-card2 transition-colors">
                {i === 0 && <span className="absolute left-0 inset-y-0 w-1 bg-brand" aria-hidden="true" />}
                <span className={`w-6 text-center font-display font-extrabold text-2xl leading-none tabular ${i === 0 ? 'text-brand-strong' : 'text-muted'}`}>
                  {i + 1}<span className="sr-only">.</span>
                </span>
                <Avatar player={p} className="w-10 h-10" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate">{p.name}</div>
                  <div className="text-xs text-muted tabular">{p.wins}W {p.draws}D {p.losses}L</div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-2xl leading-none text-ink tabular">{p.elo}</div>
                  <div className="text-[11px] text-muted mt-0.5">ELO</div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Fixtures({ fixtures, liveCups, playerById }) {
  const next = fixtures.slice(0, 4);
  return (
    <section>
      <SectionHeading to="/matches" action="View all">Upcoming fixtures</SectionHeading>
      {next.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No fixtures scheduled">Games from running tournaments show up here.</EmptyState>
      ) : (
        <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
          {next.map((f) => (
            <li key={f.id}>
              <Link to={`/tournaments/${f.tournamentId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-card2 transition-colors">
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
      )}
      {liveCups.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {liveCups.map((c) => (
            <Link key={c.id} to={`/tournaments/${c.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:bg-card2 transition-colors">
              <Medal size={13} className="text-brand-strong" aria-hidden="true" /> {c.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Performers({ stats, standings, formByPlayer }) {
  const cards = [];

  const scorer = stats?.topScorers?.[0];
  if (scorer) cards.push({ key: 'scorer', Icon: Target, label: 'Top scorer', name: scorer.name, value: `${scorer.goals} ${scorer.goals === 1 ? 'goal' : 'goals'}`, to: `/players/${scorer.playerId}` });

  const mostWins = [...standings].sort((a, b) => b.wins - a.wins)[0];
  if (mostWins && mostWins.wins > 0) cards.push({ key: 'wins', Icon: TrophyIcon, label: 'Most wins', name: mostWins.name, value: `${mostWins.wins} ${mostWins.wins === 1 ? 'win' : 'wins'}`, to: `/players/${mostWins.id}` });

  const monthly = stats?.monthly?.winRateLeaders?.[0];
  const weekly = stats?.weekly?.winRateLeaders?.[0];
  const rate = monthly || weekly;
  if (rate) cards.push({ key: 'rate', Icon: Percent, label: `Best win rate, ${monthly ? 'this month' : 'this week'}`, name: rate.name, value: `${Math.round(rate.winRate * 100)}% over ${rate.games} ${rate.games === 1 ? 'game' : 'games'}`, to: `/players/${rate.playerId}` });

  let hot = null;
  standings.forEach((p) => {
    const form = formByPlayer[p.id] || [];
    let n = 0;
    for (let i = form.length - 1; i >= 0 && form[i] === 'W'; i--) n++;
    if (n >= 2 && (!hot || n > hot.n)) hot = { p, n };
  });
  if (hot) cards.push({ key: 'streak', Icon: Flame, label: 'Hottest streak', name: hot.p.name, value: `${hot.n} wins in a row`, to: `/players/${hot.p.id}` });

  return (
    <section>
      <SectionHeading to="/stats" action="More stats">Top performers</SectionHeading>
      {cards.length === 0 ? (
        <EmptyState icon={Target} title="No stats yet">Leaders appear once matches have been played.</EmptyState>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map(({ key, Icon, label, name, value, to }) => (
            <li key={key}>
              <Link to={to} className="flex items-center gap-3 bg-card border border-line rounded-2xl px-4 py-3.5 hover:bg-card2 transition-colors h-full">
                <span className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-brand-strong" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted">{label}</span>
                  <span className="block font-semibold text-ink truncate">{name}</span>
                  <span className="block text-sm text-muted">{value}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Home() {
  const league = useLeague();
  return (
    <LeagueGate skeleton={<PageSkeleton />}>
      <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-8 max-w-6xl mx-auto w-full space-y-6">
        <Hero champion={league.champion} season={league.season} />
        <PendingBanner count={league.pending.length} />
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6 min-w-0">
            <Snapshot players={league.players} seasonMatches={league.seasonMatches} standings={league.standings} liveCups={league.liveCups} />
            <QuickActions />
            <RecentMatches matches={league.matches} playerById={league.playerById} />
          </div>
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <StandingsPreview standings={league.standings} />
            <Fixtures fixtures={league.fixtures} liveCups={league.liveCups} playerById={league.playerById} />
          </div>
        </div>
        <Performers stats={league.stats} standings={league.standings} formByPlayer={league.formByPlayer} />
      </div>
    </LeagueGate>
  );
}
