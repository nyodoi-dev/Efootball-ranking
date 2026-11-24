import { useMemo, useState } from 'react';
import { Plus, Trash2, Trophy } from 'lucide-react';
import { useAdmin, btn, labelCls } from '../lib/admin';
import { AdminPage } from '../components/AdminShell';
import { Card, EmptyState, inputCls } from '../components/ui';
import { TROPHY_TYPES } from '../lib/format';

export default function AdminTrophies() {
  const { players, trophies, playerName, busy, act, notify, reload } = useAdmin();
  const [player, setPlayer] = useState('');
  const [type, setType] = useState('winner');
  const [comp, setComp] = useState('');
  const [count, setCount] = useState(1);
  const [error, setError] = useState('');

  const byPlayer = useMemo(() => {
    const map = {};
    trophies.forEach((t) => { (map[t.player_id] ||= []).push(t); });
    return map;
  }, [trophies]);

  const addTrophy = () => {
    setError('');
    if (!player || !comp.trim()) { setError('Pick a player and enter a competition name.'); return; }
    return act(async () => {
      const res = await fetch('/api/trophies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player, competitionName: comp.trim(), trophyType: type, count: Number(count) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not add trophy.'); return; }
      setComp(''); setCount(1);
      notify('success', 'Trophy added.');
      await reload();
    });
  };

  const deleteTrophy = (id) => {
    if (!window.confirm('Remove this trophy?')) return;
    return act(async () => {
      const res = await fetch(`/api/trophies/${id}`, { method: 'DELETE' });
      if (!res.ok) { notify('error', 'Could not remove the trophy.'); return; }
      notify('success', 'Trophy removed.');
      await reload();
    });
  };

  return (
    <AdminPage title="Trophies" subtitle="Awards shown on the Hall of Fame and on player profiles.">
      <Card className="p-4 sm:p-5 mb-6 space-y-4">
        <h2 className="font-display font-bold text-2xl leading-none text-ink">Add a trophy</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="trophy-player" className={labelCls}>Player</label>
            <select id="trophy-player" value={player} onChange={(e) => setPlayer(e.target.value)} className={inputCls}>
              <option value="">Select player…</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="trophy-type" className={labelCls}>Trophy type</label>
            <select id="trophy-type" value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {Object.entries(TROPHY_TYPES).map(([value, t]) => <option key={value} value={value}>{t.emoji} {t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="trophy-comp" className={labelCls}>Competition name</label>
            <input id="trophy-comp" value={comp} onChange={(e) => setComp(e.target.value)} placeholder="e.g. UCL, Kings Cup, La Liga" className={inputCls} />
          </div>
          <div>
            <label htmlFor="trophy-count" className={labelCls}>How many times</label>
            <input id="trophy-count" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} className={`${inputCls} tabular sm:w-28`} />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-danger font-medium">{error}</p>}
        <button onClick={addTrophy} disabled={busy} className={btn.primary}><Plus size={16} aria-hidden="true" /> Add trophy</button>
      </Card>

      {Object.keys(byPlayer).length === 0 ? (
        <EmptyState icon={Trophy} title="No trophies yet">Awards you add appear here and on the Hall of Fame.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {Object.entries(byPlayer).map(([pid, list]) => (
            <li key={pid} className="bg-card border border-line rounded-2xl p-4">
              <p className="font-semibold text-ink mb-3">{playerName(pid)}</p>
              <ul className="space-y-2">
                {list.map((t) => {
                  const info = TROPHY_TYPES[t.trophy_type] || TROPHY_TYPES.winner;
                  return (
                    <li key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2 border"
                      style={{ background: `${info.color}1F`, borderColor: `${info.color}55` }}>
                      <span aria-hidden="true">{info.emoji}</span>
                      <span className="flex-1 min-w-0 text-sm">
                        <span className="font-semibold text-ink">{t.competition_name}</span>
                        <span className="text-muted ml-2">{info.label}</span>
                      </span>
                      {t.count > 1 && <span className="font-bold text-xs px-2 py-0.5 rounded-full bg-brand/15 text-brand-strong tabular">{t.count}×</span>}
                      <button onClick={() => deleteTrophy(t.id)} disabled={busy}
                        aria-label={`Remove ${t.competition_name} ${info.label} from ${playerName(pid)}`} className={`${btn.iconDanger} !w-9 !h-9`}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
