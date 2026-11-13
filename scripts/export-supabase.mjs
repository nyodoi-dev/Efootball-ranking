// One-off migration helper: pulls the league data and images out of the old
// Supabase project and writes
//   data/export.json   raw rows
//   public/img/*       resized pictures, served by the site at /img/...
//   data/seed.sql      INSERT statements for the new D1 database
//
// Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/export-supabase.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  process.exit(1);
}

const TABLES = [
  'players', 'seasons', 'matches', 'pending_matches', 'season_archives', 'trophies',
  'tournaments', 'tournament_players', 'tournament_matches',
];

async function fetchTable(name) {
  const res = await fetch(`${URL_BASE}/rest/v1/${name}?select=*`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
  return res.json();
}

const iso = (v) => (v ? new Date(v).toISOString() : null);
const sql = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replace(/'/g, "''")}'`;
};

const imageDir = path.resolve('public/img');
await mkdir(imageDir, { recursive: true });
const imageMap = {}; // old url -> new /img/ path

async function migrateImage(url, maxSize) {
  if (!url) return null;
  if (imageMap[url]) return imageMap[url];
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ! could not download ${url} (${res.status})`);
    return null;
  }
  const input = Buffer.from(await res.arrayBuffer());
  const base = path.basename(new URL(url).pathname).replace(/\.[^.]+$/, '');
  const key = `${base}.webp`;
  const output = await sharp(input)
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  await writeFile(path.join(imageDir, key), output);
  console.log(`  ${key}  ${(input.length / 1024) | 0} KB -> ${(output.length / 1024) | 0} KB`);
  imageMap[url] = `/img/${key}`;
  return imageMap[url];
}

const data = {};
for (const t of TABLES) {
  data[t] = await fetchTable(t);
  console.log(`${t}: ${data[t].length} rows`);
}
await writeFile('data/export.json', JSON.stringify(data, null, 2));

console.log('Downloading pictures…');
for (const p of data.players) p.team_picture_url = await migrateImage(p.team_picture_url, 512);
for (const m of data.matches) m.screenshot_url = await migrateImage(m.screenshot_url, 1600);
for (const m of data.pending_matches) m.screenshot_url = await migrateImage(m.screenshot_url, 1600);

// The old database ended up with several seasons open at once. Keep only the
// newest one open; close each older one at the moment the next one started.
const seasons = [...data.seasons].sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
seasons.forEach((s, i) => {
  if (!s.ended_at && i < seasons.length - 1) s.ended_at = seasons[i + 1].started_at;
});

const out = [];
const insert = (table, cols, row) =>
  out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => sql(row[c])).join(', ')});`);

for (const p of data.players) {
  insert('players', ['id', 'name', 'elo', 'wins', 'draws', 'losses', 'created_at', 'team_picture_url', 'highest_rank'],
    { ...p, created_at: iso(p.created_at) });
}
for (const s of seasons) {
  insert('seasons', ['id', 'name', 'started_at', 'ended_at'],
    { ...s, started_at: iso(s.started_at), ended_at: iso(s.ended_at) });
}
for (const m of data.matches) {
  insert('matches', ['id', 'player_a', 'player_b', 'score_a', 'score_b', 'delta_a', 'delta_b', 'elo_a_after', 'elo_b_after', 'played_at', 'approved_at', 'screenshot_url', 'season_id'],
    { ...m, played_at: iso(m.played_at), approved_at: iso(m.approved_at) });
}
for (const m of data.pending_matches) {
  insert('pending_matches', ['id', 'player_a', 'player_b', 'score_a', 'score_b', 'submitted_by', 'created_at', 'screenshot_url'],
    { ...m, created_at: iso(m.created_at) });
}
for (const a of data.season_archives) {
  insert('season_archives', ['id', 'season_id', 'player_id', 'player_name', 'elo', 'wins', 'draws', 'losses'], a);
}
for (const t of data.trophies) {
  insert('trophies', ['id', 'player_id', 'competition_name', 'trophy_type', 'count', 'created_at'],
    { ...t, created_at: iso(t.created_at) });
}
for (const t of data.tournaments) {
  insert('tournaments', ['id', 'name', 'format', 'status', 'affects_elo', 'groups_count', 'group_size', 'champion_id', 'created_at', 'completed_at'],
    { ...t, created_at: iso(t.created_at), completed_at: iso(t.completed_at) });
}
for (const p of data.tournament_players) {
  insert('tournament_players', ['id', 'tournament_id', 'player_id', 'group_number', 'group_wins', 'group_draws', 'group_losses', 'group_goals_for', 'group_goals_against', 'group_points', 'knockout_round', 'eliminated'], p);
}
for (const m of data.tournament_matches) {
  insert('tournament_matches', ['id', 'tournament_id', 'stage', 'round', 'match_order', 'player_a', 'player_b', 'score_a', 'score_b', 'winner_id', 'status', 'next_match_id', 'next_match_slot', 'played_at', 'created_at'],
    { ...m, played_at: iso(m.played_at), created_at: iso(m.created_at) });
}
await writeFile('data/seed.sql', out.join('\n') + '\n');
console.log(`Wrote data/seed.sql (${out.length} rows) and ${Object.keys(imageMap).length} pictures.`);
