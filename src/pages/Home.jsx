
import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Swords, Medal, History, Repeat, Users, Image as ImageIcon,
  Loader2, BarChart3, ShieldCheck, Home as HomeIcon, ListOrdered,
  ClipboardCheck, User, CheckCircle2, TrendingUp, Sun, Moon,
  ChevronRight, LayoutGrid, Flame, ArrowLeft,
} from 'lucide-react';
import { useDarkMode } from '../lib/theme';
import { uploadScreenshot } from '../lib/api';

const DarkContext = createContext(false);
function useDark() { return useContext(DarkContext); }

const TROPHY_TYPES = {
  winner:        { label: 'Winner',       emoji: '🏆', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  runner_up:     { label: 'Runner Up',    emoji: '🥈', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' },
  golden_boot:   { label: 'Golden Boot',  emoji: '👟', color: '#059669', bg: '#ECFDF5', border: '#6EE7B7' },
  golden_glove:  { label: 'Golden Glove', emoji: '🧤', color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  top_scorer:    { label: 'Top Scorer',   emoji: '⭐', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  season_mvp:    { label: 'Season MVP',   emoji: '🏅', color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' },
};

function useTheme() {
  const dark = useDark();
  return {
    bg: 'bg-app',
    card: 'bg-card',
    border: 'border-line',
    ink: 'text-ink',
    muted: 'text-muted',
    navBg: 'bg-nav',
    navBorder: 'border-line',
    inputBg: 'bg-card border-line text-ink',
    hover: 'hover:bg-app',
    dark,
  };
}

function FormDots({ form }) {
  const last5 = (form || []).slice(-5).reverse();
  const slots = [...last5, ...Array(5 - last5.length).fill(null)];
  return (
    <div className="flex gap-1 mt-1">
      {slots.map((r, i) => {
        let bg = '#4A6273';
        if (r === 'W') bg = '#27AE60';
        if (r === 'D') bg = '#F0A500';
        if (r === 'L') bg = '#E74C3C';
        return <div key={i} className="w-2 h-2 rounded-sm" style={{ background: bg }} />;
      })}
    </div>
  );
}

function SectionTitle({ children }) {
  const { ink } = useTheme();
  return <h2 className={`font-display font-bold text-3xl leading-none ${ink} mb-3`}>{children}</h2>;
}

/* ── HOME TAB ── */
function Avatar({ player, className = 'w-10 h-10' }) {
  return player?.team_picture_url ? (
    <img src={player.team_picture_url} alt="" className={`${className} rounded-xl object-cover flex-shrink-0 border border-line`} />
  ) : (
    <div className={`${className} rounded-xl bg-brand/10 flex-shrink-0 flex items-center justify-center border border-line`}>
      <User size={16} className="text-brand" />
    </div>
  );
}

function daysAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const CUP_FORMATS = { knockout: 'Knockout', group_knockout: 'Groups then knockout', round_robin: 'Round robin' };

function HomeHeading({ children, action, onAction }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <h2 className="font-display font-bold text-2xl leading-none text-ink">{children}</h2>
      {action && (
        <button onClick={onAction} className="text-sm font-semibold text-brand py-1">{action}</button>
      )}
    </div>
  );
}

function HomeTab({ players, standings, matches, pending, season, stats, cups, formByPlayer, playerById, setTab, dark, toggleDark }) {
  const top = standings.slice(0, 3);
  const latest = matches.slice(0, 5);
  const liveCups = cups.filter((c) => c.status === 'active');
  const scorer = stats?.topScorers?.[0];
  const streaks = standings
    .map((p) => {
      const form = formByPlayer[p.id] || [];
      let n = 0;
      for (let i = form.length - 1; i >= 0 && form[i] === 'W'; i--) n++;
      return { p, n };
    })
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Masthead: the centre circle of a pitch, seen from the halfway line */}
      <header className="relative overflow-hidden bg-turf text-white px-5 pt-5 pb-8"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0 44px, transparent 44px 88px)' }}>
        <svg aria-hidden="true" className="absolute inset-x-0 bottom-0 w-full h-full" viewBox="0 0 400 200"
          preserveAspectRatio="xMidYMax slice" fill="none" stroke="white" strokeOpacity=".22" strokeWidth="2">
          <circle cx="200" cy="200" r="84" />
          <line x1="0" y1="199" x2="400" y2="199" />
          <circle cx="200" cy="200" r="4" fill="white" fillOpacity=".4" stroke="none" />
        </svg>
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white/75 text-sm font-medium">{season?.current?.name || 'Between seasons'}</p>
            <h1 className="font-display font-extrabold text-[3.25rem] leading-[0.9] mt-1">Super League</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleDark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center">
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link to="/admin" aria-label="Admin" className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center">
              <ShieldCheck size={17} />
            </Link>
          </div>
        </div>
        <p className="relative text-white/85 text-sm mt-4">
          {players.length} {players.length === 1 ? 'player' : 'players'}, {matches.length} {matches.length === 1 ? 'match' : 'matches'} played
        </p>
      </header>

      <div className="px-4 pt-6 pb-28 space-y-7">
        {pending.length > 0 && (
          <button onClick={() => setTab('approval')}
            className="w-full flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-left">
            <ClipboardCheck size={18} className="text-accent flex-shrink-0" />
            <span className="flex-1 text-sm text-ink">
              <span className="font-semibold">{pending.length} {pending.length === 1 ? 'result' : 'results'}</span> waiting for approval
            </span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        )}

        <section>
          <HomeHeading action="Full table" onAction={() => setTab('leaderboard')}>Top of the table</HomeHeading>
          {top.length === 0 ? (
            <p className="bg-card border border-line rounded-2xl px-4 py-6 text-sm text-muted text-center">
              No players yet. An admin adds them from the admin page.
            </p>
          ) : (
            <ol className="bg-card border border-line rounded-2xl overflow-hidden">
              {top.map((p, i) => (
                <li key={p.id} className={i > 0 ? 'border-t border-line' : ''}>
                  <Link to={`/players/${p.id}`} className={`relative flex items-center gap-3 px-4 ${i === 0 ? 'py-4' : 'py-3'}`}>
                    {i === 0 && <span className="absolute left-0 inset-y-0 w-1.5 bg-accent" aria-hidden="true" />}
                    <span className={`font-display font-extrabold w-8 text-center leading-none ${i === 0 ? 'text-5xl text-ink' : 'text-3xl text-muted'}`}>{i + 1}</span>
                    <Avatar player={p} className={i === 0 ? 'w-14 h-14' : 'w-10 h-10'} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-ink truncate ${i === 0 ? 'text-lg' : ''}`}>{p.name}</div>
                      <div className="text-muted text-xs mt-0.5">{p.wins}W {p.draws}D {p.losses}L</div>
                    </div>
                    <div className={`font-display font-bold text-ink leading-none ${i === 0 ? 'text-4xl' : 'text-2xl'}`}>{p.elo}</div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {liveCups.length > 0 && (
          <section>
            <HomeHeading>Cups in progress</HomeHeading>
            <div className="space-y-2">
              {liveCups.map((c) => (
                <Link key={c.id} to={`/tournaments/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-brand text-onBrand px-4 py-3.5">
                  <Medal size={22} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="text-sm opacity-80">{CUP_FORMATS[c.format] || c.format}. Tap to see fixtures and report a result.</div>
                  </div>
                  <ChevronRight size={18} className="flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <HomeHeading action={matches.length > 0 ? 'All results' : null} onAction={() => setTab('history')}>Latest results</HomeHeading>
          {latest.length === 0 ? (
            <div className="bg-card border border-line rounded-2xl px-4 py-6 text-center">
              <p className="text-sm text-muted">No matches this season yet.</p>
              <button onClick={() => setTab('submit')} className="mt-3 rounded-xl bg-brand text-onBrand text-sm font-semibold px-4 py-2">Report a result</button>
            </div>
          ) : (
            <ul className="bg-card border border-line rounded-2xl overflow-hidden">
              {latest.map((m, i) => {
                const aWon = m.score_a > m.score_b;
                const bWon = m.score_b > m.score_a;
                return (
                  <li key={m.id} className={`px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`flex-1 min-w-0 truncate text-right ${aWon ? 'font-semibold text-ink' : 'text-muted'}`}>{playerById[m.player_a]?.name || 'Former player'}</span>
                      <span className="font-display font-bold text-xl text-ink leading-none px-2 whitespace-nowrap">{m.score_a} : {m.score_b}</span>
                      <span className={`flex-1 min-w-0 truncate ${bWon ? 'font-semibold text-ink' : 'text-muted'}`}>{playerById[m.player_b]?.name || 'Former player'}</span>
                    </div>
                    <p className="text-center text-xs text-muted mt-1">{daysAgo(m.approved_at)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {(streaks.length > 0 || scorer) && (
          <section>
            <HomeHeading action="More stats" onAction={() => setTab('stats')}>In form</HomeHeading>
            <ul className="bg-card border border-line rounded-2xl overflow-hidden">
              {streaks.map(({ p, n }, i) => (
                <li key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-line' : ''}`}>
                  <Flame size={18} className="text-accent flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate font-semibold text-ink">{p.name}</span>
                  <span className="text-sm text-muted">{n} wins in a row</span>
                </li>
              ))}
              {scorer && (
                <li className={`flex items-center gap-3 px-4 py-3 ${streaks.length > 0 ? 'border-t border-line' : ''}`}>
                  <TrendingUp size={18} className="text-brand flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate font-semibold text-ink">{scorer.name}</span>
                  <span className="text-sm text-muted">{scorer.goals} goals this season</span>
                </li>
              )}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── LEADERBOARD TAB ── */
function LeaderboardTab({ standings, formByPlayer }) {
  const { card, border, ink, muted, hover } = useTheme();
  return (
    <div className="px-4 py-5 pb-28">
      {standings.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-8 text-center shadow-sm`}>
          <Users size={32} className="text-muted mx-auto mb-3" />
          <p className={`${muted} text-sm`}>No players yet.</p>
        </div>
      ) : (
        <div className={`${card} border ${border} rounded-2xl shadow-sm overflow-hidden`}>
          {standings.map((p, i) => (
            <Link key={p.id} to={`/players/${p.id}`}
              className={`flex items-center gap-3 px-4 py-3.5 ${hover} transition-colors ${i === standings.length - 1 ? '' : `border-b ${border}`}`}>
              <div className={`font-display font-bold text-2xl w-7 text-right flex-shrink-0 ${
                i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : muted}`}>
                {i + 1}
              </div>
              {p.team_picture_url ? (
                <img src={p.team_picture_url} alt="" className={`w-10 h-10 rounded-xl object-cover flex-shrink-0 border ${border}`} />
              ) : (
                <div className={`w-10 h-10 rounded-xl bg-teal/10 flex-shrink-0 flex items-center justify-center border ${border}`}>
                  <User size={16} className="text-teal" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className={`font-semibold ${ink} truncate`}>{p.name}</div>
                <FormDots form={formByPlayer[p.id]} />
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-mono font-bold text-teal text-base">{p.elo}</div>
                <div className={`${muted} text-xs mt-0.5`}>{p.wins}W {p.draws}D {p.losses}L</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <p className={`${muted} text-xs mt-3 text-center`}>Tap a player to view their profile.</p>
    </div>
  );
}

/* ── SUBMIT TAB ── */
function SubmitTab({ players }) {
  const { card, border, muted, inputBg } = useTheme();
  const [matchA, setMatchA] = useState('');
  const [matchB, setMatchB] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [matchError, setMatchError] = useState('');
  const [submitOk, setSubmitOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const iCls = `w-full rounded-xl px-4 py-3 text-sm border shadow-sm focus:outline-none focus:ring-2 focus:ring-teal/30 ${inputBg}`;
  const sCls = `${iCls} appearance-none`;

  async function submitMatch() {
    setMatchError('');
    if (!matchA || !matchB) { setMatchError('Pick both players.'); return; }
    if (matchA === matchB) { setMatchError("A player can't play themselves."); return; }
    if (scoreA === '' || scoreB === '' || isNaN(scoreA) || isNaN(scoreB)) { setMatchError('Enter scores for both sides.'); return; }
    setBusy(true);
    try {
      let screenshotUrl = null;
      if (screenshotFile) {
        setUploading(true);
        try { screenshotUrl = await uploadScreenshot(screenshotFile); }
        catch { setMatchError('Screenshot upload failed.'); setUploading(false); setBusy(false); return; }
        setUploading(false);
      }
      const res = await fetch('/api/pending', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerA: matchA, playerB: matchB, scoreA, scoreB, submittedBy, screenshotUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setMatchError(data.error || 'Could not submit.'); }
      else {
        setMatchA(''); setMatchB(''); setScoreA(''); setScoreB('');
        setSubmittedBy(''); setScreenshotFile(null);
        setSubmitOk(true); setTimeout(() => setSubmitOk(false), 3000);
      }
    } catch { setMatchError('Network error.'); }
    setBusy(false);
  }

  return (
    <div className="px-4 py-5 pb-28">
      {players.length < 2 ? (
        <div className={`${card} border ${border} rounded-2xl p-6 text-center shadow-sm`}>
          <p className={`${muted} text-sm`}>At least two players are needed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`${card} border ${border} rounded-2xl shadow-sm p-4`}>
            <div className="grid grid-cols-[1fr_40px_1fr] gap-2 items-end">
              <div>
                <label className={`block ${muted} text-xs mb-1.5`}>Home</label>
                <select value={matchA} onChange={(e) => setMatchA(e.target.value)} className={sCls}>
                  <option value="">Player…</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" value={scoreA} onChange={(e) => setScoreA(e.target.value)}
                  placeholder="0" className={`${iCls} mt-2 text-center text-xl font-mono font-bold`} />
              </div>
              <div className="flex items-end justify-center pb-3">
                <span className={`font-display font-bold text-2xl ${muted}`}>vs</span>
              </div>
              <div>
                <label className={`block ${muted} text-xs mb-1.5`}>Away</label>
                <select value={matchB} onChange={(e) => setMatchB(e.target.value)} className={sCls}>
                  <option value="">Player…</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" value={scoreB} onChange={(e) => setScoreB(e.target.value)}
                  placeholder="0" className={`${iCls} mt-2 text-center text-xl font-mono font-bold`} />
              </div>
            </div>
          </div>

          <div className={`${card} border ${border} rounded-2xl shadow-sm p-4 space-y-3`}>
            <div>
              <label className={`block ${muted} text-xs mb-1.5`}>Reported by</label>
              <input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} placeholder="Your name" className={iCls} />
            </div>
            <div>
              <label className={`block ${muted} text-xs mb-1.5`}>Screenshot (optional)</label>
              <input type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal/10 file:px-3 file:py-2 file:text-teal file:text-sm file:font-medium" />
              {screenshotFile && <p className={`${muted} text-xs mt-1 flex items-center gap-1`}><ImageIcon size={12} /> {screenshotFile.name}</p>}
            </div>
          </div>

          {matchError && <div className="bg-red-500/10 border border-red-400/30 rounded-xl px-4 py-3"><p className="text-red-400 text-sm">{matchError}</p></div>}
          {submitOk && (
            <div className="bg-green-500/10 border border-green-400/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
              <p className="text-green-500 text-sm">Sent for approval!</p>
            </div>
          )}
          <button onClick={submitMatch} disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold bg-brand text-onBrand shadow-sm hover:bg-brand-strong active:scale-95 transition-all disabled:opacity-60">
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Submit Result for Approval'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── APPROVAL TAB ── */
function ApprovalTab({ pending, playerById }) {
  const { card, border, ink, muted } = useTheme();
  function playerName(id) { return playerById[id]?.name || 'Unknown'; }
  return (
    <div className="px-4 py-5 pb-28">
      {pending.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-8 text-center shadow-sm`}>
          <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
          <p className={`${muted} text-sm`}>All results approved!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((m) => (
            <div key={m.id} className={`${card} border border-amber-400/30 rounded-2xl shadow-sm px-4 py-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`font-semibold ${ink}`}>{playerName(m.player_a)} <span className="font-mono text-teal">{m.score_a} – {m.score_b}</span> {playerName(m.player_b)}</p>
                  {m.submitted_by && <p className={`${muted} text-xs mt-0.5`}>Reported by {m.submitted_by}</p>}
                </div>
                <span className="bg-amber-400/20 text-amber-500 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0">Pending</span>
              </div>
              {m.screenshot_url && (
                <a href={m.screenshot_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal text-xs mt-2 hover:underline">
                  <ImageIcon size={12} /> View screenshot
                </a>
              )}
            </div>
          ))}
          <p className={`${muted} text-xs text-center mt-2`}>Admin approval required — <Link to="/admin" className="text-teal underline">Admin panel</Link></p>
        </div>
      )}
    </div>
  );
}

/* ── STATS TAB ── */
function StatsTab({ stats, season }) {
  const { muted } = useTheme();
  if (!stats) return <div className="px-4 py-5 pb-28"><p className={`${muted} text-sm`}>Loading stats…</p></div>;
  return (
    <div className="px-4 py-5 pb-28 space-y-6">
      <StatBlock title="This week" eloLeaders={stats.weekly.eloLeaders} winRateLeaders={stats.weekly.winRateLeaders} minGames={stats.weekly.minGames} />
      <StatBlock title="This month" eloLeaders={stats.monthly.eloLeaders} winRateLeaders={stats.monthly.winRateLeaders} minGames={stats.monthly.minGames} />
      <div>
        <SectionTitle>Top scorers{season?.current ? `, ${season.current.name}` : ''}</SectionTitle>
        {stats.topScorers.length === 0 ? (
          <div className={`${muted} text-sm`}>No goals recorded yet.</div>
        ) : (
          <TopScorersList scorers={stats.topScorers} />
        )}
      </div>
    </div>
  );
}

function TopScorersList({ scorers }) {
  const { card, border, ink } = useTheme();
  return (
    <div className={`${card} border ${border} rounded-2xl shadow-sm overflow-hidden`}>
      {scorers.map((s, i) => (
        <div key={s.playerId} className={`flex items-center justify-between px-4 py-3 ${i === scorers.length - 1 ? '' : `border-b ${border}`}`}>
          <span className={`text-sm ${ink}`}>{i + 1}. {s.name}</span>
          <span className="font-mono text-sm font-bold text-teal">{s.goals} goals</span>
        </div>
      ))}
    </div>
  );
}

function StatBlock({ title, eloLeaders, winRateLeaders, minGames }) {
  const { card, border, ink, muted } = useTheme();
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className={`${muted} text-xs mb-1.5 flex items-center gap-1`}><TrendingUp size={12} /> Most ELO gained</p>
          {eloLeaders.length === 0 ? (
            <div className={`${card} border ${border} rounded-2xl p-3 ${muted} text-sm shadow-sm`}>No matches yet.</div>
          ) : (
            <div className={`${card} border ${border} rounded-2xl shadow-sm overflow-hidden`}>
              {eloLeaders.map((l, i) => (
                <div key={l.playerId} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i === eloLeaders.length - 1 ? '' : `border-b ${border}`}`}>
                  <span className={ink}>{i + 1}. {l.name}</span>
                  <span className={`font-mono font-bold ${l.eloGain >= 0 ? 'text-green-500' : 'text-red-400'}`}>{l.eloGain >= 0 ? '+' : ''}{l.eloGain}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className={`${muted} text-xs mb-1.5 flex items-center gap-1`}><Trophy size={12} /> Best win rate (min {minGames})</p>
          {winRateLeaders.length === 0 ? (
            <div className={`${card} border ${border} rounded-2xl p-3 ${muted} text-sm shadow-sm`}>Not enough matches.</div>
          ) : (
            <div className={`${card} border ${border} rounded-2xl shadow-sm overflow-hidden`}>
              {winRateLeaders.map((l, i) => (
                <div key={l.playerId} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i === winRateLeaders.length - 1 ? '' : `border-b ${border}`}`}>
                  <span className={ink}>{i + 1}. {l.name}</span>
                  <span className="font-mono font-bold text-teal">{Math.round(l.winRate * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── H2H TAB ── */
function H2hTab({ players }) {
  const { card, border, ink, muted, inputBg } = useTheme();
  const [h2hA, setH2hA] = useState('');
  const [h2hB, setH2hB] = useState('');
  const [h2hMatches, setH2hMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const sCls = `w-full rounded-xl px-4 py-3 text-sm border shadow-sm focus:outline-none focus:ring-2 focus:ring-teal/30 appearance-none ${inputBg}`;

  const playerById = useMemo(() => { const m = {}; players.forEach((p) => (m[p.id] = p)); return m; }, [players]);
  function playerName(id) { return playerById[id]?.name || 'Unknown'; }

  useEffect(() => {
    if (!h2hA || !h2hB || h2hA === h2hB) { setH2hMatches(null); return; }
    setLoading(true);
    fetch(`/api/head-to-head?a=${h2hA}&b=${h2hB}`)
      .then((r) => r.json())
      .then((d) => { setH2hMatches(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setH2hMatches([]); setLoading(false); });
  }, [h2hA, h2hB]);

  const summary = useMemo(() => {
    if (!h2hMatches || !h2hA || !h2hB) return null;
    let aWins = 0, bWins = 0, draws = 0, aGoals = 0, bGoals = 0;
    h2hMatches.forEach((m) => {
      const aIsA = m.player_a === h2hA;
      const ga = aIsA ? m.score_a : m.score_b;
      const gb = aIsA ? m.score_b : m.score_a;
      aGoals += ga; bGoals += gb;
      if (ga > gb) aWins++; else if (ga < gb) bWins++; else draws++;
    });
    return { aWins, bWins, draws, aGoals, bGoals, total: h2hMatches.length };
  }, [h2hMatches, h2hA, h2hB]);

  return (
    <div className="px-4 py-5 pb-28 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`block ${muted} text-xs mb-1.5`}>Player 1</label>
          <select value={h2hA} onChange={(e) => setH2hA(e.target.value)} className={sCls}>
            <option value="">Select…</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={`block ${muted} text-xs mb-1.5`}>Player 2</label>
          <select value={h2hB} onChange={(e) => setH2hB(e.target.value)} className={sCls}>
            <option value="">Select…</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {(!h2hA || !h2hB || h2hA === h2hB) ? (
        <div className={`${card} border ${border} rounded-2xl p-8 text-center shadow-sm`}>
          <Repeat size={28} className="text-muted mx-auto mb-2" />
          <p className={`${muted} text-sm`}>Pick two players to see their record.</p>
        </div>
      ) : loading ? (
        <div className={`${card} border ${border} rounded-2xl p-6 text-center shadow-sm`}>
          <Loader2 size={20} className="animate-spin text-teal mx-auto" />
        </div>
      ) : summary && summary.total === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-6 text-center shadow-sm`}>
          <p className={`${muted} text-sm`}>No matches between these players yet.</p>
        </div>
      ) : summary ? (
        <>
          <div className={`${card} border ${border} rounded-2xl shadow-sm p-5`}>
            <div className="grid grid-cols-3 text-center items-center">
              <div>
                <div className={`font-semibold ${ink} truncate text-sm`}>{playerName(h2hA)}</div>
                <div className="font-display font-bold text-5xl text-teal mt-1">{summary.aWins}</div>
                <div className={`${muted} text-xs`}>wins</div>
              </div>
              <div>
                <div className={`${muted} text-xs`}>Draws</div>
                <div className="font-display font-bold text-4xl text-amber-500 mt-1">{summary.draws}</div>
                <div className={`${muted} text-xs`}>{summary.total} played</div>
              </div>
              <div>
                <div className={`font-semibold ${ink} truncate text-sm`}>{playerName(h2hB)}</div>
                <div className="font-display font-bold text-5xl text-teal mt-1">{summary.bWins}</div>
                <div className={`${muted} text-xs`}>wins</div>
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t ${border} text-center font-mono text-sm ${muted}`}>
              Goals: {summary.aGoals} – {summary.bGoals}
            </div>
          </div>
          <div className={`${card} border ${border} rounded-2xl shadow-sm overflow-hidden`}>
            {h2hMatches.map((m, i) => (
              <div key={m.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${i === h2hMatches.length - 1 ? '' : `border-b ${border}`}`}>
                <div className={`font-mono text-sm ${ink}`}>{playerName(m.player_a)} <span className={muted}>{m.score_a} – {m.score_b}</span> {playerName(m.player_b)}</div>
                <div className={`${muted} text-xs`}>{new Date(m.approved_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ── HISTORY TAB ── */
function HistoryTab({ matches, playerById }) {
  const { card, border, ink, muted } = useTheme();
  function playerName(id) { return playerById[id]?.name || 'Unknown'; }
  return (
    <div className="px-4 py-5 pb-28">
      {matches.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-8 text-center shadow-sm`}>
          <History size={32} className="text-muted mx-auto mb-3" />
          <p className={`${muted} text-sm`}>No matches confirmed yet.</p>
        </div>
      ) : (
        <div className={`${card} border ${border} rounded-2xl shadow-sm overflow-hidden`}>
          {matches.map((m, i) => (
            <div key={m.id} className={`px-4 py-3.5 ${i === matches.length - 1 ? '' : `border-b ${border}`}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className={`font-mono text-sm ${ink}`}>
                  {playerName(m.player_a)} <span className={muted}>{m.score_a} – {m.score_b}</span> {playerName(m.player_b)}
                </div>
                <div className="flex items-center gap-2">
                  {m.screenshot_url && (
                    <a href={m.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-teal">
                      <ImageIcon size={14} />
                    </a>
                  )}
                  <span className={`${muted} text-xs`}>{new Date(m.approved_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-4 mt-1 text-xs font-mono flex-wrap">
                <span className={m.delta_a >= 0 ? 'text-green-500' : 'text-red-400'}>
                  {playerName(m.player_a)} {m.delta_a >= 0 ? '+' : ''}{m.delta_a} → {m.elo_a_after}
                </span>
                <span className={m.delta_b >= 0 ? 'text-green-500' : 'text-red-400'}>
                  {playerName(m.player_b)} {m.delta_b >= 0 ? '+' : ''}{m.delta_b} → {m.elo_b_after}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── HALL OF FAME TAB ── */
function HallOfFameTab({ players, trophies }) {
  const { card, border, ink, muted, dark } = useTheme();
  const playerById = useMemo(() => { const m = {}; players.forEach((p) => (m[p.id] = p)); return m; }, [players]);
  const trophiesByPlayer = useMemo(() => {
    const map = {};
    trophies.forEach((t) => { if (!map[t.player_id]) map[t.player_id] = []; map[t.player_id].push(t); });
    return map;
  }, [trophies]);
  const playerIds = Object.keys(trophiesByPlayer);

  return (
    <div className="px-4 py-5 pb-28">
      <div className="relative rounded-2xl overflow-hidden mb-5 h-28"
        style={{ background: 'rgb(var(--pitch))' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="text-3xl mb-1">🏆</div>
          <h2 className="font-display font-bold text-2xl">Hall of Fame</h2>
          <p className="text-white/60 text-xs mt-0.5">Legends of the Super League</p>
        </div>
      </div>

      {playerIds.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-10 text-center shadow-sm`}>
          <div className="text-5xl mb-3">🏆</div>
          <p className={`${ink} font-semibold mb-1`}>No legends yet</p>
          <p className={`${muted} text-sm`}>An admin can award trophies from the Admin panel.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {playerIds.map((pid) => {
            const player = playerById[pid];
            if (!player) return null;
            const pts = trophiesByPlayer[pid];
            const winCount = pts.filter(t => t.trophy_type === 'winner').reduce((s, t) => s + t.count, 0);
            return (
              <div key={pid} className={`${card} border ${border} rounded-2xl shadow-sm overflow-hidden`}>
                <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #F59E0B, #FCD34D, #F59E0B)' }} />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    {player.team_picture_url ? (
                      <img src={player.team_picture_url} alt=""
                        className="w-14 h-14 rounded-xl object-cover border-2 border-amber-300 flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center border-2 border-amber-300"
                        style={{ background: 'rgb(var(--pitch))' }}>
                        <span className="text-white font-display font-bold text-xl">{player.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-display font-bold text-xl leading-tight ${ink} truncate`}>{player.name}</h3>
                      <p className={`${muted} text-xs mt-0.5`}>{pts.length} trophy record{pts.length !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-2xl flex-shrink-0">{'🏆'.repeat(Math.min(winCount, 3))}</span>
                  </div>
                  <div className="space-y-2">
                    {pts.map((t) => {
                      const info = TROPHY_TYPES[t.trophy_type] || TROPHY_TYPES.winner;
                      return (
                        <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                          style={{ background: dark ? info.color + '18' : info.bg, borderColor: dark ? info.color + '40' : info.border }}>
                          <span className="text-lg flex-shrink-0">{info.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm" style={{ color: info.color }}>{t.competition_name}</span>
                            <span className={`${muted} text-xs ml-2`}>{info.label}</span>
                          </div>
                          {t.count > 1 && (
                            <span className="flex-shrink-0 font-bold text-sm px-2 py-0.5 rounded-full"
                              style={{ background: info.border, color: info.color }}>{t.count}x</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function TournamentsTab() {
  const { card, border, ink, muted, hover } = useTheme();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tournaments', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setTournaments(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const formatLabel = {
    knockout: 'Knockout',
    group_knockout: 'Group + Knockout',
    round_robin: 'Round Robin',
  };

  const statusStyle = {
    draft:     { bg: 'bg-muted/10', text: 'text-muted' },
    active:    { bg: 'bg-amber-400/10', text: 'text-amber-400' },
    completed: { bg: 'bg-green-500/10', text: 'text-green-500' },
  };

  if (loading) {
    return (
      <div className="px-4 py-10 text-center">
        <Loader2 size={20} className="animate-spin text-teal mx-auto" />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 pb-28">
      {tournaments.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-10 text-center shadow-sm`}>
          <div className="text-5xl mb-3">🏆</div>
          <p className={`${ink} font-semibold mb-1`}>No tournaments yet</p>
          <p className={`${muted} text-sm`}>
            Admins can create tournaments from the{' '}
            <Link to="/admin/tournaments" className="text-teal underline">Admin panel</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => {
            const ss = statusStyle[t.status] || statusStyle.draft;
            return (
              <Link key={t.id} to={`/tournaments/${t.id}`}
                className={`${card} border ${border} rounded-2xl shadow-sm px-4 py-4 flex items-center gap-3 ${hover} transition-colors block`}>
                <div className="w-11 h-11 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
                  <Trophy size={20} className="text-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${ink} truncate`}>{t.name}</p>
                  <p className={`${muted} text-xs mt-0.5`}>
                    {formatLabel[t.format]}{t.affects_elo ? ' · ELO' : ''}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ss.bg} ${ss.text} flex-shrink-0`}>
                  {t.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
      <p className={`${muted} text-xs mt-4 text-center`}>
        Tap a tournament to see the full bracket and results.
      </p>
    </div>
  );
}
/* ── BOTTOM NAV ── */
const MORE_TABS = ['more', 'stats', 'h2h', 'history', 'halloffame', 'approval'];

function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'home',        label: 'Home',   Icon: HomeIcon },
    { id: 'leaderboard', label: 'Table',  Icon: ListOrdered },
    { id: 'submit',      label: 'Report', Icon: Swords, primary: true },
    { id: 'tournaments', label: 'Cups',   Icon: Medal },
    { id: 'more',        label: 'More',   Icon: LayoutGrid },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-nav border-t border-line" aria-label="Main">
      <div className="max-w-lg mx-auto flex items-stretch">
        {items.map(({ id, label, Icon, primary }) => {
          const active = id === 'more' ? MORE_TABS.includes(tab) : tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-2.5 ${active ? 'text-brand' : 'text-muted'}`}>
              {primary ? (
                <span className="-mt-5 w-12 h-12 rounded-full bg-brand text-onBrand flex items-center justify-center border-4 border-nav">
                  <Icon size={20} />
                </span>
              ) : (
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
              )}
              <span className={`text-[11px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── MORE TAB ── */
function MoreTab({ pending, setTab }) {
  const rows = [
    { id: 'stats',      label: 'Stats',               desc: 'Who is climbing and scoring',      Icon: BarChart3 },
    { id: 'h2h',        label: 'Head-to-head',        desc: 'Compare any two players',          Icon: Repeat },
    { id: 'history',    label: 'Match history',       desc: 'Every approved result',            Icon: History },
    { id: 'halloffame', label: 'Hall of fame',        desc: 'Trophies and past seasons',        Icon: Trophy },
    { id: 'approval',   label: 'Waiting for approval', desc: pending.length ? `${pending.length} reported ${pending.length === 1 ? 'result' : 'results'}` : 'Nothing waiting', Icon: ClipboardCheck },
  ];
  return (
    <div className="px-4 py-5 pb-28">
      <div className="bg-card border border-line rounded-2xl overflow-hidden">
        {rows.map(({ id, label, desc, Icon }, i) => (
          <button key={id} onClick={() => setTab(id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-app ${i > 0 ? 'border-t border-line' : ''}`}>
            <Icon size={20} className="text-brand flex-shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-ink">{label}</span>
              <span className="block text-sm text-muted">{desc}</span>
            </span>
            <ChevronRight size={16} className="text-muted flex-shrink-0" />
          </button>
        ))}
      </div>
      <Link to="/admin" className="mt-4 flex items-center gap-3 rounded-2xl border border-line px-4 py-3.5 text-ink">
        <ShieldCheck size={20} className="text-muted flex-shrink-0" />
        <span className="flex-1 font-semibold">Admin</span>
        <ChevronRight size={16} className="text-muted" />
      </Link>
    </div>
  );
}

/* ── TOP HEADER ── */
function TopHeader({ tab, setTab, dark, toggleDark }) {
  const titles = {
    leaderboard: 'Table', submit: 'Report a result', tournaments: 'Cups', more: 'More',
    approval: 'Waiting for approval', stats: 'Stats',
    h2h: 'Head-to-head', history: 'Match history', halloffame: 'Hall of fame',
  };
  if (tab === 'home') return null;
  const nested = MORE_TABS.includes(tab) && tab !== 'more';
  return (
    <header className="sticky top-0 z-40 bg-nav border-b border-line px-4 h-14 flex items-center gap-2">
      {nested && (
        <button onClick={() => setTab('more')} aria-label="Back to More" className="-ml-2 w-10 h-10 flex items-center justify-center text-muted">
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className="flex-1 font-display font-bold text-3xl leading-none text-ink">{titles[tab]}</h1>
      <button onClick={toggleDark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-app">
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}

/* ── ROOT ── */
export default function Home() {
  const [players, setPlayers]   = useState([]);
  const [matches, setMatches]   = useState([]);
  const [pending, setPending]   = useState([]);
  const [season,  setSeason]    = useState(null);
  const [stats,   setStats]     = useState(null);
  const [trophies, setTrophies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('home');
  const [cups, setCups]         = useState([]);
  const [dark, toggleDark]      = useDarkMode();

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    fetch('/api/tournaments', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCups(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // *** THE FIXED loadAll — all inside Home, all json() calls in parallel ***
  async function loadAll() {
    setLoading(true);
    try {
      const [pR, mR, pdR, sR, stR, tR] = await Promise.all([
        fetch('/api/players'), fetch('/api/matches'), fetch('/api/pending'),
        fetch('/api/season'), fetch('/api/stats'), fetch('/api/trophies'),
      ]);

      const [pData, mData, pdData, sData, stData, tData] = await Promise.all([
        pR.json(), mR.json(), pdR.json(), sR.json(), stR.json(), tR.json(),
      ]);

      setPlayers(Array.isArray(pData)  ? pData  : []);
      setMatches(Array.isArray(mData)  ? mData  : []);
      setPending(Array.isArray(pdData) ? pdData : []);
      setSeason(sData?.current !== undefined ? sData : null);
      setStats(stData?.weekly ? stData : null);
      setTrophies(Array.isArray(tData) ? tData : []);
    } catch (e) { console.error('loadAll error:', e); }
    setLoading(false);
  }

  const playerById = useMemo(() => {
    const m = {}; players.forEach((p) => (m[p.id] = p)); return m;
  }, [players]);

  const formByPlayer = useMemo(() => {
    const map = {}; players.forEach((p) => (map[p.id] = []));
    [...matches].reverse().forEach((m) => {
      const aR = m.score_a > m.score_b ? 'W' : m.score_a < m.score_b ? 'L' : 'D';
      const bR = m.score_a > m.score_b ? 'L' : m.score_a < m.score_b ? 'W' : 'D';
      if (map[m.player_a]) map[m.player_a].push(aR);
      if (map[m.player_b]) map[m.player_b].push(bR);
    });
    return map;
  }, [matches, players]);

  const standings = [...players].sort((a, b) => b.elo - a.elo);
  const bgClass = dark ? 'bg-app' : 'bg-app';

  if (loading) {
    return (
      <DarkContext.Provider value={dark}>
        <div className={`flex items-center justify-center min-h-screen ${bgClass}`}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center">
              <Trophy size={22} className="text-teal" />
            </div>
            <p className="text-muted text-sm">Loading the league…</p>
          </div>
        </div>
      </DarkContext.Provider>
    );
  }

  return (
    <DarkContext.Provider value={dark}>
      <div className={`max-w-lg mx-auto min-h-screen ${bgClass} relative`}>
        <TopHeader tab={tab} setTab={setTab} dark={dark} toggleDark={toggleDark} />

        {tab === 'home'        && <HomeTab players={players} standings={standings} matches={matches} pending={pending} season={season} stats={stats} cups={cups}
          formByPlayer={formByPlayer} playerById={playerById} setTab={setTab} dark={dark} toggleDark={toggleDark} />}
        {tab === 'leaderboard' && <LeaderboardTab standings={standings} formByPlayer={formByPlayer} />}
        {tab === 'submit'      && <SubmitTab players={players} />}
        {tab === 'approval'    && <ApprovalTab pending={pending} playerById={playerById} />}
        {tab === 'stats'       && <StatsTab stats={stats} season={season} />}
        {tab === 'h2h'         && <H2hTab players={players} />}
        {tab === 'history'     && <HistoryTab matches={matches} playerById={playerById} />}
        {tab === 'halloffame'  && <HallOfFameTab players={players} trophies={trophies} />}
        {tab === 'tournaments' && <TournamentsTab />}
        {tab === 'more'        && <MoreTab pending={pending} setTab={setTab} />}
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </DarkContext.Provider>
  );
}
