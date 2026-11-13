
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trophy, ChevronRight, Loader2 } from 'lucide-react';

const FORMAT_LABELS = {
  knockout: 'Knockout',
  group_knockout: 'Group + Knockout',
  round_robin: 'Round Robin',
};

const STATUS_COLORS = {
  draft: 'bg-[#7A9BAD]/20 text-[#7A9BAD]',
  active: 'bg-amber-400/20 text-amber-400',
  completed: 'bg-green-500/20 text-green-400',
};

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [format, setFormat] = useState('knockout');
  const [affectsElo, setAffectsElo] = useState(false);
  const [groupsCount, setGroupsCount] = useState(2);
  const [groupSize, setGroupSize] = useState(4);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/tournaments', { cache: 'no-store' });
    const data = await res.json();
    setTournaments(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function msg(type, text) { setMessage({ type, text }); setTimeout(() => setMessage(null), 4000); }

  async function createTournament() {
    if (!name.trim()) { msg('error', 'Enter a tournament name.'); return; }
    setBusy(true);
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), format, affectsElo,
        groupsCount: format === 'group_knockout' ? parseInt(groupsCount) : null,
        groupSize: format === 'group_knockout' ? parseInt(groupSize) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { msg('error', data.error || 'Could not create tournament.'); }
    else {
      setName(''); setFormat('knockout'); setAffectsElo(false);
      setShowForm(false);
      msg('success', 'Tournament created!');
      await load();
    }
    setBusy(false);
  }

  const iCls = 'w-full rounded-xl px-4 py-3 text-sm border bg-[#0D1B24] border-[#1E3040] text-[#E8F0F5] focus:outline-none focus:ring-2 focus:ring-teal-500/30';

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-[#0D1B24] text-[#E8F0F5] pb-10">
      <div className="sticky top-0 z-40 bg-[#111E28] border-b border-[#1E3040] px-4 py-3 flex items-center gap-3">
        <Link to="/admin" className="text-[#7A9BAD] hover:text-[#E8F0F5]"><ArrowLeft size={20} /></Link>
        <h1 className="font-bold text-xl flex-1">Tournaments</h1>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium bg-teal-600 text-white">
          <Plus size={16} /> New
        </button>
      </div>

      <div className="px-4 py-5 space-y-5">
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-400/20' : 'bg-green-500/10 text-green-400 border border-green-400/20'}`}>
            {message.text}
          </div>
        )}

        {showForm && (
          <div className="bg-[#162330] border border-[#1E3040] rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-base uppercase tracking-wide">New Tournament</h2>
            <div>
              <label className="block text-[#7A9BAD] text-xs uppercase tracking-wide mb-1.5">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Super League Cup" className={iCls} />
            </div>
            <div>
              <label className="block text-[#7A9BAD] text-xs uppercase tracking-wide mb-1.5">Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)} className={`${iCls} appearance-none`}>
                <option value="knockout">Knockout / Elimination</option>
                <option value="group_knockout">Group Stage + Knockout</option>
                <option value="round_robin">Round Robin</option>
              </select>
            </div>
            {format === 'group_knockout' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#7A9BAD] text-xs uppercase tracking-wide mb-1.5">Number of groups</label>
                  <input type="number" min={2} value={groupsCount}
                    onChange={e => setGroupsCount(e.target.value)} className={iCls} />
                </div>
                <div>
                  <label className="block text-[#7A9BAD] text-xs uppercase tracking-wide mb-1.5">Players per group</label>
                  <input type="number" min={2} value={groupSize}
                    onChange={e => setGroupSize(e.target.value)} className={iCls} />
                </div>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setAffectsElo(v => !v)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${affectsElo ? 'bg-teal-600' : 'bg-[#1E3040]'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${affectsElo ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm">Results affect main ELO rankings</span>
            </label>
            {affectsElo && (
              <p className="text-[#7A9BAD] text-xs bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                ⚠️ Tournament match results will update players' ELO ratings on the main leaderboard.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={createTournament} disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-teal-600 text-white disabled:opacity-60">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Tournament
              </button>
              <button onClick={() => setShowForm(false)}
                className="rounded-xl px-4 py-2.5 text-sm border border-[#1E3040] text-[#7A9BAD]">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10"><Loader2 size={20} className="animate-spin text-[#7A9BAD] mx-auto" /></div>
        ) : tournaments.length === 0 ? (
          <div className="bg-[#162330] border border-[#1E3040] rounded-2xl p-10 text-center">
            <Trophy size={32} className="text-[#7A9BAD] mx-auto mb-3" />
            <p className="text-[#E8F0F5] font-semibold mb-1">No tournaments yet</p>
            <p className="text-[#7A9BAD] text-sm">Tap "New" above to create your first one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tournaments.map(t => (
              <Link key={t.id} to={`/admin/tournaments/${t.id}`}
                className="bg-[#162330] border border-[#1E3040] rounded-2xl px-4 py-4 flex items-center gap-3 hover:border-teal-600/40 transition-colors block">
                <div className="w-10 h-10 rounded-xl bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} className="text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-[#7A9BAD] text-xs mt-0.5">{FORMAT_LABELS[t.format]}{t.affects_elo ? ' · ELO' : ''}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[t.status]}`}>
                  {t.status}
                </span>
                <ChevronRight size={16} className="text-[#7A9BAD]" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
