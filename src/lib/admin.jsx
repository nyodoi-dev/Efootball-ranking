import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Data and helpers shared by the admin sections, so each page doesn't re-fetch
// the same lists or keep its own busy flag and message.

const AdminContext = createContext(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}

const list = (d) => (Array.isArray(d) ? d : []);

function getJson(url) {
  return fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return r.json();
  });
}

export function AdminProvider({ children }) {
  const [data, setData] = useState({ players: [], pending: [], season: null, trophies: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const timer = useRef(null);

  const notify = useCallback((type, text) => {
    setNotice({ type, text });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 6000);
  }, []);
  const dismiss = useCallback(() => { clearTimeout(timer.current); setNotice(null); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const reload = useCallback(async () => {
    try {
      const [players, pending, season, trophies] = await Promise.all([
        getJson('/api/players'), getJson('/api/pending'), getJson('/api/season'), getJson('/api/trophies'),
      ]);
      setData({ players: list(players), pending: list(pending), season, trophies: list(trophies) });
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'));
      notify('error', 'Could not load admin data.');
    }
  }, [notify]);

  useEffect(() => { reload(); }, [reload]);

  // Runs one admin action: disables buttons while it works and reports a
  // network failure. The action reports its own server errors with notify().
  const act = useCallback(async (fn) => {
    setBusy(true);
    setNotice(null);
    try { await fn(); } catch { notify('error', 'Network error. Try again.'); }
    setBusy(false);
  }, [notify]);

  const playerById = useMemo(() => {
    const m = {};
    data.players.forEach((p) => (m[p.id] = p));
    return m;
  }, [data.players]);
  const playerName = useCallback((id) => playerById[id]?.name || 'Unknown', [playerById]);

  const value = useMemo(
    () => ({ ...data, playerById, playerName, status, busy, notice, notify, dismiss, act, reload }),
    [data, playerById, playerName, status, busy, notice, notify, dismiss, act, reload]
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// Class names for the admin buttons and field labels.
const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const btn = {
  primary: `${base} px-4 py-2.5 bg-brand text-onBrand hover:bg-brand-strong`,
  outline: `${base} px-4 py-2.5 border border-line text-ink hover:bg-card2`,
  danger: `${base} px-4 py-2.5 border border-danger/50 text-danger hover:bg-danger/10`,
  dangerSolid: `${base} px-4 py-2.5 bg-danger text-white dark:text-turf hover:opacity-90`,
  icon: `${base} w-10 h-10 border border-line text-muted hover:text-ink hover:bg-card2`,
  iconDanger: `${base} w-10 h-10 border border-danger/40 text-danger hover:bg-danger/10`,
};
export const labelCls = 'block text-xs text-muted mb-1.5';
