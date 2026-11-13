import { Hono } from 'hono';
import {
  START_ELO, eloDelta, uid, now,
  checkPassword, sessionCookie, clearCookie, isAdmin,
} from './util.js';
import { startTournament, enterResult } from './tournaments.js';

const app = new Hono();
const api = new Hono();

const fail = (c, error, status = 400) => c.json({ error }, status);
const body = (c) => c.req.json().catch(() => ({}));
const all = async (stmt) => (await stmt.all()).results;

const requireAdmin = async (c, next) => {
  if (!(await isAdmin(c.env, c.req.header('Cookie')))) return fail(c, 'Admin login required.', 401);
  await next();
};

api.use('*', async (c, next) => {
  await next();
  if (!c.res.headers.has('Cache-Control')) c.res.headers.set('Cache-Control', 'no-store');
});

api.onError((err, c) => {
  console.error(err);
  return fail(c, err.message || 'Something went wrong.', 500);
});

// ── Auth ────────────────────────────────────────────────────────────────────
api.post('/auth/login', async (c) => {
  if (!c.env.ADMIN_PASSWORD) return fail(c, 'No admin password has been set for this site yet.', 500);
  const { password } = await body(c);
  if (!(await checkPassword(c.env, password))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return fail(c, 'Wrong password.', 401);
  }
  c.header('Set-Cookie', await sessionCookie(c.env, new URL(c.req.url).protocol === 'https:'));
  return c.json({ success: true });
});

api.post('/auth/logout', (c) => {
  c.header('Set-Cookie', clearCookie());
  return c.json({ success: true });
});

api.get('/auth/me', async (c) => c.json({ admin: await isAdmin(c.env, c.req.header('Cookie')) }));

// ── Players ─────────────────────────────────────────────────────────────────
api.get('/players', async (c) => c.json(await all(c.env.DB.prepare('SELECT * FROM players ORDER BY elo DESC, name'))));

api.post('/players', requireAdmin, async (c) => {
  const name = String((await body(c)).name || '').trim();
  if (!name) return fail(c, 'Name is required.');
  const existing = await c.env.DB.prepare('SELECT id FROM players WHERE name = ?').bind(name).first();
  if (existing) return fail(c, 'That name is already on the table.');
  const id = uid();
  await c.env.DB.prepare('INSERT INTO players (id, name, elo, created_at) VALUES (?, ?, ?, ?)').bind(id, name, START_ELO, now()).run();
  return c.json(await c.env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(id).first());
});

const isImagePath = (v) => typeof v === 'string' && /^\/(api\/)?img\/[\w.-]+$/.test(v);

async function updatePlayer(c, id, updates) {
  const cols = Object.keys(updates);
  if (cols.length === 0) return fail(c, 'Nothing to update.');
  try {
    await c.env.DB.prepare(`UPDATE players SET ${cols.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
      .bind(...cols.map((k) => updates[k]), id)
      .run();
  } catch (err) {
    return fail(c, /UNIQUE/.test(err.message) ? 'That name is already on the table.' : err.message);
  }
  const player = await c.env.DB.prepare('SELECT * FROM players WHERE id = ?').bind(id).first();
  return player ? c.json(player) : fail(c, 'Player not found.', 404);
}

api.put('/players/:id', requireAdmin, async (c) => {
  const b = await body(c);
  const updates = {};
  if (b.name !== undefined) {
    updates.name = String(b.name).trim();
    if (!updates.name) return fail(c, 'Name cannot be empty.');
  }
  for (const f of ['elo', 'wins', 'draws', 'losses']) {
    if (b[f] === undefined) continue;
    const n = Number.parseInt(b[f], 10);
    if (Number.isNaN(n)) return fail(c, `${f} must be a number.`);
    updates[f] = n;
  }
  if (b.team_picture_url !== undefined) updates.team_picture_url = b.team_picture_url || null;
  if (b.highest_rank !== undefined) updates.highest_rank = String(b.highest_rank ?? '').trim().slice(0, 60);
  return updatePlayer(c, c.req.param('id'), updates);
});

// Open to anyone: a member sets their own team picture and highest rank.
api.put('/players/:id/profile', async (c) => {
  const b = await body(c);
  const updates = {};
  if (b.teamPictureUrl !== undefined) {
    if (!isImagePath(b.teamPictureUrl)) return fail(c, 'Upload the picture first.');
    updates.team_picture_url = b.teamPictureUrl;
  }
  if (b.highestRank !== undefined) updates.highest_rank = String(b.highestRank).trim().slice(0, 60);
  return updatePlayer(c, c.req.param('id'), updates);
});

api.delete('/players/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;
  const busy = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM tournament_players tp JOIN tournaments t ON t.id = tp.tournament_id
       WHERE tp.player_id = ? AND t.status = 'active'`
    )
    .bind(id)
    .first();
  if (busy.n > 0) return fail(c, 'This player is in a tournament that is still running. Finish or delete it first.');
  await db.batch([
    db.prepare('DELETE FROM matches WHERE player_a = ?1 OR player_b = ?1').bind(id),
    db.prepare('DELETE FROM pending_matches WHERE player_a = ?1 OR player_b = ?1').bind(id),
    db.prepare('DELETE FROM trophies WHERE player_id = ?').bind(id),
    db.prepare('UPDATE season_archives SET player_id = NULL WHERE player_id = ?').bind(id),
    db.prepare("DELETE FROM tournament_players WHERE player_id = ? AND tournament_id IN (SELECT id FROM tournaments WHERE status = 'draft')").bind(id),
    db.prepare('DELETE FROM players WHERE id = ?').bind(id),
  ]);
  return c.json({ success: true });
});

// ── Matches ─────────────────────────────────────────────────────────────────
api.get('/matches', async (c) =>
  c.json(await all(c.env.DB.prepare('SELECT * FROM matches ORDER BY approved_at DESC LIMIT 200')))
);

api.get('/head-to-head', async (c) => {
  const a = c.req.query('a');
  const b = c.req.query('b');
  if (!a || !b) return fail(c, 'Two players are required.');
  return c.json(
    await all(
      c.env.DB.prepare(
        `SELECT * FROM matches
         WHERE (player_a = ?1 AND player_b = ?2) OR (player_a = ?2 AND player_b = ?1)
         ORDER BY approved_at DESC`
      ).bind(a, b)
    )
  );
});

// ── Reported results awaiting approval ──────────────────────────────────────
api.get('/pending', async (c) => c.json(await all(c.env.DB.prepare('SELECT * FROM pending_matches ORDER BY created_at'))));

api.post('/pending', async (c) => {
  const { playerA, playerB, scoreA, scoreB, submittedBy, screenshotUrl } = await body(c);
  if (!playerA || !playerB || playerA === playerB) return fail(c, 'Pick two different players.');
  const sA = Number.parseInt(scoreA, 10);
  const sB = Number.parseInt(scoreB, 10);
  if (!Number.isInteger(sA) || !Number.isInteger(sB) || sA < 0 || sB < 0 || sA > 99 || sB > 99) {
    return fail(c, 'Enter a final score for both sides.');
  }
  const db = c.env.DB;
  const found = await db.prepare('SELECT COUNT(*) AS n FROM players WHERE id IN (?, ?)').bind(playerA, playerB).first();
  if (found.n !== 2) return fail(c, 'Could not find both players.');
  if (screenshotUrl && !isImagePath(screenshotUrl)) return fail(c, 'Upload the screenshot first.');

  const id = uid();
  const who = String(submittedBy || '').trim().slice(0, 40) || 'Unknown';
  await db
    .prepare('INSERT INTO pending_matches (id, player_a, player_b, score_a, score_b, submitted_by, created_at, screenshot_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, playerA, playerB, sA, sB, who, now(), screenshotUrl || null)
    .run();
  return c.json(await db.prepare('SELECT * FROM pending_matches WHERE id = ?').bind(id).first());
});

const currentSeason = (db) => db.prepare('SELECT * FROM seasons WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1').first();

// Approve: update ratings and records, record the match, clear the report.
api.post('/pending/:id', requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const entry = await db.prepare('SELECT * FROM pending_matches WHERE id = ?').bind(id).first();
  if (!entry) return fail(c, 'That result no longer exists.', 404);
  const pA = await db.prepare('SELECT * FROM players WHERE id = ?').bind(entry.player_a).first();
  const pB = await db.prepare('SELECT * FROM players WHERE id = ?').bind(entry.player_b).first();
  if (!pA || !pB) return fail(c, 'Could not load both players.', 500);

  const result = entry.score_a > entry.score_b ? 1 : entry.score_a < entry.score_b ? 0 : 0.5;
  const dA = eloDelta(pA.elo, pB.elo, result);
  const dB = eloDelta(pB.elo, pA.elo, 1 - result);
  const season = await currentSeason(db);
  const upd = 'UPDATE players SET elo = ?, wins = wins + ?, draws = draws + ?, losses = losses + ? WHERE id = ?';

  await db.batch([
    db.prepare(upd).bind(pA.elo + dA, result === 1 ? 1 : 0, result === 0.5 ? 1 : 0, result === 0 ? 1 : 0, pA.id),
    db.prepare(upd).bind(pB.elo + dB, result === 0 ? 1 : 0, result === 0.5 ? 1 : 0, result === 1 ? 1 : 0, pB.id),
    db
      .prepare(
        `INSERT INTO matches (id, player_a, player_b, score_a, score_b, delta_a, delta_b, elo_a_after, elo_b_after, played_at, approved_at, screenshot_url, season_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(uid(), entry.player_a, entry.player_b, entry.score_a, entry.score_b, dA, dB, pA.elo + dA, pB.elo + dB, entry.created_at, now(), entry.screenshot_url, season?.id || null),
    db.prepare('DELETE FROM pending_matches WHERE id = ?').bind(id),
  ]);
  return c.json({ success: true });
});

api.delete('/pending/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM pending_matches WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

// ── Seasons ─────────────────────────────────────────────────────────────────
api.get('/season', async (c) => {
  const db = c.env.DB;
  const seasons = await all(db.prepare('SELECT * FROM seasons ORDER BY started_at DESC'));
  const current = seasons.find((s) => !s.ended_at) || null;
  const past = seasons.filter((s) => s.ended_at);
  const archives = past.length
    ? await all(db.prepare('SELECT a.* FROM season_archives a JOIN seasons s ON s.id = a.season_id WHERE s.ended_at IS NOT NULL ORDER BY a.elo DESC'))
    : [];
  return c.json({ current, past, archives });
});

// Archive the standings, close the season, start a new one at 1000 ELO.
api.post('/season/reset', requireAdmin, async (c) => {
  const db = c.env.DB;
  const nextName = String((await body(c)).name || '').trim();
  const current = await currentSeason(db);
  if (!current) return fail(c, 'No active season found.');

  const players = await all(db.prepare('SELECT * FROM players'));
  const count = (await db.prepare('SELECT COUNT(*) AS n FROM seasons').first()).n;
  const stamp = now();
  const newSeason = { id: uid(), name: nextName || `Season ${count + 1}`, started_at: stamp, ended_at: null };

  await db.batch([
    ...players.map((p) =>
      db
        .prepare('INSERT INTO season_archives (id, season_id, player_id, player_name, elo, wins, draws, losses) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(uid(), current.id, p.id, p.name, p.elo, p.wins, p.draws, p.losses)
    ),
    db.prepare('UPDATE seasons SET ended_at = ? WHERE ended_at IS NULL').bind(stamp),
    db.prepare('INSERT INTO seasons (id, name, started_at) VALUES (?, ?, ?)').bind(newSeason.id, newSeason.name, stamp),
    db.prepare('UPDATE players SET elo = ?, wins = 0, draws = 0, losses = 0').bind(START_ELO),
    db.prepare('DELETE FROM pending_matches'),
  ]);
  return c.json({ success: true, newSeason });
});

// Wipe everything and start again from Season 1.
api.post('/reset', requireAdmin, async (c) => {
  const db = c.env.DB;
  const tables = ['pending_matches', 'trophies', 'season_archives', 'matches', 'tournament_reports', 'tournament_matches', 'tournament_players', 'tournaments', 'players', 'seasons'];
  await db.batch([
    ...tables.map((t) => db.prepare(`DELETE FROM ${t}`)),
    db.prepare("INSERT INTO seasons (id, name, started_at) VALUES (?, 'Season 1', ?)").bind(uid(), now()),
  ]);
  return c.json({ success: true });
});

// ── Stats ───────────────────────────────────────────────────────────────────
const MIN_GAMES = 1;

function summarize(matches, names) {
  const gain = {}, games = {}, wins = {};
  matches.forEach((m) => {
    gain[m.player_a] = (gain[m.player_a] || 0) + m.delta_a;
    gain[m.player_b] = (gain[m.player_b] || 0) + m.delta_b;
    games[m.player_a] = (games[m.player_a] || 0) + 1;
    games[m.player_b] = (games[m.player_b] || 0) + 1;
    if (m.score_a > m.score_b) wins[m.player_a] = (wins[m.player_a] || 0) + 1;
    else if (m.score_b > m.score_a) wins[m.player_b] = (wins[m.player_b] || 0) + 1;
  });
  const eloLeaders = Object.entries(gain)
    .map(([playerId, eloGain]) => ({ playerId, name: names[playerId] || 'Unknown', eloGain, games: games[playerId] || 0 }))
    .sort((a, b) => b.eloGain - a.eloGain)
    .slice(0, 5);
  const winRateLeaders = Object.entries(games)
    .filter(([, g]) => g >= MIN_GAMES)
    .map(([playerId, g]) => ({ playerId, name: names[playerId] || 'Unknown', games: g, wins: wins[playerId] || 0, winRate: (wins[playerId] || 0) / g }))
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    .slice(0, 5);
  return { eloLeaders, winRateLeaders, minGames: MIN_GAMES };
}

api.get('/stats', async (c) => {
  const db = c.env.DB;
  const names = {};
  (await all(db.prepare('SELECT id, name FROM players'))).forEach((p) => (names[p.id] = p.name));

  const week = new Date();
  week.setUTCHours(0, 0, 0, 0);
  week.setUTCDate(week.getUTCDate() - 6);
  const month = new Date();
  month.setUTCHours(0, 0, 0, 0);
  month.setUTCDate(1);

  const since = (d) => all(db.prepare('SELECT * FROM matches WHERE approved_at >= ?').bind(d.toISOString()));
  const season = await currentSeason(db);
  const seasonMatches = season ? await all(db.prepare('SELECT * FROM matches WHERE season_id = ?').bind(season.id)) : [];

  const goals = {};
  seasonMatches.forEach((m) => {
    goals[m.player_a] = (goals[m.player_a] || 0) + m.score_a;
    goals[m.player_b] = (goals[m.player_b] || 0) + m.score_b;
  });
  const topScorers = Object.entries(goals)
    .map(([playerId, total]) => ({ playerId, name: names[playerId] || 'Unknown', goals: total }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  return c.json({ weekly: summarize(await since(week), names), monthly: summarize(await since(month), names), topScorers });
});

// ── Trophies ────────────────────────────────────────────────────────────────
api.get('/trophies', async (c) => c.json(await all(c.env.DB.prepare('SELECT * FROM trophies ORDER BY created_at DESC'))));

api.post('/trophies', requireAdmin, async (c) => {
  const { playerId, competitionName, trophyType, count } = await body(c);
  if (!playerId || !competitionName || !trophyType) return fail(c, 'Player, competition name, and trophy type are required.');
  const id = uid();
  await c.env.DB.prepare('INSERT INTO trophies (id, player_id, competition_name, trophy_type, count, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, playerId, String(competitionName).trim(), String(trophyType), Number.parseInt(count, 10) || 1, now())
    .run();
  return c.json(await c.env.DB.prepare('SELECT * FROM trophies WHERE id = ?').bind(id).first());
});

api.delete('/trophies/:id', requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM trophies WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

// ── Tournaments ─────────────────────────────────────────────────────────────
const FORMATS = ['knockout', 'group_knockout', 'round_robin'];
const tournamentOut = (t) => t && { ...t, affects_elo: !!t.affects_elo };

api.get('/tournaments', async (c) =>
  c.json((await all(c.env.DB.prepare('SELECT * FROM tournaments ORDER BY created_at DESC'))).map(tournamentOut))
);

api.post('/tournaments', requireAdmin, async (c) => {
  const { name, format, affectsElo, groupsCount, groupSize } = await body(c);
  if (!name || !String(name).trim() || !format) return fail(c, 'Name and format are required.');
  if (!FORMATS.includes(format)) return fail(c, 'Invalid format.');
  const groups = Number.parseInt(groupsCount, 10) || null;
  const size = Number.parseInt(groupSize, 10) || null;
  if (format === 'group_knockout' && (!groups || !size)) return fail(c, 'Groups count and group size required for group knockout.');
  const id = uid();
  await c.env.DB.prepare('INSERT INTO tournaments (id, name, format, affects_elo, groups_count, group_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, String(name).trim(), format, affectsElo ? 1 : 0, format === 'group_knockout' ? groups : null, format === 'group_knockout' ? size : null, now())
    .run();
  return c.json(tournamentOut(await c.env.DB.prepare('SELECT * FROM tournaments WHERE id = ?').bind(id).first()));
});

api.get('/tournaments/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const tournament = await db.prepare('SELECT * FROM tournaments WHERE id = ?').bind(id).first();
  if (!tournament) return fail(c, 'Tournament not found.', 404);
  const players = await all(
    db
      .prepare(
        `SELECT * FROM tournament_players WHERE tournament_id = ?
         ORDER BY group_points DESC, (group_goals_for - group_goals_against) DESC, group_goals_for DESC`
      )
      .bind(id)
  );
  const matches = await all(db.prepare('SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY match_order').bind(id));
  const reports = await all(db.prepare('SELECT * FROM tournament_reports WHERE tournament_id = ? ORDER BY created_at').bind(id));
  return c.json({
    tournament: tournamentOut(tournament),
    players: players.map((p) => ({ ...p, eliminated: !!p.eliminated })),
    matches,
    reports,
  });
});

api.delete('/tournaments/:id', requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  await db.batch([
    db.prepare('DELETE FROM tournament_reports WHERE tournament_id = ?').bind(id),
    db.prepare('DELETE FROM tournament_matches WHERE tournament_id = ?').bind(id),
    db.prepare('DELETE FROM tournament_players WHERE tournament_id = ?').bind(id),
    db.prepare('DELETE FROM tournaments WHERE id = ?').bind(id),
  ]);
  return c.json({ success: true });
});

api.post('/tournaments/:id/players', requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { playerIds } = await body(c);
  if (!Array.isArray(playerIds) || playerIds.length === 0) return fail(c, 'Provide an array of playerIds.');
  const tournament = await db.prepare('SELECT status FROM tournaments WHERE id = ?').bind(id).first();
  if (!tournament) return fail(c, 'Tournament not found.', 404);
  if (tournament.status !== 'draft') return fail(c, 'Cannot modify players after tournament has started.');
  const unique = [...new Set(playerIds.map(String))];
  await db.batch([
    db.prepare('DELETE FROM tournament_players WHERE tournament_id = ?').bind(id),
    ...unique.map((pid) => db.prepare('INSERT INTO tournament_players (id, tournament_id, player_id) VALUES (?, ?, ?)').bind(uid(), id, pid)),
  ]);
  return c.json(await all(db.prepare('SELECT * FROM tournament_players WHERE tournament_id = ?').bind(id)));
});

api.post('/tournaments/:id/start', requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const tournament = await db.prepare('SELECT * FROM tournaments WHERE id = ?').bind(id).first();
  if (!tournament) return fail(c, 'Tournament not found.', 404);
  if (tournament.status !== 'draft') return fail(c, 'Tournament has already started.');
  const playerIds = (await all(db.prepare('SELECT player_id FROM tournament_players WHERE tournament_id = ?').bind(id))).map((r) => r.player_id);
  if (playerIds.length < 2) return fail(c, 'Need at least 2 players to start.');
  try {
    await startTournament(db, tournament, playerIds);
  } catch (err) {
    return fail(c, err.message || 'Failed to start tournament.');
  }
  return c.json({ success: true });
});

api.post('/tournaments/:id/matches/:matchId', requireAdmin, async (c) => {
  const { scoreA, scoreB } = await body(c);
  const out = await enterResult(c.env.DB, c.req.param('id'), c.req.param('matchId'), scoreA, scoreB);
  if (out.error) return fail(c, out.error, out.status);
  await c.env.DB.prepare("DELETE FROM tournament_reports WHERE match_id = ? AND status = 'pending'").bind(c.req.param('matchId')).run();
  return c.json({ success: true });
});

// Open to anyone: a player reports the score of their tournament match.
// It only counts once an admin approves it.
api.post('/tournaments/:id/matches/:matchId/report', async (c) => {
  const db = c.env.DB;
  const tournamentId = c.req.param('id');
  const matchId = c.req.param('matchId');
  const { scoreA, scoreB, submittedBy, screenshotUrl } = await body(c);
  const sA = Number.parseInt(scoreA, 10);
  const sB = Number.parseInt(scoreB, 10);
  if (!Number.isInteger(sA) || !Number.isInteger(sB) || sA < 0 || sB < 0 || sA > 99 || sB > 99) {
    return fail(c, 'Enter a final score for both sides.');
  }
  const match = await db.prepare('SELECT * FROM tournament_matches WHERE id = ? AND tournament_id = ?').bind(matchId, tournamentId).first();
  if (!match) return fail(c, 'Match not found.', 404);
  if (match.status === 'played') return fail(c, 'This match already has a result.');
  if (!match.player_a || !match.player_b) return fail(c, 'This match is not ready to be played yet.');
  if (match.stage === 'knockout' && sA === sB) return fail(c, 'Knockout matches cannot end in a draw.');
  if (screenshotUrl && !isImagePath(screenshotUrl)) return fail(c, 'Upload the screenshot first.');

  const who = String(submittedBy || '').trim().slice(0, 40) || 'Unknown';
  const id = uid();
  await db.batch([
    // A newer report for the same match replaces the one still waiting.
    db.prepare("DELETE FROM tournament_reports WHERE match_id = ? AND status = 'pending'").bind(matchId),
    db
      .prepare('INSERT INTO tournament_reports (id, tournament_id, match_id, score_a, score_b, submitted_by, screenshot_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, tournamentId, matchId, sA, sB, who, screenshotUrl || null, now()),
  ]);
  return c.json(await db.prepare('SELECT * FROM tournament_reports WHERE id = ?').bind(id).first());
});

api.post('/tournaments/:id/reports/:reportId', requireAdmin, async (c) => {
  const db = c.env.DB;
  const report = await db
    .prepare("SELECT * FROM tournament_reports WHERE id = ? AND tournament_id = ? AND status = 'pending'")
    .bind(c.req.param('reportId'), c.req.param('id'))
    .first();
  if (!report) return fail(c, 'That report no longer exists.', 404);
  const out = await enterResult(db, report.tournament_id, report.match_id, report.score_a, report.score_b);
  if (out.error) return fail(c, out.error, out.status);
  await db.prepare("UPDATE tournament_reports SET status = 'approved' WHERE id = ?").bind(report.id).run();
  return c.json({ success: true });
});

api.delete('/tournaments/:id/reports/:reportId', requireAdmin, async (c) => {
  await c.env.DB.prepare("DELETE FROM tournament_reports WHERE id = ? AND tournament_id = ? AND status = 'pending'")
    .bind(c.req.param('reportId'), c.req.param('id'))
    .run();
  return c.json({ success: true });
});

// ── Pictures ────────────────────────────────────────────────────────────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_IMAGES = 3000;

api.post('/upload', async (c) => {
  const type = (c.req.header('Content-Type') || '').split(';')[0].trim();
  if (!IMAGE_TYPES.includes(type)) return fail(c, 'Only JPEG, PNG or WebP pictures are accepted.');
  const data = await c.req.arrayBuffer();
  if (data.byteLength === 0) return fail(c, 'The picture was empty.');
  if (data.byteLength > MAX_IMAGE_BYTES) return fail(c, 'That picture is too large.', 413);
  const db = c.env.DB;
  if ((await db.prepare('SELECT COUNT(*) AS n FROM images').first()).n >= MAX_IMAGES) return fail(c, 'Picture storage is full.', 507);
  const id = uid().replace(/-/g, '');
  await db.prepare('INSERT INTO images (id, content_type, data, created_at) VALUES (?, ?, ?, ?)').bind(id, type, data, now()).run();
  return c.json({ url: `/api/img/${id}` });
});

api.get('/img/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT content_type, data FROM images WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return fail(c, 'Not found.', 404);
  return new Response(new Uint8Array(row.data), {
    headers: {
      'Content-Type': row.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

api.all('*', (c) => fail(c, 'Not found.', 404));

app.route('/api', api);
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
