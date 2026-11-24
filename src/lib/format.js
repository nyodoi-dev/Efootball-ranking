// Small formatting helpers and labels shared by the pages.

export function daysAgo(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export const CUP_FORMATS = {
  knockout: 'Knockout',
  group_knockout: 'Groups then knockout',
  round_robin: 'Round robin',
};

const ROUND_LABELS = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final', sf: 'Semi-final', f: 'Final' };

// Group stage rounds are already labelled ("Group 1"); knockout rounds are codes.
export function roundLabel(r) {
  if (!r) return '';
  return ROUND_LABELS[r] || (/^r\d+$/.test(r) ? `Round of ${r.slice(1)}` : r);
}

// Colours work on both themes: tinted backgrounds are made from the colour itself.
export const TROPHY_TYPES = {
  winner:       { label: 'Winner',       emoji: '🏆', color: '#C99A2E' },
  runner_up:    { label: 'Runner Up',    emoji: '🥈', color: '#8A99AD' },
  golden_boot:  { label: 'Golden Boot',  emoji: '👟', color: '#10B981' },
  golden_glove: { label: 'Golden Glove', emoji: '🧤', color: '#3B82F6' },
  top_scorer:   { label: 'Top Scorer',   emoji: '⭐', color: '#F97316' },
  season_mvp:   { label: 'Season MVP',   emoji: '🏅', color: '#8B5CF6' },
};

// 'W', 'D' or 'L' for one player in one match.
export function resultFor(match, playerId) {
  const mine = match.player_a === playerId ? match.score_a : match.score_b;
  const theirs = match.player_a === playerId ? match.score_b : match.score_a;
  return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
}

export const signed = (n) => `${n >= 0 ? '+' : ''}${n}`;
