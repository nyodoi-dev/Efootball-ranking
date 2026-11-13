import { useEffect, useState } from 'react';

const KEY = 'sl-dark';

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null) return saved === 'true';
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Light or dark for the whole site: remembered per device, defaulting to the
// device's own setting. index.html applies it before first paint.
export function useDarkMode() {
  const [dark, setDark] = useState(initial);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const toggle = () =>
    setDark((d) => {
      try { localStorage.setItem(KEY, String(!d)); } catch {}
      return !d;
    });
  return [dark, toggle];
}
