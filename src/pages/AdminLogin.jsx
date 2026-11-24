import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, ShieldAlert } from 'lucide-react';
import { signIn } from '../lib/api';
import { LogoMark } from '../components/Logo';
import { inputCls } from '../components/ui';

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
    <div className="min-h-screen bg-app text-ink flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-6">
          <ArrowLeft size={15} aria-hidden="true" /> Back to the league
        </Link>

        <div className="text-center mb-7">
          <LogoMark className="w-12 h-14 mx-auto" />
          <h1 className="font-display font-extrabold text-5xl leading-none mt-4">Admin</h1>
          <p className="text-muted text-sm mt-2">Sign in to manage the Super League.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-line rounded-2xl p-5 space-y-4">
          <div>
            <label htmlFor="admin-password" className="block text-muted text-xs mb-1.5">Admin password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
              className={inputCls}
            />
          </div>

          {error && (
            <p role="alert" className="text-danger text-sm font-medium flex items-center gap-2">
              <ShieldAlert size={15} aria-hidden="true" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold bg-brand text-onBrand hover:bg-brand-strong transition-colors disabled:opacity-60"
          >
            <LogIn size={16} aria-hidden="true" /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
