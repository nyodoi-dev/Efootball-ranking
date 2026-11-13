// Tournament engine: fixture generation, result entry, bracket advancement.
import { eloDelta, uid, now, parseScore } from './util.js';

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextPow2(n) {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

export function roundName(playersLeft) {
  if (playersLeft <= 2) return 'f';
  if (playersLeft <= 4) return 'sf';
  if (playersLeft <= 8) return 'qf';
  if (playersLeft <= 16) return 'r16';
  if (playersLeft <= 32) return 'r32';
  return `r${playersLeft}`;
}

// Turn an ordered list of entrants into first-round pairings for a bracket
// whose size is the next power of two. Entrants at the front of `byeOrder`
// get the byes. A bye is always [player, null] — never an empty match — and
// byes are spread through the bracket rather than bunched together.
export function firstRoundPairs(entrants, byeOrder = entrants) {
  const size = nextPow2(entrants.length);
  const byeCount = size - entrants.length;
  // Take byes from the preferred order first, then from the remaining entrants,
  // so there are always exactly as many byes as the bracket needs.
  const order = [...new Set([...byeOrder, ...entrants])];
  const byePlayers = order.slice(0, byeCount);
  const byeSet = new Set(byePlayers);
  const rest = entrants.filter((p) => !byeSet.has(p));

  const byePairs = byePlayers.map((p) => [p, null]);
  const realPairs = [];
  for (let i = 0; i < rest.length; i += 2) realPairs.push([rest[i], rest[i + 1]]);

  const pairs = [];
  while (byePairs.length || realPairs.length) {
    if (byePairs.length) pairs.push(byePairs.shift());
    if (realPairs.length) pairs.push(realPairs.shift());
  }
  if (pairs.length * 2 !== size || pairs.some(([a]) => !a)) {
    throw new Error('Could not build a valid bracket for this number of players.');
  }
  return pairs;
}

// Build every knockout match for the bracket and return the INSERT statements.
export function bracketStatements(db, tournamentId, pairs) {
  const createdAt = now();
  const rounds = []; // rounds[0] = first round
  for (let count = pairs.length; count >= 1; count /= 2) {
    const label = roundName(count * 2);
    rounds.push(
      Array.from({ length: count }, (_, i) => ({
        id: count === 1 ? `final-${tournamentId}` : uid(),
        tournament_id: tournamentId,
        stage: 'knockout',
        round: label,
        match_order: i,
        player_a: null,
        player_b: null,
        winner_id: null,
        status: 'pending',
        next_match_id: null,
        next_match_slot: null,
      }))
    );
  }

  rounds.forEach((matches, ri) => {
    const next = rounds[ri + 1];
    if (!next) return;
    matches.forEach((m, mi) => {
      m.next_match_id = next[Math.floor(mi / 2)].id;
      m.next_match_slot = mi % 2 === 0 ? 'a' : 'b';
    });
  });

  rounds[0].forEach((m, i) => {
    const [a, b] = pairs[i];
    m.player_a = a;
    m.player_b = b;
    if (a && !b) {
      // Bye: the player goes straight through.
      m.status = 'played';
      m.winner_id = a;
      const next = rounds[1]?.find((n) => n.id === m.next_match_id);
      if (next) next[m.next_match_slot === 'a' ? 'player_a' : 'player_b'] = a;
    }
  });

  return rounds.flat().map((m) =>
    db
      .prepare(
        `INSERT INTO tournament_matches
           (id, tournament_id, stage, round, match_order, player_a, player_b, winner_id, status, next_match_id, next_match_slot, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(m.id, m.tournament_id, m.stage, m.round, m.match_order, m.player_a, m.player_b, m.winner_id, m.status, m.next_match_id, m.next_match_slot, createdAt)
  );
}

function groupFixtureStatements(db, tournamentId, label, players, startOrder) {
  const createdAt = now();
  const stmts = [];
  let order = startOrder;
  for (let a = 0; a < players.length; a++) {
    for (let b = a + 1; b < players.length; b++) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO tournament_matches (id, tournament_id, stage, round, match_order, player_a, player_b, status, created_at)
             VALUES (?, ?, 'group', ?, ?, ?, ?, 'pending', ?)`
          )
          .bind(uid(), tournamentId, label, order++, players[a], players[b], createdAt)
      );
    }
  }
  return stmts;
}

export async function startTournament(db, tournament) {
  const id = tournament.id;

  // Claim the draft first: only one request can start it, and once it is
  // active the roster can no longer change underneath us.
  const claim = await db.prepare("UPDATE tournaments SET status = 'active' WHERE id = ? AND status = 'draft'").bind(id).run();
  if (claim.meta.changes !== 1) throw new Error('Tournament has already started.');

  try {
    const { results } = await db.prepare('SELECT player_id FROM tournament_players WHERE tournament_id = ?').bind(id).all();
    const playerIds = results.map((r) => r.player_id);
    if (playerIds.length < 2) throw new Error('Need at least 2 players to start.');
    await db.batch(fixtureStatements(db, tournament, playerIds));
  } catch (err) {
    await db.prepare("UPDATE tournaments SET status = 'draft' WHERE id = ?").bind(id).run();
    throw err;
  }
}

function fixtureStatements(db, tournament, playerIds) {
  const id = tournament.id;
  const stmts = [];

  if (tournament.format === 'knockout') {
    const entrants = shuffle(playerIds);
    const pairs = firstRoundPairs(entrants);
    stmts.push(...bracketStatements(db, id, pairs));
    stmts.push(
      db.prepare('UPDATE tournament_players SET knockout_round = ? WHERE tournament_id = ?').bind(roundName(pairs.length * 2), id)
    );
  } else if (tournament.format === 'group_knockout') {
    const groups = tournament.groups_count || 1;
    if (playerIds.length < groups * 2) {
      throw new Error(`Need at least ${groups * 2} players for ${groups} group${groups > 1 ? 's' : ''}.`);
    }
    const shuffled = shuffle(playerIds);
    const byGroup = Array.from({ length: groups }, () => []);
    shuffled.forEach((pid, i) => byGroup[i % groups].push(pid));
    let order = 0;
    byGroup.forEach((members, gi) => {
      members.forEach((pid) =>
        stmts.push(
          db.prepare('UPDATE tournament_players SET group_number = ? WHERE tournament_id = ? AND player_id = ?').bind(gi + 1, id, pid)
        )
      );
      const fixtures = groupFixtureStatements(db, id, `Group ${gi + 1}`, members, order);
      order += fixtures.length;
      stmts.push(...fixtures);
    });
  } else {
    stmts.push(...groupFixtureStatements(db, id, 'Round Robin', shuffle(playerIds), 0));
  }

  return stmts;
}

const byStanding = (a, b) =>
  b.group_points - a.group_points ||
  (b.group_goals_for - b.group_goals_against) - (a.group_goals_for - a.group_goals_against) ||
  b.group_goals_for - a.group_goals_for;

// Group stage finished: top two of each group go into a knockout bracket.
// Winner of group N meets the runner-up of the next group.
async function generateKnockoutFromGroups(db, tournamentId) {
  const { results: rows } = await db
    .prepare('SELECT * FROM tournament_players WHERE tournament_id = ?')
    .bind(tournamentId)
    .all();

  const groups = {};
  rows.forEach((r) => (groups[r.group_number] ||= []).push(r));
  const numbers = Object.keys(groups).map(Number).sort((a, b) => a - b);
  numbers.forEach((n) => groups[n].sort(byStanding));

  const winners = numbers.map((n) => groups[n][0]);
  const runners = numbers.map((n) => groups[n][1]).filter(Boolean);
  const qualified = new Set([...winners, ...runners].map((r) => r.player_id));

  const entrants = [];
  numbers.forEach((n, i) => {
    entrants.push(groups[n][0].player_id);
    const opp = groups[numbers[(i + 1) % numbers.length]][1];
    if (opp) entrants.push(opp.player_id);
  });
  const byeOrder = [...[...winners].sort(byStanding), ...[...runners].sort(byStanding)].map((r) => r.player_id);

  const pairs = firstRoundPairs(entrants, byeOrder);
  const stmts = bracketStatements(db, tournamentId, pairs);
  const firstRound = roundName(pairs.length * 2);
  rows.forEach((r) => {
    stmts.push(
      qualified.has(r.player_id)
        ? db.prepare('UPDATE tournament_players SET knockout_round = ?, eliminated = 0 WHERE id = ?').bind(firstRound, r.id)
        : db.prepare('UPDATE tournament_players SET eliminated = 1 WHERE id = ?').bind(r.id)
    );
  });
  try {
    await db.batch(stmts);
  } catch (err) {
    // Another request created the bracket first; that one stands.
    if (!/UNIQUE|constraint/i.test(err.message || '')) throw err;
  }
}

export async function enterResult(db, tournamentId, matchId, scoreA, scoreB) {
  const sA = parseScore(scoreA);
  const sB = parseScore(scoreB);
  if (sA === null || sB === null) {
    return { status: 400, error: 'Enter a whole-number score from 0 to 99 for both players.' };
  }

  const match = await db
    .prepare('SELECT * FROM tournament_matches WHERE id = ? AND tournament_id = ?')
    .bind(matchId, tournamentId)
    .first();
  if (!match) return { status: 404, error: 'Match not found.' };
  if (match.status === 'played') return { status: 400, error: 'Match already played.' };
  if (!match.player_a || !match.player_b) {
    return { status: 400, error: 'Both players must be set before entering a result.' };
  }
  if (match.stage === 'knockout' && sA === sB) {
    return { status: 400, error: 'Knockout matches cannot end in a draw.' };
  }

  const tournament = await db.prepare('SELECT * FROM tournaments WHERE id = ?').bind(tournamentId).first();
  if (!tournament) return { status: 404, error: 'Tournament not found.' };
  const winnerId = sA > sB ? match.player_a : sA < sB ? match.player_b : null;
  const loserId = winnerId ? (winnerId === match.player_a ? match.player_b : match.player_a) : null;

  // Claim the match first. Only one request can move it from pending to
  // played, so a double tap or two admins cannot count the result twice.
  const claim = await db
    .prepare("UPDATE tournament_matches SET score_a = ?, score_b = ?, winner_id = ?, status = 'played', played_at = ? WHERE id = ? AND status = 'pending'")
    .bind(sA, sB, winnerId, now(), matchId)
    .run();
  if (claim.meta.changes !== 1) return { status: 400, error: 'Match already played.' };
  const stmts = [];

  if (tournament.affects_elo) {
    const pA = await db.prepare('SELECT * FROM players WHERE id = ?').bind(match.player_a).first();
    const pB = await db.prepare('SELECT * FROM players WHERE id = ?').bind(match.player_b).first();
    if (pA && pB) {
      const result = sA > sB ? 1 : sA < sB ? 0 : 0.5;
      const dA = eloDelta(pA.elo, pB.elo, result);
      const dB = eloDelta(pB.elo, pA.elo, 1 - result);
      const upd = 'UPDATE players SET elo = elo + ?, wins = wins + ?, draws = draws + ?, losses = losses + ? WHERE id = ?';
      stmts.push(db.prepare(upd).bind(dA, sA > sB ? 1 : 0, sA === sB ? 1 : 0, sA < sB ? 1 : 0, pA.id));
      stmts.push(db.prepare(upd).bind(dB, sB > sA ? 1 : 0, sA === sB ? 1 : 0, sB < sA ? 1 : 0, pB.id));
    }
  }

  if (match.stage === 'group') {
    const upd = `UPDATE tournament_players SET
        group_wins = group_wins + ?, group_draws = group_draws + ?, group_losses = group_losses + ?,
        group_goals_for = group_goals_for + ?, group_goals_against = group_goals_against + ?, group_points = group_points + ?
      WHERE tournament_id = ? AND player_id = ?`;
    stmts.push(
      db.prepare(upd).bind(sA > sB ? 1 : 0, sA === sB ? 1 : 0, sA < sB ? 1 : 0, sA, sB, sA > sB ? 3 : sA === sB ? 1 : 0, tournamentId, match.player_a)
    );
    stmts.push(
      db.prepare(upd).bind(sB > sA ? 1 : 0, sA === sB ? 1 : 0, sB < sA ? 1 : 0, sB, sA, sB > sA ? 3 : sA === sB ? 1 : 0, tournamentId, match.player_b)
    );
  }

  if (match.stage === 'knockout') {
    stmts.push(
      db.prepare('UPDATE tournament_players SET eliminated = 1 WHERE tournament_id = ? AND player_id = ?').bind(tournamentId, loserId)
    );
    if (match.next_match_id) {
      const col = match.next_match_slot === 'a' ? 'player_a' : 'player_b';
      stmts.push(db.prepare(`UPDATE tournament_matches SET ${col} = ? WHERE id = ?`).bind(winnerId, match.next_match_id));
      const next = await db.prepare('SELECT round FROM tournament_matches WHERE id = ?').bind(match.next_match_id).first();
      stmts.push(
        db
          .prepare('UPDATE tournament_players SET knockout_round = ? WHERE tournament_id = ? AND player_id = ?')
          .bind(next?.round || null, tournamentId, winnerId)
      );
    }
  }

  try {
    if (stmts.length) await db.batch(stmts);
  } catch (err) {
    // Put the match back so the result can be entered again.
    await db
      .prepare("UPDATE tournament_matches SET score_a = NULL, score_b = NULL, winner_id = NULL, status = 'pending', played_at = NULL WHERE id = ?")
      .bind(matchId)
      .run();
    throw err;
  }
  // If this step fails, loading the tournament runs it again (see advanceStage).
  await advanceStage(db, tournament);
  return { status: 200 };
}

// After a result: start the knockout once the groups are done, or close the
// tournament once nothing is left to play. Safe to run any number of times.
export async function advanceStage(db, tournament) {
  const id = tournament.id;
  if (tournament.status !== 'active') return;
  const pending = await db
    .prepare("SELECT COUNT(*) AS n FROM tournament_matches WHERE tournament_id = ? AND status = 'pending'")
    .bind(id)
    .first();
  if (pending.n > 0) return;

  if (tournament.format === 'group_knockout') {
    const ko = await db
      .prepare("SELECT COUNT(*) AS n FROM tournament_matches WHERE tournament_id = ? AND stage = 'knockout'")
      .bind(id)
      .first();
    if (ko.n === 0) {
      await generateKnockoutFromGroups(db, id);
      return;
    }
  }

  let championId = null;
  if (tournament.format === 'round_robin') {
    const { results } = await db.prepare('SELECT * FROM tournament_players WHERE tournament_id = ?').bind(id).all();
    championId = results.sort(byStanding)[0]?.player_id || null;
  } else {
    const final = await db
      .prepare("SELECT winner_id FROM tournament_matches WHERE tournament_id = ? AND stage = 'knockout' AND round = 'f'")
      .bind(id)
      .first();
    championId = final?.winner_id || null;
  }

  const stmts = [
    db.prepare("UPDATE tournaments SET status = 'completed', champion_id = ?, completed_at = ? WHERE id = ?").bind(championId, now(), id),
  ];
  if (championId) {
    stmts.push(
      db
        .prepare("UPDATE tournament_players SET knockout_round = 'champion', eliminated = 0 WHERE tournament_id = ? AND player_id = ?")
        .bind(id, championId)
    );
  }
  await db.batch(stmts);
}
