import { useState } from 'react';
import { CheckCircle2, Image as ImageIcon, Loader2, Swords } from 'lucide-react';
import { useLeague } from '../lib/league';
import { uploadScreenshot } from '../lib/api';
import { Card, EmptyState, LeagueGate, Page, inputCls } from '../components/ui';

function Form() {
  const { players, reload } = useLeague();
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
        setSubmitOk(true); setTimeout(() => setSubmitOk(false), 4000);
        reload();
      }
    } catch { setMatchError('Network error.'); }
    setBusy(false);
  }

  if (players.length < 2) {
    return <EmptyState icon={Swords} title="At least two players are needed">Results can be reported once the league has two players.</EmptyState>;
  }

  const label = 'block text-xs text-muted mb-1.5';
  return (
    <div className="max-w-2xl space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label htmlFor="home-player" className={label}>Home player</label>
            <select id="home-player" value={matchA} onChange={(e) => setMatchA(e.target.value)} className={inputCls}>
              <option value="">Select player…</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label htmlFor="home-score" className="sr-only">Home score</label>
            <input id="home-score" type="number" inputMode="numeric" min="0" value={scoreA} onChange={(e) => setScoreA(e.target.value)}
              placeholder="0" className={`${inputCls} mt-2 text-center text-xl font-bold tabular`} />
          </div>
          <span className="pb-3 font-display font-bold text-2xl text-muted" aria-hidden="true">vs</span>
          <div>
            <label htmlFor="away-player" className={label}>Away player</label>
            <select id="away-player" value={matchB} onChange={(e) => setMatchB(e.target.value)} className={inputCls}>
              <option value="">Select player…</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label htmlFor="away-score" className="sr-only">Away score</label>
            <input id="away-score" type="number" inputMode="numeric" min="0" value={scoreB} onChange={(e) => setScoreB(e.target.value)}
              placeholder="0" className={`${inputCls} mt-2 text-center text-xl font-bold tabular`} />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5 space-y-4">
        <div>
          <label htmlFor="reported-by" className={label}>Reported by</label>
          <input id="reported-by" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} placeholder="Your name" className={inputCls} />
        </div>
        <div>
          <label htmlFor="screenshot" className={label}>Screenshot (optional)</label>
          <input id="screenshot" type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand/15 file:px-3 file:py-2 file:text-brand-strong file:text-sm file:font-semibold" />
          {screenshotFile && (
            <p className="text-muted text-xs mt-1.5 flex items-center gap-1"><ImageIcon size={12} aria-hidden="true" /> {screenshotFile.name}</p>
          )}
        </div>
      </Card>

      {matchError && (
        <div role="alert" className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
          <p className="text-danger text-sm font-medium">{matchError}</p>
        </div>
      )}
      {submitOk && (
        <div role="status" className="bg-win/10 border border-win/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-win flex-shrink-0" aria-hidden="true" />
          <p className="text-win text-sm font-medium">Sent for approval. An admin will review it shortly.</p>
        </div>
      )}
      <button onClick={submitMatch} disabled={busy}
        className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold bg-brand text-onBrand hover:bg-brand-strong active:scale-[.98] transition-all disabled:opacity-60">
        {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
          : busy ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
          : 'Submit result for approval'}
      </button>
    </div>
  );
}

export default function ReportMatch() {
  return (
    <Page title="Report a match" subtitle="Results are checked by an admin before they count">
      <LeagueGate>
        <Form />
      </LeagueGate>
    </Page>
  );
}
