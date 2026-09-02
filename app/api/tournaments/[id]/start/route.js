import { supabase } from '../../../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Next power of 2 >= n
function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function roundName(playersLeft) {
  if (playersLeft <= 2)  return 'f';
  if (playersLeft <= 4)  return 'sf';
  if (playersLeft <= 8)  return 'qf';
  if (playersLeft <= 16) return 'r16';
  if (playersLeft <= 32) return 'r32';
  return `r${playersLeft}`;
}

async function generateKnockout(serverSupabase, tournamentId, playerIds) {
  const shuffled = shuffle(playerIds);
  const bracketSize = nextPow2(shuffled.length);
  const byes = bracketSize - shuffled.length;

  // Seed with byes (null = bye)
  const seeded = [...shuffled];
  for (let i = 0; i < byes; i++) seeded.push(null);

  // Build all rounds top-down, tracking which match feeds into which
  const rounds = [];
  let size = bracketSize;
  while (size >= 2) {
    rounds.push(size);
    size = size / 2;
  }

  // Insert matches round by round (last round first so we can link next_match_id)
  const roundMatches = {}; // round label -> inserted match rows

  for (let ri = rounds.length - 1; ri >= 0; ri--) {
    const matchCount = rounds[ri] / 2;
    const rLabel = roundName(rounds[ri]);
    const nextRound = ri < rounds.length - 1 ? roundName(rounds[ri + 1]) : null;
    const nextRoundMatches = nextRound ? roundMatches[nextRound] : null;

    const rows = [];
    for (let mi = 0; mi < matchCount; mi++) {
      const nextMatchIndex = Math.floor(mi / 2);
      const nextMatchId = nextRoundMatches ? nextRoundMatches[nextMatchIndex]?.id : null;
      const nextSlot = mi % 2 === 0 ? 'a' : 'b';

      // First round: assign actual players/byes
      let playerA = null;
      let playerB = null;
      if (ri === 0) {
        playerA = seeded[mi * 2] || null;
        playerB = seeded[mi * 2 + 1] || null;
      }

      rows.push({
        tournament_id: tournamentId,
        stage: 'knockout',
        round: rLabel,
        match_order: mi,
        player_a: playerA,
        player_b: playerB,
        next_match_id: nextMatchId,
        next_match_slot: nextMatchId ? nextSlot : null,
        // Auto-advance if one side is a bye
        status: (ri === 0 && (playerA === null || playerB === null)) ? 'played' : 'pending',
        winner_id: ri === 0 && playerA === null ? playerB : ri === 0 && playerB === null ? playerA : null,
      });
    }

    const { data: inserted, error } = await serverSupabase
      .from('tournament_matches')
      .insert(rows)
      .select();
    if (error) throw error;
    roundMatches[rLabel] = inserted;

    // Advance auto-win byes into next round
    if (ri === 0) {
      for (const m of inserted) {
        if (m.winner_id && m.next_match_id) {
          const slot = m.next_match_slot === 'a' ? { player_a: m.winner_id } : { player_b: m.winner_id };
          await serverSupabase.from('tournament_matches').update(slot).eq('id', m.next_match_id);
        }
      }
    }
  }

  // Set knockout_round on tournament_players
  for (const pid of playerIds) {
    await serverSupabase
      .from('tournament_players')
      .update({ knockout_round: roundName(bracketSize) })
      .eq('tournament_id', tournamentId)
      .eq('player_id', pid);
  }
}

async function generateGroups(serverSupabase, tournamentId, playerIds, groupsCount, groupSize) {
  const shuffled = shuffle(playerIds);

  // Assign players to groups
  const updates = [];
  for (let i = 0; i < shuffled.length; i++) {
    const groupNum = (i % groupsCount) + 1;
    updates.push(
      serverSupabase
        .from('tournament_players')
        .update({ group_number: groupNum })
        .eq('tournament_id', tournamentId)
        .eq('player_id', shuffled[i])
    );
  }
  await Promise.all(updates);

  // Generate round-robin fixtures within each group
  const byGroup = {};
  for (let g = 1; g <= groupsCount; g++) byGroup[g] = [];
  shuffled.forEach((pid, i) => { byGroup[(i % groupsCount) + 1].push(pid); });

  const matchRows = [];
  let order = 0;
  for (const [groupNum, gPlayers] of Object.entries(byGroup)) {
    for (let a = 0; a < gPlayers.length; a++) {
      for (let b = a + 1; b < gPlayers.length; b++) {
        matchRows.push({
          tournament_id: tournamentId,
          stage: 'group',
          round: `Group ${groupNum}`,
          match_order: order++,
          player_a: gPlayers[a],
          player_b: gPlayers[b],
        });
      }
    }
  }

  const { error } = await serverSupabase.from('tournament_matches').insert(matchRows);
  if (error) throw error;
}

async function generateRoundRobin(serverSupabase, tournamentId, playerIds) {
  const matchRows = [];
  let order = 0;
  for (let a = 0; a < playerIds.length; a++) {
    for (let b = a + 1; b < playerIds.length; b++) {
      matchRows.push({
        tournament_id: tournamentId,
        stage: 'group',
        round: 'Round Robin',
        match_order: order++,
        player_a: playerIds[a],
        player_b: playerIds[b],
      });
    }
  }
  const { error } = await serverSupabase.from('tournament_matches').insert(matchRows);
  if (error) throw error;
}

export async function POST(req, { params }) {
  const { id } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) return Response.json({ error: 'Admin login required.' }, { status: 401 });

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (!tournament) return Response.json({ error: 'Tournament not found.' }, { status: 404 });
  if (tournament.status !== 'draft') {
    return Response.json({ error: 'Tournament has already started.' }, { status: 400 });
  }

  const { data: tp } = await supabase
    .from('tournament_players')
    .select('player_id')
    .eq('tournament_id', id);

  const playerIds = (tp || []).map((r) => r.player_id);

  if (playerIds.length < 2) {
    return Response.json({ error: 'Need at least 2 players to start.' }, { status: 400 });
  }

  try {
    if (tournament.format === 'knockout') {
      await generateKnockout(serverSupabase, id, playerIds);
    } else if (tournament.format === 'group_knockout') {
      await generateGroups(serverSupabase, id, playerIds, tournament.groups_count, tournament.group_size);
    } else if (tournament.format === 'round_robin') {
      await generateRoundRobin(serverSupabase, id, playerIds);
    }

    const { error } = await serverSupabase
      .from('tournaments')
      .update({ status: 'active' })
      .eq('id', id);
    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to start tournament.' }, { status: 500 });
  }
}
