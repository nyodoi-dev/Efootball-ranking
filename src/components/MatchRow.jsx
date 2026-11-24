import { Image as ImageIcon } from 'lucide-react';
import { Avatar, StatusBadge } from './ui';
import { daysAgo, signed } from '../lib/format';

// One approved result: players, score, ELO change, and when it was played.
// Draws get a text badge, and the winner is bold, so no result relies on colour.

function Side({ player, won, delta, align }) {
  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <Avatar player={player} className="w-8 h-8 hidden sm:flex" />
      <div className="min-w-0">
        <div className={`truncate text-sm ${won ? 'font-semibold text-ink' : 'text-muted'}`}>{player?.name || 'Former player'}</div>
        <div className={`text-xs tabular ${delta >= 0 ? 'text-win' : 'text-danger'}`}>
          <span className="sr-only">ELO </span>{signed(delta)}
        </div>
      </div>
    </div>
  );
}

// `badge` ('win' | 'draw' | 'loss') marks the result from one player's view,
// used on that player's profile.
export function MatchRow({ match: m, playerById, badge }) {
  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <Side player={playerById[m.player_a]} won={m.score_a > m.score_b} delta={m.delta_a} align="right" />
        <div className="font-display font-bold text-2xl leading-none text-ink tabular whitespace-nowrap">
          {m.score_a} <span className="text-muted">–</span> {m.score_b}
        </div>
        <Side player={playerById[m.player_b]} won={m.score_b > m.score_a} delta={m.delta_b} />
      </div>
      <div className="flex items-center justify-center gap-3 mt-1.5 text-xs text-muted">
        <span>{daysAgo(m.approved_at)}</span>
        {badge ? <StatusBadge kind={badge} /> : m.score_a === m.score_b && <StatusBadge kind="draw" />}
        {m.screenshot_url && (
          <a href={m.screenshot_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-strong hover:underline">
            <ImageIcon size={12} aria-hidden="true" /> Screenshot
          </a>
        )}
      </div>
    </li>
  );
}
