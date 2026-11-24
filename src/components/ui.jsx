import { Link } from 'react-router-dom';
import { User, CheckCircle2, XCircle, Clock, Minus, RotateCw, AlertTriangle, Circle } from 'lucide-react';
import { useLeague } from '../lib/league';

// Small building blocks used by every page, so the whole site shares one look.

export function Avatar({ player, className = 'w-10 h-10' }) {
  return player?.team_picture_url ? (
    <img src={player.team_picture_url} alt="" className={`${className} rounded-xl object-cover flex-shrink-0 border border-line`} />
  ) : (
    <div className={`${className} rounded-xl bg-brand/10 flex-shrink-0 flex items-center justify-center border border-line`}>
      <User size={16} className="text-brand-strong" />
    </div>
  );
}

// Last five results, newest first. Text label for screen readers; the dots are
// decorative so colour is never the only signal.
export function FormDots({ form }) {
  const last5 = (form || []).slice(-5).reverse();
  const slots = [...last5, ...Array(5 - last5.length).fill(null)];
  const cls = { W: 'bg-win', D: 'bg-draw', L: 'bg-danger' };
  return (
    <div className="flex gap-1" role="img" aria-label={last5.length ? `Last results: ${last5.join(' ')}` : 'No results yet'}>
      {slots.map((r, i) => (
        <span key={i} className={`w-2 h-2 rounded-sm ${cls[r] || 'bg-line'}`} />
      ))}
    </div>
  );
}

const BADGES = {
  win:       { label: 'Win',         Icon: CheckCircle2, cls: 'bg-win/15 text-win' },
  draw:      { label: 'Draw',        Icon: Minus,        cls: 'bg-draw/15 text-draw' },
  loss:      { label: 'Loss',        Icon: XCircle,      cls: 'bg-danger/15 text-danger' },
  pending:   { label: 'Pending',     Icon: Clock,        cls: 'bg-accent/15 text-accent' },
  approved:  { label: 'Approved',    Icon: CheckCircle2, cls: 'bg-win/15 text-win' },
  rejected:  { label: 'Rejected',    Icon: XCircle,      cls: 'bg-danger/15 text-danger' },
  scheduled: { label: 'To play',     Icon: Clock,        cls: 'bg-card2 text-muted' },
  live:      { label: 'In progress', Icon: Circle,       cls: 'bg-accent/15 text-accent' },
  done:      { label: 'Completed',   Icon: CheckCircle2, cls: 'bg-win/15 text-win' },
  draft:     { label: 'Draft',       Icon: Circle,       cls: 'bg-card2 text-muted' },
};

// Always an icon plus a word, never colour alone.
export function StatusBadge({ kind, label }) {
  const b = BADGES[kind] || BADGES.draft;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${b.cls}`}>
      <b.Icon size={12} aria-hidden="true" />
      {label || b.label}
    </span>
  );
}

export function Card({ className = '', children, ...rest }) {
  return <div className={`bg-card border border-line rounded-2xl ${className}`} {...rest}>{children}</div>;
}

export function SectionHeading({ children, to, action }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="font-display font-bold text-2xl leading-none text-ink">{children}</h2>
      {to && action && (
        <Link to={to} className="text-sm font-semibold text-brand-strong hover:underline py-1">{action}</Link>
      )}
    </div>
  );
}

// Page wrapper: consistent gutters, and a heading on desktop (phones show the
// title in the top bar instead).
export function Page({ title, subtitle, actions, children, className = '' }) {
  return (
    <div className={`px-4 sm:px-6 lg:px-8 py-5 lg:py-8 max-w-6xl mx-auto w-full ${className}`}>
      {title && (
        <div className="hidden lg:flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-extrabold text-5xl leading-none text-ink">{title}</h1>
            {subtitle && <p className="text-muted mt-2">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="bg-card border border-line rounded-2xl px-6 py-10 text-center">
      {Icon && <Icon size={30} className="text-muted mx-auto mb-3" aria-hidden="true" />}
      {title && <p className="font-semibold text-ink">{title}</p>}
      {children && <p className="text-sm text-muted mt-1">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "We couldn't load the league data.", onRetry }) {
  return (
    <div className="px-4 py-16 max-w-md mx-auto text-center" role="alert">
      <AlertTriangle size={32} className="text-danger mx-auto mb-3" aria-hidden="true" />
      <p className="font-semibold text-ink">{message}</p>
      <p className="text-sm text-muted mt-1">Check your connection and try again.</p>
      {onRetry && (
        <button onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand text-onBrand font-semibold text-sm px-4 py-2.5 hover:bg-brand-strong transition-colors">
          <RotateCw size={15} /> Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-card2 ${className}`} aria-hidden="true" />;
}

// Generic placeholder for list-style pages.
export function ListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
    </div>
  );
}

// Placeholder shaped like the Home dashboard.
export function PageSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-8 max-w-6xl mx-auto w-full space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-48 lg:h-60" />
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-56" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

// Shows a skeleton while the league loads and a retry if it can't, otherwise the page.
export function LeagueGate({ children, skeleton }) {
  const { status, reload } = useLeague();
  if (status === 'loading') return skeleton || <ListSkeleton />;
  if (status === 'error') return <ErrorState onRetry={reload} />;
  return children;
}

export const inputCls =
  'w-full rounded-xl px-4 py-3 text-sm bg-card border border-line text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40';
