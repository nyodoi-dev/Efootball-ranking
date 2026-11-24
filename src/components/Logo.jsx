// Brand artwork drawn in SVG so it scales and follows the theme.

export function LogoMark({ className = 'w-9 h-10' }) {
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sl-mark-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3D98B" />
          <stop offset=".55" stopColor="#D0A64F" />
          <stop offset="1" stopColor="#9A7428" />
        </linearGradient>
      </defs>
      <path d="M24 2 44 9v19c0 12-9 21-20 26C13 49 4 40 4 28V9z" fill="url(#sl-mark-gold)" />
      <path d="M24 6.5 40 12v16c0 9.5-7 17-16 21.5C15 45 8 37.5 8 28V12z" fill="#111722" fillOpacity=".92" />
      <path d="M17 18v20M17 18h15M17 28h12M17 38h15" fill="none" stroke="url(#sl-mark-gold)" strokeWidth="4.5" strokeLinecap="square" />
    </svg>
  );
}

export function Wordmark({ className = '' }) {
  return (
    <div className={`leading-none ${className}`}>
      <div className="font-display font-extrabold text-xl tracking-wide text-brand-strong">EFOOTBALL</div>
      <div className="font-display font-semibold text-sm tracking-[0.2em] text-ink mt-0.5">SUPER LEAGUE</div>
    </div>
  );
}

export function Trophy({ className = 'w-40 h-44' }) {
  return (
    <svg viewBox="0 0 200 220" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sl-trophy-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E3A1" />
          <stop offset=".5" stopColor="#D0A64F" />
          <stop offset="1" stopColor="#8F681E" />
        </linearGradient>
      </defs>
      <path d="M52 40H28c0 36 14 56 44 62" fill="none" stroke="url(#sl-trophy-gold)" strokeWidth="10" strokeLinecap="round" />
      <path d="M148 40h24c0 36-14 56-44 62" fill="none" stroke="url(#sl-trophy-gold)" strokeWidth="10" strokeLinecap="round" />
      <path d="M50 28h100v42c0 38-22 58-50 58S50 108 50 70z" fill="url(#sl-trophy-gold)" />
      <rect x="92" y="126" width="16" height="38" fill="url(#sl-trophy-gold)" />
      <path d="M72 164h56l8 28H64z" fill="url(#sl-trophy-gold)" />
      <rect x="54" y="192" width="92" height="16" rx="4" fill="url(#sl-trophy-gold)" />
      <circle cx="100" cy="68" r="22" fill="none" stroke="#111722" strokeOpacity=".35" strokeWidth="4" />
      <path d="m100 52 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#111722" fillOpacity=".35" />
      <path d="M62 34h10v62c-6-6-10-16-10-28z" fill="#fff" fillOpacity=".22" />
    </svg>
  );
}
