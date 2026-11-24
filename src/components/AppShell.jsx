import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home as HomeIcon, ListOrdered, Users, Swords, Medal, BarChart3, Trophy, ShieldCheck,
  Sun, Moon, LayoutGrid, ArrowLeft, Repeat, History, ClipboardCheck, CalendarDays, Plus,
} from 'lucide-react';
import { useDarkMode } from '../lib/theme';
import { useLeague } from '../lib/league';
import { LogoMark, Wordmark } from './Logo';
import Sparkles from './Sparkles';

// The frame around every public page: a fixed sidebar on desktop, a compact
// top bar and bottom navigation on phones.

const MAIN_NAV = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/standings', label: 'Standings', Icon: ListOrdered },
  { to: '/players', label: 'Players', Icon: Users },
  { to: '/matches', label: 'Matches', Icon: Swords },
  { to: '/tournaments', label: 'Tournaments', Icon: Medal },
  { to: '/stats', label: 'Statistics', Icon: BarChart3 },
  { to: '/hall-of-fame', label: 'Hall of Fame', Icon: Trophy },
];

const TOOLS_NAV = [
  { to: '/head-to-head', label: 'Head-to-Head', Icon: Repeat },
  { to: '/history', label: 'Match History', Icon: History },
  { to: '/approvals', label: 'Approvals', Icon: ClipboardCheck, badge: true },
];

const TITLES = {
  '/': 'Home',
  '/standings': 'Standings',
  '/players': 'Players',
  '/matches': 'Matches',
  '/report': 'Report a match',
  '/approvals': 'Approvals',
  '/stats': 'Statistics',
  '/head-to-head': 'Head-to-Head',
  '/history': 'Match History',
  '/tournaments': 'Tournaments',
  '/hall-of-fame': 'Hall of Fame',
  '/more': 'More',
};

// Destinations that live under "More" on phones.
const MORE_ROOTS = ['/more', '/players', '/tournaments', '/stats', '/head-to-head', '/history', '/hall-of-fame', '/approvals'];
const inMore = (p) => MORE_ROOTS.some((r) => p === r || p.startsWith(`${r}/`));

// Player and tournament detail pages draw their own header.
const hasOwnHeader = (p) => /^\/(players|tournaments)\/[^/]+$/.test(p);

const sideLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-brand/15 text-brand-strong' : 'text-muted hover:bg-card2 hover:text-ink'
  }`;

function ThemeToggle({ dark, onToggle, className = '' }) {
  return (
    <button onClick={onToggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-card2 hover:text-ink transition-colors ${className}`}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function Sidebar({ pending, isAdmin, season }) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-nav border-r border-line z-30">
      <Link to="/" aria-label="Efootball Super League home" className="flex items-center gap-3 px-5 h-20 border-b border-line">
        <LogoMark className="w-9 h-10" />
        <Wordmark />
      </Link>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {MAIN_NAV.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={sideLink}>
                <Icon size={19} aria-hidden="true" /> {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <ul className="space-y-1 mt-4 pt-4 border-t border-line">
          {TOOLS_NAV.map(({ to, label, Icon, badge }) => (
            <li key={to}>
              <NavLink to={to} className={sideLink}>
                <Icon size={19} aria-hidden="true" /> <span className="flex-1">{label}</span>
                {badge && pending > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-onBrand text-xs font-bold flex items-center justify-center">
                    {pending}<span className="sr-only"> waiting</span>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
          {isAdmin && (
            <li>
              <NavLink to="/admin" className={sideLink}>
                <ShieldCheck size={19} aria-hidden="true" /> Admin Panel
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="p-4 border-t border-line space-y-3">
        <Link to="/report"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand text-onBrand font-semibold text-sm py-3 hover:bg-brand-strong transition-colors">
          <Plus size={17} aria-hidden="true" /> Report Match
        </Link>
        <div className="rounded-xl bg-card2 px-3 py-2.5 text-xs">
          <div className="text-muted">Current season</div>
          <div className="font-semibold text-ink mt-0.5">{season?.current?.name || 'Between seasons'}</div>
        </div>
        {!isAdmin && (
          <Link to="/admin/login" className="block text-center text-xs text-muted hover:text-ink">Admin sign in</Link>
        )}
      </div>
    </aside>
  );
}

function TopBar({ pathname, dark, onToggle, season, isAdmin }) {
  const home = pathname === '/';
  const own = hasOwnHeader(pathname);
  const back = inMore(pathname) && pathname !== '/more' && !own;
  return (
    <header className={`sticky top-0 z-40 bg-nav/95 backdrop-blur border-b border-line ${own ? 'hidden lg:block' : ''}`}>
      <div className="h-14 lg:h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-2">
        {/* Phones: back arrow for pages under More, brand on Home, page title elsewhere. */}
        {back && (
          <Link to="/more" aria-label="Back to More" className="lg:hidden -ml-2 w-10 h-10 flex items-center justify-center text-muted">
            <ArrowLeft size={20} />
          </Link>
        )}
        {home ? (
          <Link to="/" className="lg:hidden flex items-center gap-2.5 flex-1 min-w-0" aria-label="Efootball Super League home">
            <LogoMark className="w-7 h-8 flex-shrink-0" />
            <Wordmark />
          </Link>
        ) : (
          <h1 className="lg:hidden flex-1 min-w-0 truncate font-display font-bold text-3xl leading-none text-ink">
            {TITLES[pathname] || 'Efootball Super League'}
          </h1>
        )}

        {/* Desktop: season on the left, controls on the right. */}
        <div className="hidden lg:flex flex-1 items-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink">
            <CalendarDays size={15} className="text-brand-strong" aria-hidden="true" />
            {season?.current?.name || 'Between seasons'}
          </span>
        </div>
        <Link to={isAdmin ? '/admin' : '/admin/login'} aria-label={isAdmin ? 'Admin panel' : 'Admin sign in'}
          className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-card2 hover:text-ink transition-colors">
          <ShieldCheck size={18} />
        </Link>
        <ThemeToggle dark={dark} onToggle={onToggle} />
      </div>
    </header>
  );
}

function BottomNav({ pathname, pending }) {
  const item = ({ isActive }) =>
    `flex-1 flex flex-col items-center justify-center gap-1 pt-2 pb-2.5 ${isActive ? 'text-brand-strong' : 'text-muted'}`;
  const label = (active, text) => (
    <span className={`text-[11px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>{text}</span>
  );
  const moreActive = inMore(pathname);
  return (
    <nav aria-label="Main" className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-nav border-t border-line safe-bottom">
      <div className="max-w-lg mx-auto flex items-stretch">
        <NavLink to="/" end className={item}>
          {({ isActive }) => (<><HomeIcon size={21} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />{label(isActive, 'Home')}</>)}
        </NavLink>
        <NavLink to="/standings" className={item}>
          {({ isActive }) => (<><ListOrdered size={21} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />{label(isActive, 'Standings')}</>)}
        </NavLink>
        <NavLink to="/report" className={item} aria-label="Report a match">
          {({ isActive }) => (
            <>
              <span className="-mt-5 w-12 h-12 rounded-full bg-brand text-onBrand flex items-center justify-center border-4 border-nav">
                <Plus size={22} strokeWidth={2.6} aria-hidden="true" />
              </span>
              {label(isActive, 'Report')}
            </>
          )}
        </NavLink>
        <NavLink to="/matches" className={item}>
          {({ isActive }) => (<><Swords size={21} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />{label(isActive, 'Matches')}</>)}
        </NavLink>
        <Link to="/more" aria-current={pathname === '/more' ? 'page' : undefined} className={`${item({ isActive: moreActive })} relative`}>
          <span className="relative">
            <LayoutGrid size={21} strokeWidth={moreActive ? 2.4 : 1.8} aria-hidden="true" />
            {pending > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-brand border-2 border-nav">
                <span className="sr-only">{pending} results waiting for approval</span>
              </span>
            )}
          </span>
          {label(moreActive, 'More')}
        </Link>
      </div>
    </nav>
  );
}

export default function AppShell() {
  const [dark, toggleDark] = useDarkMode();
  const { pending, isAdmin, season } = useLeague();
  const { pathname } = useLocation();

  // Pages used to be tabs on one screen; start each page at the top.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="relative isolate min-h-screen bg-app text-ink">
  <Sparkles />
      <a href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-brand focus:text-onBrand focus:px-3 focus:py-2 focus:rounded-lg">
        Skip to content
      </a>
      <Sidebar pending={pending.length} isAdmin={isAdmin} season={season} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <TopBar pathname={pathname} dark={dark} onToggle={toggleDark} season={season} isAdmin={isAdmin} />
        <main id="main" className="flex-1 pb-24 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomNav pathname={pathname} pending={pending.length} />
    </div>
  );
}
