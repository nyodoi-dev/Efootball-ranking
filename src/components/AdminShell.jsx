import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, ExternalLink, LayoutDashboard, ListChecks, LogOut, Medal, Moon, Sun, Trophy, Users, X,
} from 'lucide-react';
import { signOut } from '../lib/api';
import { useDarkMode } from '../lib/theme';
import { AdminProvider, useAdmin } from '../lib/admin';
import { LogoMark } from './Logo';
import Sparkles from './Sparkles';
import { ErrorState, Skeleton } from './ui';

// The frame around every admin section: a sidebar on desktop, and a scrollable
// tab strip under a slim top bar on phones.

const NAV = [
  { to: '/admin', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/admin/approvals', label: 'Approvals', Icon: ListChecks, badge: true },
  { to: '/admin/players', label: 'Players', Icon: Users },
  { to: '/admin/trophies', label: 'Trophies', Icon: Trophy },
  { to: '/admin/seasons', label: 'Seasons', Icon: CalendarDays },
  { to: '/admin/tournaments', label: 'Tournaments', Icon: Medal },
];

export function AdminPage({ title, subtitle, actions, back, children }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-8 max-w-4xl mx-auto w-full">
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink mb-3">
          <ArrowLeft size={14} aria-hidden="true" /> {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-4xl lg:text-5xl leading-none text-ink break-words">{title}</h1>
          {subtitle && <p className="text-muted text-sm lg:text-base mt-2">{subtitle}</p>}
        </div>
        {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

const sideLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-brand/15 text-brand-strong' : 'text-muted hover:bg-card2 hover:text-ink'
  }`;

const tabLink = ({ isActive }) =>
  `flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-brand text-onBrand' : 'text-muted hover:text-ink hover:bg-card2'
  }`;

function Count({ n, className = '' }) {
  if (!n) return null;
  return (
    <span className={`min-w-5 h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center bg-brand text-onBrand ${className}`}>
      {n}<span className="sr-only"> waiting</span>
    </span>
  );
}

function Notice() {
  const { notice, dismiss } = useAdmin();
  if (!notice) return null;
  const error = notice.type === 'error';
  return (
    <div role={error ? 'alert' : 'status'}
      className={`fixed z-[60] bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg flex items-start gap-3 bg-card ${
        error ? 'border-danger/40 text-danger' : 'border-win/40 text-win'
      }`}>
      <span className="flex-1">{notice.text}</span>
      <button onClick={dismiss} aria-label="Dismiss message" className="text-muted hover:text-ink -mr-1 -mt-0.5 p-1"><X size={14} /></button>
    </div>
  );
}

function Frame() {
  const [dark, toggleDark] = useDarkMode();
  const { pending, status, reload } = useAdmin();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const strip = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  // Keep the current tab in view on narrow screens.
  useEffect(() => {
    strip.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  async function logout() {
    await signOut();
    navigate('/admin/login');
  }

  return (
    <div className="relative isolate min-h-screen bg-app text-ink">
  <Sparkles />
      <a href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-brand focus:text-onBrand focus:px-3 focus:py-2 focus:rounded-lg">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-nav border-r border-line z-30">
        <Link to="/admin" className="flex items-center gap-3 px-5 h-20 border-b border-line" aria-label="Admin overview">
          <LogoMark className="w-9 h-10" />
          <div className="leading-none">
            <div className="font-display font-extrabold text-xl tracking-wide text-brand-strong">ADMIN</div>
            <div className="font-display font-semibold text-sm tracking-[0.2em] text-ink mt-0.5">SUPER LEAGUE</div>
          </div>
        </Link>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV.map(({ to, label, Icon, end, badge }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={sideLink}>
                  <Icon size={19} aria-hidden="true" /> <span className="flex-1">{label}</span>
                  {badge && <Count n={pending.length} />}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-line space-y-1">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-card2 hover:text-ink">
            <ExternalLink size={19} aria-hidden="true" /> View site
          </Link>
          <button onClick={toggleDark} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-card2 hover:text-ink">
            {dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />} {dark ? 'Light theme' : 'Dark theme'}
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-card2 hover:text-ink">
            <LogOut size={19} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Phone top bar and tab strip */}
        <header className="lg:hidden sticky top-0 z-40 bg-nav/95 backdrop-blur border-b border-line">
          <div className="h-14 px-4 flex items-center gap-2">
            <Link to="/admin" className="flex items-center gap-2.5 flex-1 min-w-0" aria-label="Admin overview">
              <LogoMark className="w-7 h-8 flex-shrink-0" />
              <span className="font-display font-extrabold text-xl tracking-wide text-brand-strong">ADMIN</span>
            </Link>
            <Link to="/" aria-label="View site" className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-card2 hover:text-ink"><ExternalLink size={18} /></Link>
            <button onClick={toggleDark} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-card2 hover:text-ink">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={logout} aria-label="Sign out" className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-card2 hover:text-ink"><LogOut size={18} /></button>
          </div>
          <nav aria-label="Admin sections" ref={strip} className="flex gap-1 overflow-x-auto no-scrollbar px-3 pb-2">
            {NAV.map(({ to, label, Icon, end, badge }) => (
              <NavLink key={to} to={to} end={end} className={tabLink}>
                <Icon size={15} aria-hidden="true" /> {label}
                {badge && pending.length > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-brand text-onBrand text-[10px] font-bold flex items-center justify-center ring-1 ring-nav">
                    {pending.length}<span className="sr-only"> waiting</span>
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </header>

        <main id="admin-main" className="flex-1 pb-16">
          {status === 'loading' ? (
            <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto space-y-4" role="status" aria-label="Loading">
              <Skeleton className="h-12 w-56" /><Skeleton className="h-32" /><Skeleton className="h-32" />
            </div>
          ) : status === 'error' ? (
            <ErrorState message="We couldn't load the admin data." onRetry={reload} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <Notice />
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminProvider>
      <Frame />
    </AdminProvider>
  );
}
