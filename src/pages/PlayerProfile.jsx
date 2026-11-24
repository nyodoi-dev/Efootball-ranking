import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, ChevronDown, Image as ImageIcon, Loader2, Save, User, Users } from 'lucide-react';
import { uploadTeamPicture } from '../lib/api';
import { useLeague } from '../lib/league';
import { Avatar, Card, EmptyState, FormDots, LeagueGate, Page, SectionHeading, StatusBadge, inputCls } from '../components/ui';
import { MatchRow } from '../components/MatchRow';
import { TROPHY_TYPES, resultFor, signed } from '../lib/format';

function Header({ name }) {
  // Phones get their own sticky header here; desktop uses the shell's top bar.
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-nav/95 backdrop-blur border-b border-line h-14 px-4 flex items-center gap-2">
      <Link to="/standings" aria-label="Back to standings" className="-ml-2 w-10 h-10 flex items-center justify-center text-muted">
        <ArrowLeft size={20} />
      </Link>
      <h1 className="font-display font-bold text-2xl leading-none text-ink truncate">{name}</h1>
    </header>
  );
}

function EditProfile({ player, onSaved }) {
  const [rankInput, setRankInput] = useState(player.highest_rank || '');
  const [pictureFile, setPictureFile] = useState(null);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function save() {
    setSaving(true); setMessage(null);
    try {
      let teamPictureUrl;
      if (pictureFile) {
        try { teamPictureUrl = await uploadTeamPicture(pictureFile); }
        catch { setMessage({ type: 'error', text: 'Picture upload failed.' }); setSaving(false); return; }
      }
      if (!/^\d{4,8}$/.test(pin)) {
        setMessage({ type: 'error', text: player.has_pin ? 'Enter your PIN to save.' : 'Choose a PIN of 4 to 8 digits to lock your profile.' });
        setSaving(false); return;
      }
      const body = { highestRank: rankInput, ...(player.has_pin ? { pin } : { newPin: pin }) };
      if (teamPictureUrl) body.teamPictureUrl = teamPictureUrl;
      const res = await fetch(`/api/players/${player.id}/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Could not save.' }); }
      else { setPictureFile(null); setPin(''); setMessage({ type: 'success', text: 'Profile updated.' }); onSaved(); }
    } catch { setMessage({ type: 'error', text: 'Network error. Try again.' }); }
    setSaving(false);
  }

  const label = 'block text-xs text-muted mb-1.5';
  return (
    <details className="group bg-card border border-line rounded-2xl">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none rounded-2xl">
        <span className="font-display font-bold text-2xl leading-none text-ink">Edit profile</span>
        <ChevronDown size={18} className="text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-5 pb-5 space-y-3 max-w-lg">
        <div>
          <label htmlFor="team-picture" className={label}>Team / club picture</label>
          <input id="team-picture" type="file" accept="image/*" onChange={(e) => setPictureFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/15 file:px-3 file:py-2 file:text-brand-strong file:text-sm file:font-semibold" />
          {pictureFile && <p className="text-muted text-xs mt-1.5 flex items-center gap-1"><ImageIcon size={12} aria-hidden="true" /> {pictureFile.name}</p>}
        </div>
        <div>
          <label htmlFor="highest-rank" className={label}>Highest rank ever (real eFootball)</label>
          <input id="highest-rank" value={rankInput} onChange={(e) => setRankInput(e.target.value)}
            placeholder="e.g. Division 1, Legend" className={inputCls} />
        </div>
        <div>
          <label htmlFor="profile-pin" className={label}>{player.has_pin ? 'Your PIN' : 'Choose a PIN (4 to 8 digits)'}</label>
          <input id="profile-pin" type="password" inputMode="numeric" autoComplete="off" maxLength={8}
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder={player.has_pin ? 'PIN' : 'e.g. 4821'} className={inputCls} />
          <p className="text-muted text-xs mt-1.5">
            {player.has_pin
              ? 'Only the person with this PIN can change this profile. Forgot it? Ask an admin to reset it.'
              : 'This locks the profile to you. You will need the PIN for every later change.'}
          </p>
        </div>
        {message && (
          <div role={message.type === 'error' ? 'alert' : 'status'}
            className={`rounded-xl px-4 py-3 text-sm font-medium border ${
              message.type === 'error' ? 'bg-danger/10 text-danger border-danger/30' : 'bg-win/10 text-win border-win/30'
            }`}>
            {message.text}
          </div>
        )}
        <button onClick={save} disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-brand text-onBrand hover:bg-brand-strong active:scale-[.98] transition-all disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save profile
        </button>
      </div>
    </details>
  );
}

function Profile() {
  const { id } = useParams();
  const { players, matches, standings, playerById, formByPlayer, goals, trophies, reload } = useLeague();
  const player = playerById[id];

  const mine = useMemo(() => matches.filter((m) => m.player_a === id || m.player_b === id), [matches, id]);
  const myTrophies = useMemo(() => trophies.filter((t) => t.player_id === id), [trophies, id]);

  if (!player) {
    return (
      <>
        <Header name="Player" />
        <Page>
          <EmptyState icon={Users} title="Player not found"
            action={<Link to="/players" className="inline-block rounded-xl bg-brand text-onBrand text-sm font-semibold px-4 py-2 hover:bg-brand-strong transition-colors">See all players</Link>}>
            This player may have been removed from the league.
          </EmptyState>
        </Page>
      </>
    );
  }

  const rank = standings.findIndex((p) => p.id === id) + 1;
  const played = player.wins + player.draws + player.losses;
  const winRate = played ? Math.round((player.wins / played) * 100) : null;
  const g = goals[id] || { gf: 0, ga: 0 };
  const stat = [
    { label: 'Rank', value: `${rank}`, sub: `of ${players.length}` },
    { label: 'Played', value: played },
    { label: 'Win rate', value: winRate === null ? '—' : `${winRate}%` },
    { label: 'Goal diff', value: signed(g.gf - g.ga), sub: 'this season' },
  ];
  const record = [
    { kind: 'win', label: 'Wins', value: player.wins, cls: 'text-win bg-win/10 border-win/25' },
    { kind: 'draw', label: 'Draws', value: player.draws, cls: 'text-draw bg-draw/10 border-draw/25' },
    { kind: 'loss', label: 'Losses', value: player.losses, cls: 'text-danger bg-danger/10 border-danger/25' },
  ];

  return (
    <>
      <Header name={player.name} />
      <Page>
        <Link to="/players" className="hidden lg:inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4">
          <ArrowLeft size={15} aria-hidden="true" /> All players
        </Link>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <Card className="overflow-hidden">
              <div className="h-20" style={{ background: 'radial-gradient(120% 160% at 85% 0%, rgb(208 166 79 / .35), transparent 55%), linear-gradient(135deg, #1a2438, #0e141e)' }} aria-hidden="true" />
              <div className="px-5 pb-5">
                <div className="flex items-end gap-4 -mt-9">
                  {player.team_picture_url ? (
                    <img src={player.team_picture_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-4 border-card flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-card2 border-4 border-card flex-shrink-0 flex items-center justify-center">
                      <User size={28} className="text-muted" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 pb-1">
                    <h2 className="hidden lg:block font-display font-extrabold text-3xl leading-tight text-ink truncate">{player.name}</h2>
                    <div className="flex items-center gap-3 lg:mt-1">
                      <span className="font-display font-bold text-2xl text-brand-strong tabular">{player.elo} <span className="text-sm font-semibold">ELO</span></span>
                      <FormDots form={formByPlayer[id]} />
                    </div>
                  </div>
                </div>

                <ul className="grid grid-cols-3 gap-3 mt-5">
                  {record.map((r) => (
                    <li key={r.label} className={`rounded-xl border p-3 text-center ${r.cls}`}>
                      <div className="font-display font-bold text-3xl leading-none tabular">{r.value}</div>
                      <div className="text-xs mt-1.5 font-medium">{r.label}</div>
                    </li>
                  ))}
                </ul>

                {player.highest_rank && (
                  <div className="flex items-center gap-2 mt-3 bg-accent/10 border border-accent/30 rounded-xl px-4 py-2.5">
                    <Award size={16} className="text-accent flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm text-ink">Highest rank: <span className="font-semibold">{player.highest_rank}</span></span>
                  </div>
                )}
              </div>
            </Card>

            <ul className="grid grid-cols-2 gap-3">
              {stat.map((s) => (
                <li key={s.label} className="bg-card border border-line rounded-2xl px-4 py-3.5">
                  <div className="text-xs text-muted">{s.label}</div>
                  <div className="font-display font-bold text-3xl leading-none text-ink tabular mt-1.5">{s.value}</div>
                  {s.sub && <div className="text-xs text-muted mt-1">{s.sub}</div>}
                </li>
              ))}
            </ul>

            {myTrophies.length > 0 && (
              <section>
                <SectionHeading>Trophies</SectionHeading>
                <ul className="space-y-2">
                  {myTrophies.map((t) => {
                    const info = TROPHY_TYPES[t.trophy_type] || TROPHY_TYPES.winner;
                    return (
                      <li key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                        style={{ background: `${info.color}1F`, borderColor: `${info.color}55` }}>
                        <span className="text-lg flex-shrink-0" aria-hidden="true">{info.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm text-ink">{t.competition_name}</span>
                          <span className="text-muted text-xs ml-2">{info.label}</span>
                        </div>
                        {t.count > 1 && <span className="font-bold text-xs px-2 py-0.5 rounded-full bg-brand/15 text-brand-strong tabular">{t.count}×</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6 min-w-0">
            <section>
              <SectionHeading>Recent matches</SectionHeading>
              {mine.length === 0 ? (
                <EmptyState title="No confirmed matches yet">Results appear here once they are approved.</EmptyState>
              ) : (
                <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
                  {mine.slice(0, 15).map((m) => (
                    <MatchRow key={m.id} match={m} playerById={playerById}
                      badge={{ W: 'win', D: 'draw', L: 'loss' }[resultFor(m, id)]} />
                  ))}
                </ul>
              )}
              {mine.length > 15 && (
                <p className="text-center mt-3">
                  <Link to="/history" className="text-sm font-semibold text-brand-strong hover:underline">See the full match history</Link>
                </p>
              )}
            </section>

            <EditProfile key={player.id} player={player} onSaved={reload} />
          </div>
        </div>
      </Page>
    </>
  );
}

export default function PlayerProfile() {
  return (
    <LeagueGate>
      <Profile />
    </LeagueGate>
  );
}
