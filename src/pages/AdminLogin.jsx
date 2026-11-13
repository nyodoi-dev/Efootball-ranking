import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';
import { signIn } from '../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    }
    setBusy(false);
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="text-center mb-8">
        <h1 className="font-display font-bold text-5xl leading-none tracking-wide">Admin</h1>
        <p className="text-muted text-sm mt-2">Sign in to manage The Table.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-panel border border-line rounded-lg p-5 space-y-4">
        <div>
          <label htmlFor="admin-password" className="block text-muted text-xs mb-1">Admin password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            className="w-full rounded-md px-3 py-2 text-sm bg-panelAlt border border-line text-chalk"
          />
        </div>

        {error && (
          <p className="text-coral text-sm flex items-center gap-2">
            <ShieldAlert size={14} /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium bg-brand text-onBrand disabled:opacity-60"
        >
          <LogIn size={16} /> {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
