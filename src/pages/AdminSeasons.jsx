import { useState } from 'react';
import { AlertTriangle, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAdmin, btn, labelCls } from '../lib/admin';
import { AdminPage } from '../components/AdminShell';
import { Card, inputCls } from '../components/ui';

function NewSeason() {
  const { season, busy, act, notify, reload } = useAdmin();
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState('');

  const reset = () =>
    act(async () => {
      const res = await fetch('/api/season/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify('error', data.error || 'Could not reset.'); return; }
      notify('success', `${data.newSeason.name} has started.`);
      setConfirming(false); setName('');
      await reload();
    });

  return (
    <Card className="p-4 sm:p-5">
      <p className="text-sm text-muted">Current season</p>
      <p className="font-display font-bold text-3xl leading-none text-ink mt-1">{season?.current?.name || 'None'}</p>
      <p className="text-sm text-muted mt-3 max-w-xl">
        Starting a new season archives everyone's ELO, then resets all players to 1000 with a clean 0–0–0 record.
      </p>

      {!confirming ? (
        <button onClick={() => setConfirming(true)} className={`${btn.danger} mt-4`}>
          <RotateCcw size={16} aria-hidden="true" /> Reset table for a new season
        </button>
      ) : (
        <div className="mt-4 space-y-3 max-w-md">
          <div>
            <label htmlFor="season-name" className={labelCls}>Name of the new season</label>
            <input id="season-name" value={name} onChange={(e) => setName(e.target.value)} placeholder='e.g. "Season 2"' className={inputCls} autoFocus />
          </div>
          <div className="flex gap-2">
            <button onClick={reset} disabled={busy} className={btn.dangerSolid}><ShieldCheck size={16} aria-hidden="true" /> Confirm reset</button>
            <button onClick={() => setConfirming(false)} className={btn.outline}>Cancel</button>
          </div>
        </div>
      )}

      {season?.past?.length > 0 && (
        <div className="mt-6 pt-5 border-t border-line">
          <h2 className="text-sm font-semibold text-ink mb-2">Past seasons</h2>
          <ul className="space-y-1.5">
            {season.past.map((s) => (
              <li key={s.id} className="text-sm text-muted">
                <span className="text-ink font-medium">{s.name}</span> · ended {new Date(s.ended_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function FullReset() {
  const { act, notify, reload } = useAdmin();
  const [step, setStep] = useState(0); // 0 idle, 1 confirm, 2 type RESET
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);

  async function run() {
    if (input !== 'RESET') return;
    setWorking(true);
    await act(async () => {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { notify('error', data.error || 'Reset failed.'); return; }
      notify('success', 'Everything has been wiped. Fresh start.');
      setStep(0); setInput('');
      await reload();
    });
    setWorking(false);
  }

  return (
    <section aria-labelledby="danger-zone" className="mt-10">
      <h2 id="danger-zone" className="flex items-center gap-2 font-display font-bold text-2xl leading-none text-danger mb-3">
        <AlertTriangle size={20} aria-hidden="true" /> Danger zone
      </h2>
      <div className="bg-card border border-danger/30 rounded-2xl p-4 sm:p-5">
        <p className="font-semibold text-ink">Full reset</p>
        <p className="text-sm text-muted mt-1 max-w-xl">
          Permanently deletes <strong className="text-ink">everything</strong>: all players, matches, trophies, pending results and seasons. This cannot be undone.
        </p>

        {step === 0 && (
          <button onClick={() => setStep(1)} className={`${btn.danger} mt-4`}>
            <AlertTriangle size={16} aria-hidden="true" /> Wipe everything
          </button>
        )}

        {step === 1 && (
          <div className="mt-4 space-y-3">
            <p role="alert" className="text-danger text-sm font-semibold">Are you absolutely sure? This deletes every player, match, trophy and season permanently.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStep(2)} className={btn.dangerSolid}>Yes, I understand. Continue</button>
              <button onClick={() => setStep(0)} className={btn.outline}>Cancel</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-3 max-w-sm">
            <label htmlFor="reset-confirm" className="block text-sm text-muted">
              Type <strong className="text-ink font-mono">RESET</strong> to confirm
            </label>
            <input id="reset-confirm" value={input} onChange={(e) => setInput(e.target.value)} placeholder="RESET" autoComplete="off"
              className={`${inputCls} font-mono`} autoFocus />
            <div className="flex gap-2">
              <button onClick={run} disabled={input !== 'RESET' || working} className={btn.dangerSolid}>
                {working ? 'Wiping…' : 'Confirm full reset'}
              </button>
              <button onClick={() => { setStep(0); setInput(''); }} className={btn.outline}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminSeasons() {
  return (
    <AdminPage title="Seasons" subtitle="Start a fresh table, or look back at past seasons.">
      <NewSeason />
      <FullReset />
    </AdminPage>
  );
}
