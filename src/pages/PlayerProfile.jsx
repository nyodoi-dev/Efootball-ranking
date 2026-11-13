
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Save, Loader2, Award, User, Trophy, Shield } from 'lucide-react';
import { uploadTeamPicture } from '../lib/api';

function FormDots({ form }) {
  const last5 = (form || []).slice(-5).reverse();
  const slots = [...last5, ...Array(5 - last5.length).fill(null)];
  return (
    <div className="flex gap-1.5">
      {slots.map((r, i) => {
        let bg = '#DDE3EA';
        if (r === 'W') bg = '#27AE60';
        if (r === 'D') bg = '#F0A500';
        if (r === 'L') bg = '#E74C3C';
        return <div key={i} className="w-3 h-3 rounded-sm" style={{ background: bg }} />;
      })}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl px-4 py-3 text-sm bg-white border border-[#DDE3EA] text-[#0F1E26] placeholder:text-[#4A6273] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D5C]/30';

export default function PlayerProfile() {
  const { id } = useParams();
  const [player, setPlayer]       = useState(null);
  const [matches, setMatches]     = useState([]);
  const [playerNames, setPlayerNames] = useState({});
  const [loading, setLoading]     = useState(true);
  const [rankInput, setRankInput] = useState('');
  const [pictureFile, setPictureFile] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState(null);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [playersRes, matchesRes] = await Promise.all([fetch('/api/players'), fetch('/api/matches')]);
      const players = await playersRes.json();
      const allMatches = await matchesRes.json();
      const names = {};
      players.forEach((p) => (names[p.id] = p.name));
      setPlayerNames(names);
      const found = players.find((p) => p.id === id);
      setPlayer(found || null);
      setRankInput(found?.highest_rank || '');
      setMatches(allMatches.filter((m) => m.player_a === id || m.player_b === id));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const form = (() => {
    return [...matches].reverse().map((m) => {
      const isA = m.player_a === id;
      const my = isA ? m.score_a : m.score_b;
      const their = isA ? m.score_b : m.score_a;
      return my > their ? 'W' : my < their ? 'L' : 'D';
    });
  })();

  async function saveProfile() {
    setSaving(true); setMessage(null);
    try {
      let teamPictureUrl;
      if (pictureFile) {
        try { teamPictureUrl = await uploadTeamPicture(pictureFile); }
        catch { setMessage({ type: 'error', text: 'Picture upload failed.' }); setSaving(false); return; }
      }
      const body = { highestRank: rankInput };
      if (teamPictureUrl) body.teamPictureUrl = teamPictureUrl;
      const res = await fetch(`/api/players/${id}/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Could not save.' }); }
      else { setPlayer(data); setPictureFile(null); setMessage({ type: 'success', text: 'Profile updated!' }); }
    } catch { setMessage({ type: 'error', text: 'Network error — try again.' }); }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#1B4D5C]" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-[#F0F4F8] px-4 py-8">
        <Link to="/" className="flex items-center gap-2 text-[#4A6273] text-sm mb-4 hover:text-[#1B4D5C]">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="bg-white border border-[#DDE3EA] rounded-2xl p-6 text-center shadow-sm">
          <p className="text-[#4A6273] text-sm">Player not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-[#F0F4F8]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#DDE3EA] px-4 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 text-[#4A6273] hover:text-[#1B4D5C] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display font-bold text-xl uppercase tracking-wide text-[#0F1E26]">Player Profile</h1>
      </header>

      <div className="px-4 py-5 space-y-4 pb-10">
        {/* Player card */}
        <div className="bg-white border border-[#DDE3EA] rounded-2xl shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-20 bg-gradient-to-r from-[#1B4D5C] to-[#2A6478]" />
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-8 mb-4">
              {player.team_picture_url ? (
                <img src={player.team_picture_url} alt=""
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#F0F4F8] border-4 border-white shadow-md flex-shrink-0 flex items-center justify-center">
                  <User size={28} className="text-[#5E8F9E]" />
                </div>
              )}
              <div className="mb-1 min-w-0">
                <h2 className="font-display font-bold text-3xl uppercase leading-tight truncate text-[#0F1E26]">
                  {player.name}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono font-bold text-[#1B4D5C] text-lg">{player.elo} ELO</span>
                  <FormDots form={form} />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <div className="font-display font-bold text-3xl text-green-600">{player.wins}</div>
                <div className="text-green-600/70 text-xs uppercase tracking-wide mt-0.5">Wins</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                <div className="font-display font-bold text-3xl text-amber-500">{player.draws}</div>
                <div className="text-amber-500/70 text-xs uppercase tracking-wide mt-0.5">Draws</div>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <div className="font-display font-bold text-3xl text-red-500">{player.losses}</div>
                <div className="text-red-500/70 text-xs uppercase tracking-wide mt-0.5">Losses</div>
              </div>
            </div>

            {player.highest_rank && (
              <div className="flex items-center gap-2 mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <Award size={16} className="text-amber-500 flex-shrink-0" />
                <span className="text-sm text-[#0F1E26]">
                  Highest rank: <span className="font-semibold">{player.highest_rank}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Edit profile */}
        <div className="bg-white border border-[#DDE3EA] rounded-2xl shadow-sm p-5">
          <h3 className="font-display font-bold text-xl uppercase tracking-wide text-[#0F1E26] mb-4">Edit Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[#4A6273] text-xs uppercase tracking-wide mb-1.5">Team / club picture</label>
              <input type="file" accept="image/*" onChange={(e) => setPictureFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-[#4A6273] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1B4D5C]/10 file:px-3 file:py-2 file:text-[#1B4D5C] file:text-sm file:font-medium" />
              {pictureFile && <p className="text-[#4A6273] text-xs mt-1">{pictureFile.name}</p>}
            </div>
            <div>
              <label className="block text-[#4A6273] text-xs uppercase tracking-wide mb-1.5">
                Highest rank ever (real eFootball)
              </label>
              <input value={rankInput} onChange={(e) => setRankInput(e.target.value)}
                placeholder="e.g. Division 1, Legend" className={inputCls} />
            </div>
            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm ${
                message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message.text}
              </div>
            )}
            <button onClick={saveProfile} disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-[#1B4D5C] text-white shadow-sm hover:bg-[#2A6478] active:scale-95 transition-all disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Profile
            </button>
          </div>
        </div>

        {/* Recent matches */}
        <div>
          <h3 className="font-display font-bold text-xl uppercase tracking-wide text-[#0F1E26] mb-3">Recent Matches</h3>
          {matches.length === 0 ? (
            <div className="bg-white border border-[#DDE3EA] rounded-2xl p-6 text-center shadow-sm">
              <p className="text-[#4A6273] text-sm">No confirmed matches yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#DDE3EA] rounded-2xl shadow-sm overflow-hidden">
              {matches.map((m, i) => {
                const isA = m.player_a === id;
                const opponentId = isA ? m.player_b : m.player_a;
                const myScore = isA ? m.score_a : m.score_b;
                const theirScore = isA ? m.score_b : m.score_a;
                const delta = isA ? m.delta_a : m.delta_b;
                const result = myScore > theirScore ? 'W' : myScore < theirScore ? 'L' : 'D';
                const resultColor = result === 'W' ? 'bg-green-100 text-green-700' : result === 'L' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600';
                return (
                  <div key={m.id}
                    className={`px-4 py-3.5 flex items-center gap-3 ${i === matches.length - 1 ? '' : 'border-b border-[#DDE3EA]'}`}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${resultColor}`}>{result}</span>
                    <Link to={`/players/${opponentId}`} className="font-mono text-sm text-[#0F1E26] hover:text-[#1B4D5C] flex-1 min-w-0 truncate">
                      vs {playerNames[opponentId] || 'Opponent'} <span className="text-[#4A6273]">{myScore}–{theirScore}</span>
                    </Link>
                    <span className={`font-mono text-xs flex-shrink-0 ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {delta >= 0 ? '+' : ''}{delta}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
