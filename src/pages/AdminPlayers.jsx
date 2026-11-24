import { useState } from 'react';
import { KeyRound, Pencil, Plus, Save, Trash2, Users } from 'lucide-react';
import { useAdmin, btn, labelCls } from '../lib/admin';
import { AdminPage } from '../components/AdminShell';
import { Avatar, Card, EmptyState, inputCls } from '../components/ui';

export default function AdminPlayers() {
  const { players, busy, act, notify, reload, playerName } = useAdmin();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  const addPlayer = () => {
    const name = newName.trim();
    if (!name) return;
    return act(async () => {
      const res = await fetch('/api/players', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify('error', data.error || 'Could not add player.'); return; }
      setNewName('');
      notify('success', `${name} added.`);
      await reload();
    });
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, elo: p.elo, wins: p.wins, draws: p.draws, losses: p.losses, highest_rank: p.highest_rank || '' });
  };
  const cancelEdit = () => { setEditingId(null); setForm({}); };

  const saveEdit = (id) =>
    act(async () => {
      const res = await fetch(`/api/players/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify('error', data.error || 'Could not save.'); return; }
      cancelEdit();
      notify('success', 'Player saved.');
      await reload();
    });

  const resetPin = (id) => {
    if (!window.confirm(`Reset the profile PIN for ${playerName(id)}? They can then choose a new one.`)) return;
    return act(async () => {
      const res = await fetch(`/api/players/${id}/pin`, { method: 'DELETE' });
      if (!res.ok) { notify('error', 'Could not reset the PIN.'); return; }
      notify('success', `PIN reset for ${playerName(id)}.`);
      await reload();
    });
  };

  const deletePlayer = (id) => {
    if (!window.confirm(`Remove ${playerName(id)}?`)) return;
    return act(async () => {
      const res = await fetch(`/api/players/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify('error', data.error || 'Could not delete.'); return; }
      notify('success', 'Player removed.');
      await reload();
    });
  };

  return (
    <AdminPage title="Players" subtitle={`${players.length} in the league`}>
      <Card className="p-4 mb-5">
        <label htmlFor="new-player" className={labelCls}>Add a player</label>
        <div className="flex gap-2">
          <input id="new-player" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()} placeholder="Player name" className={inputCls} />
          <button onClick={addPlayer} disabled={busy || !newName.trim()} className={`${btn.primary} flex-shrink-0`}>
            <Plus size={16} aria-hidden="true" /> Add
          </button>
        </div>
      </Card>

      {players.length === 0 ? (
        <EmptyState icon={Users} title="No players yet">Add the first player above.</EmptyState>
      ) : (
        <ul className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
          {players.map((p) => (
            <li key={p.id} className="p-4">
              {editingId === p.id ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor={`name-${p.id}`} className={labelCls}>Name</label>
                    <input id={`name-${p.id}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['elo', 'wins', 'draws', 'losses'].map((field) => (
                      <div key={field}>
                        <label htmlFor={`${field}-${p.id}`} className={`${labelCls} capitalize`}>{field === 'elo' ? 'ELO' : field}</label>
                        <input id={`${field}-${p.id}`} type="number" value={form[field]}
                          onChange={(e) => setForm({ ...form, [field]: e.target.value })} className={`${inputCls} tabular`} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label htmlFor={`rank-${p.id}`} className={labelCls}>Highest eFootball rank</label>
                    <input id={`rank-${p.id}`} value={form.highest_rank} onChange={(e) => setForm({ ...form, highest_rank: e.target.value })}
                      placeholder="e.g. Division 1, Legend" className={inputCls} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveEdit(p.id)} disabled={busy} className={btn.primary}><Save size={15} aria-hidden="true" /> Save</button>
                    <button onClick={cancelEdit} className={btn.outline}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar player={p} className="w-11 h-11" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink truncate">{p.name}</div>
                    <div className="text-xs text-muted tabular mt-0.5">ELO {p.elo} · {p.wins}W {p.draws}D {p.losses}L</div>
                  </div>
                  {p.has_pin && (
                    <button onClick={() => resetPin(p.id)} disabled={busy} title="Reset profile PIN"
                      aria-label={`Reset profile PIN for ${p.name}`} className={btn.icon}>
                      <KeyRound size={16} aria-hidden="true" />
                    </button>
                  )}
                  <button onClick={() => startEdit(p)} aria-label={`Edit ${p.name}`} className={btn.icon}>
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button onClick={() => deletePlayer(p.id)} disabled={busy} aria-label={`Remove ${p.name}`} className={btn.iconDanger}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
