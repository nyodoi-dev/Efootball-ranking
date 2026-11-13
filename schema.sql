-- The Super League — Cloudflare D1 schema
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  elo INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  team_picture_url TEXT,
  highest_rank TEXT
);

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  player_a TEXT NOT NULL,
  player_b TEXT NOT NULL,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  delta_a INTEGER NOT NULL,
  delta_b INTEGER NOT NULL,
  elo_a_after INTEGER NOT NULL,
  elo_b_after INTEGER NOT NULL,
  played_at TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  screenshot_url TEXT,
  season_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_matches_approved ON matches (approved_at);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches (season_id);

CREATE TABLE IF NOT EXISTS pending_matches (
  id TEXT PRIMARY KEY,
  player_a TEXT NOT NULL,
  player_b TEXT NOT NULL,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  submitted_by TEXT,
  created_at TEXT NOT NULL,
  screenshot_url TEXT
);

CREATE TABLE IF NOT EXISTS season_archives (
  id TEXT PRIMARY KEY,
  season_id TEXT,
  player_id TEXT,
  player_name TEXT NOT NULL,
  elo INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  draws INTEGER NOT NULL,
  losses INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trophies (
  id TEXT PRIMARY KEY,
  player_id TEXT,
  competition_name TEXT NOT NULL,
  trophy_type TEXT NOT NULL DEFAULT 'winner',
  count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('knockout', 'group_knockout', 'round_robin')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  affects_elo INTEGER NOT NULL DEFAULT 0,
  groups_count INTEGER,
  group_size INTEGER,
  champion_id TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS tournament_players (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  group_number INTEGER,
  group_wins INTEGER NOT NULL DEFAULT 0,
  group_draws INTEGER NOT NULL DEFAULT 0,
  group_losses INTEGER NOT NULL DEFAULT 0,
  group_goals_for INTEGER NOT NULL DEFAULT 0,
  group_goals_against INTEGER NOT NULL DEFAULT 0,
  group_points INTEGER NOT NULL DEFAULT 0,
  knockout_round TEXT,
  eliminated INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('group', 'knockout')),
  round TEXT,
  match_order INTEGER,
  player_a TEXT,
  player_b TEXT,
  score_a INTEGER,
  score_b INTEGER,
  winner_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'played')),
  next_match_id TEXT,
  next_match_slot TEXT CHECK (next_match_slot IN ('a', 'b')),
  played_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tm_tournament ON tournament_matches (tournament_id);

-- Pictures uploaded through the site (screenshots, team pictures).
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL
);

-- Results reported by players for tournament matches, awaiting admin approval.
-- Approved reports are kept so the screenshot stays attached to the match.
CREATE TABLE IF NOT EXISTS tournament_reports (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  submitted_by TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_treports_tournament ON tournament_reports (tournament_id);
