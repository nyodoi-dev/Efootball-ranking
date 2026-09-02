'use client';

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import Link from 'next/link';
import {
  Trophy, Swords, medal, History, Repeat, Users, Image as ImageIcon,
  Loader2, BarChart3, ShieldCheck, Home as HomeIcon, ListOrdered,
  ClipboardCheck, User, CheckCircle2, TrendingUp, Sun, Moon,
} from 'lucide-react';
import { uploadScreenshot } from '../lib/supabaseClient';

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
    bg:        dark ? 'bg-[#0D1B24]'     : 'bg-[#F0F4F8]',
    card:      dark ? 'bg-[#162330]'     : 'bg-white',
    border:    dark ? 'border-[#1E3040]' : 'border-[#DDE3EA]',
    ink:       dark ? 'text-[#E8F0F5]'  : 'text-[#0F1E26]',
    muted:     dark ? 'text-[#7A9BAD]'  : 'text-[#4A6273]',
    navBg:     dark ? 'bg-[#111E28]'    : 'bg-white',
    navBorder: dark ? 'border-[#1E3040]': 'border-[#DDE3EA]',
    inputBg:   dark ? 'bg-[#162330] border-[#1E3040] text-[#E8F0F5]' : 'bg-white border-[#DDE3EA] text-[#0F1E26]',
    hover:     dark ? 'hover:bg-[#1E3040]' : 'hover:bg-[#F0F4F8]',
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
  return <h2 className={`font-display font-bold text-2xl uppercase tracking-wide ${ink} mb-3`}>{children}</h2>;
}

/* ── HOME TAB ── */
function HomeTab({ players, matches, pending, season, setTab }) {
  const { card, border, ink, muted, dark } = useTheme();
  const navCards = [
    { id: 'leaderboard', label: 'Table',    Icon: Trophy,         desc: 'ELO standings' },
    { id: 'submit',      label: 'Report',   Icon: Swords,         desc: 'Submit a result' },
    { id: 'approval',    label: 'Approval', Icon: ClipboardCheck, desc: 'Pending results' },
    { id: 'h2h',         label: 'H2H',      Icon: Repeat,         desc: 'Head-to-head' },
    { id: 'history',     label: 'History',  Icon: History,        desc: 'Match log' },
  ];
  return (
    <div className="flex flex-col">
      <div className="relative w-full h-56 sm:h-72 overflow-hidden">
        <video autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=900&auto=format&fit=crop&q=80">
          <source src="https://cdn.pixabay.com/video/2020/07/30/46234-446449469_large.mp4" type="video/mp4" />
          <source src="https://cdn.pixabay.com/video/2019/09/16/27089-361562102_large.mp4" type="video/mp4" />
          <img src="https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=900&auto=format&fit=crop&q=80"
            alt="Stadium" className="w-full h-full object-cover" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center mb-2 shadow-lg">
            <Trophy size={28} className="text-white" />
          </div>
          <p className="font-display font-bold text-xl uppercase tracking-widest text-white drop-shadow">Super League</p>
          <p className="text-white/70 text-sm mt-1 italic drop-shadow">Where legends are made.</p>
        </div>
      </div>

      <div className="px-4 pt-5 pb-28">
        <div className="flex gap-3 mb-5">
          <div className={`flex-1 ${card} rounded-2xl border ${border} shadow-sm px-4 py-3 text-center`}>
            <div className="font-display font-bold text-3xl text-teal">{players.length}</div>
            <div className={`${muted} text-xs mt-0.5`}>Players</div>
          </div>
          <div className={`flex-1 ${card} rounded-2xl border ${border} shadow-sm px-4 py-3 text-center`}>
            <div className="font-display font-bold text-3xl text-teal">{matches.length}</div>
            <div className={`${muted} text-xs mt-0.5`}>Matches</div>
          </div>
          {season?.current && (
            <div className="flex-1 bg-teal rounded-2xl shadow-sm px-4 py-3 text-center">
              <div className="font-display font-bold text-2xl text-white leading-tight">{season.current.name}</div>
              <div className="text-white/70 text-xs mt-0.5">Season</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {navCards.slice(0, 3).map(({ id, label, Icon, desc }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`${card} border ${border} rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center gap-2 py-5 px-2`}>
              <div className={`w-12 h-12 rounded-xl ${dark ? 'bg-teal/20' : 'bg-teal/10'} flex items-center justify-center`}>
                <Icon size={22} className="text-teal" />
              </div>
              <span className={`font-semibold ${ink} text-sm`}>{label}</span>
              <span className={`${muted} text-xs leading-tight text-center`}>{desc}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {navCards.slice(3).map(({ id, label, Icon, desc }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`${card} border ${border} rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center gap-2 py-5 px-2`}>
              <div className={`w-12 h-12 rounded-xl ${dark ? 'bg-teal/20' : 'bg-teal/10'} flex items-center justify-center`}>
                <Icon size={22} className="text-teal" />
              </div>
              <span className={`font-semibold ${ink} text-sm`}>{label}</span>
              <span className={`${muted} text-xs leading-tight text-center`}>{desc}</span>
            </button>
          ))}
        </div>

        {pending.length > 0 && (
          <div className={`mt-4 ${dark ? 'bg-amber-900/30 border-amber-700/40' : 'bg-amber-50 border-amber-200'} border rounded-2xl px-4 py-3 flex items-center gap-3`}>
            <ClipboardCheck size={18} className="text-amber-500 flex-shrink-0" />
            <p className="text-amber-500 text-sm">
              <span className="font-semibold">{pending.length} result{pending.length > 1 ? 's' : ''}</span> awaiting admin approval
            </p>
          </div>
        )}
        <p className={`text-center ${muted} text-xs mt-6`}>Powered by Super League Digital</p>
      </div>
    </div>
  );
}

/* ── LEADERBOARD TAB ── */
function LeaderboardTab({ standings, formByPlayer }) {
  const { card, border, ink, muted, hover } = useTheme();
  return (
    <div className="px-4 py-5 pb-28">
      <SectionTitle>Standings</SectionTitle>
      {standings.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-8 text-center shadow-sm`}>
          <Users size={32} className="text-[#5E8F9E] mx-auto mb-3" />
          <p className={`${muted} text-sm`}>No players yet.</p>
        </div>
      ) : (
        <div className={`${card} border ${border} rounded-2xl shadow-sm overflow-hidden`}>
          {standings.map((p, i) => (
            <Link key={p.id} href={`/players/${p.id}`}
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
      <SectionTitle>Report Result</SectionTitle>
      {players.length < 2 ? (
        <div className={`${card} border ${border} rounded-2xl p-6 text-center shadow-sm`}>
          <p className={`${muted} text-sm`}>At least two players are needed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`${card} border ${border} rounded-2xl shadow-sm p-4`}>
            <div className="grid grid-cols-[1fr_40px_1fr] gap-2 items-end">
              <div>
                <label className={`block ${muted} text-xs uppercase tracking-wide mb-1.5`}>Home</label>
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
                <label className={`block ${muted} text-xs uppercase tracking-wide mb-1.5`}>Away</label>
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
              <label className={`block ${muted} text-xs uppercase tracking-wide mb-1.5`}>Reported by</label>
              <input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} placeholder="Your name" className={iCls} />
            </div>
            <div>
              <label className={`block ${muted} text-xs uppercase tracking-wide mb-1.5`}>Screenshot (optional)</label>
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
            className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold bg-teal text-white shadow-sm hover:bg-[#2A6478] active:scale-95 transition-all disabled:opacity-60">
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
      <SectionTitle>Pending Approval</SectionTitle>
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
          <p className={`${muted} text-xs text-center mt-2`}>Admin approval required — <Link href="/admin" className="text-teal underline">Admin panel</Link></p>
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
        <SectionTitle>Top Scorers {season?.current ? `— ${season.current.name}` : ''}</SectionTitle>
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
          <p className={`${muted} text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1`}><TrendingUp size={12} /> Most ELO gained</p>
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
          <p className={`${muted} text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1`}><Trophy size={12} /> Best win rate (min {minGames})</p>
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
      <SectionTitle>Head-to-Head</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`block ${muted} text-xs uppercase tracking-wide mb-1.5`}>Player 1</label>
          <select value={h2hA} onChange={(e) => setH2hA(e.target.value)} className={sCls}>
            <option value="">Select…</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={`block ${muted} text-xs uppercase tracking-wide mb-1.5`}>Player 2</label>
          <select value={h2hB} onChange={(e) => setH2hB(e.target.value)} className={sCls}>
            <option value="">Select…</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {(!h2hA || !h2hB || h2hA === h2hB) ? (
        <div className={`${card} border ${border} rounded-2xl p-8 text-center shadow-sm`}>
          <Repeat size={28} className="text-[#5E8F9E] mx-auto mb-2" />
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
                <div className={`${muted} text-xs uppercase tracking-wide`}>Draws</div>
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
      <SectionTitle>Match History</SectionTitle>
      {matches.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-8 text-center shadow-sm`}>
          <History size={32} className="text-[#5E8F9E] mx-auto mb-3" />
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
        style={{ background: 'linear-gradient(135deg, #1B4D5C 0%, #0F2A34 100%)' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="text-3xl mb-1">🏆</div>
          <h2 className="font-display font-bold text-2xl uppercase tracking-widest">Hall of Fame</h2>
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
                        style={{ background: 'linear-gradient(135deg,#1B4D5C,#2A6478)' }}>
                        <span className="text-white font-display font-bold text-xl">{player.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-display font-bold text-xl uppercase leading-tight ${ink} truncate`}>{player.name}</h3>
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
    draft:     { bg: 'bg-[#7A9BAD]/10', text: 'text-[#7A9BAD]' },
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
      <SectionTitle>Tournaments</SectionTitle>
      {tournaments.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-10 text-center shadow-sm`}>
          <div className="text-5xl mb-3">🏆</div>
          <p className={`${ink} font-semibold mb-1`}>No tournaments yet</p>
          <p className={`${muted} text-sm`}>
            Admins can create tournaments from the{' '}
            <Link href="/admin/tournaments" className="text-teal underline">Admin panel</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => {
            const ss = statusStyle[t.status] || statusStyle.draft;
            return (
              <Link key={t.id} href={`/tournaments/${t.id}`}
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
function BottomNav({ tab, setTab }) {
  const { navBg, navBorder } = useTheme();
 const items = [
  { id: 'home',        label: 'Home',        Icon: HomeIcon },
  { id: 'leaderboard', label: 'Standings',   Icon: ListOrdered },
  { id: 'submit',      label: 'Report',      Icon: Swords },
  { id: 'stats',       label: 'Stats',       Icon: BarChart3 },
  { id: 'halloffame',  label: 'Hall of Fame', Icon: Trophy },
  { id: 'tournaments', label: 'Cup',         Icon: Medal },
];
  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 ${navBg} border-t ${navBorder}`}>
      <div className="max-w-lg mx-auto flex items-stretch">
        {items.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative ${active ? 'text-teal' : 'text-[#7A9BAD]'}`}>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal rounded-b-full" />}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[9px] font-medium leading-tight text-center px-1">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── TOP HEADER ── */
function TopHeader({ tab, dark, toggleDark }) {
  const { navBg, navBorder, ink, muted } = useTheme();
  const titles = {
    home: null, leaderboard: 'Standings', submit: 'Report Result',
    approval: 'Pending Approval', stats: 'Statistics',
    h2h: 'Head-to-Head', history: 'Match History', halloffame: 'Hall of Fame',
  };
  if (tab === 'home') return null;
  return (
    <header className={`sticky top-0 z-40 ${navBg} border-b ${navBorder} px-4 py-3 flex items-center justify-between`}>
      <h1 className={`font-display font-bold text-2xl uppercase tracking-wide ${ink}`}>{titles[tab]}</h1>
      <div className="flex items-center gap-3">
        <button onClick={toggleDark}
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-[#1E3040]' : 'bg-[#F0F4F8]'} transition-all`}>
          {dark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-[#4A6273]" />}
        </button>
        <Link href="/admin" className={`flex items-center gap-1 text-xs ${muted} hover:text-teal transition-colors`}>
          <ShieldCheck size={15} /> Admin
        </Link>
      </div>
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
  const [dark, setDark]         = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sl-dark') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  function toggleDark() {
    setDark((d) => { localStorage.setItem('sl-dark', String(!d)); return !d; });
  }

  useEffect(() => { loadAll(); }, []);

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
  const bgClass = dark ? 'bg-[#0D1B24]' : 'bg-[#F0F4F8]';

  if (loading) {
    return (
      <DarkContext.Provider value={dark}>
        <div className={`flex items-center justify-center min-h-screen ${bgClass}`}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center">
              <Trophy size={22} className="text-teal" />
            </div>
            <p className="text-[#7A9BAD] text-sm">Loading the league…</p>
          </div>
        </div>
      </DarkContext.Provider>
    );
  }

  return (
    <DarkContext.Provider value={dark}>
      <div className={`max-w-lg mx-auto min-h-screen ${bgClass} relative`}>
        {tab === 'home' && (
          <button onClick={toggleDark}
            className="absolute top-3 right-3 z-50 w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center">
            {dark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-white" />}
          </button>
        )}

        <TopHeader tab={tab} dark={dark} toggleDark={toggleDark} />

        {tab === 'home'        && <HomeTab players={players} matches={matches} pending={pending} season={season} setTab={setTab} />}
        {tab === 'leaderboard' && <LeaderboardTab standings={standings} formByPlayer={formByPlayer} />}
        {tab === 'submit'      && <SubmitTab players={players} />}
        {tab === 'approval'    && <ApprovalTab pending={pending} playerById={playerById} />}
        {tab === 'stats'       && <StatsTab stats={stats} season={season} />}
        {tab === 'h2h'         && <H2hTab players={players} />}
        {tab === 'history'     && <HistoryTab matches={matches} playerById={playerById} />}
        {tab === 'halloffame'  && <HallOfFameTab players={players} trophies={trophies} />}
        {tab === 'tournaments' && <TournamentsTab />}
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
    draft:     { bg: 'bg-[#7A9BAD]/10', text: 'text-[#7A9BAD]' },
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
      <SectionTitle>Tournaments</SectionTitle>
      {tournaments.length === 0 ? (
        <div className={`${card} border ${border} rounded-2xl p-10 text-center shadow-sm`}>
          <div className="text-5xl mb-3">🏆</div>
          <p className={`${ink} font-semibold mb-1`}>No tournaments yet</p>
          <p className={`${muted} text-sm`}>
            Admins can create tournaments from the{' '}
            <Link href="/admin/tournaments" className="text-teal underline">Admin panel</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => {
            const ss = statusStyle[t.status] || statusStyle.draft;
            return (
              <Link key={t.id} href={`/tournaments/${t.id}`}
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
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </DarkContext.Provider>
  );
}
