import { supabase } from '../../../../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../../../../lib/supabase-server';
import { eloDelta } from '../../../../../../lib/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function roundName(playersLeft) {
  if (playersLeft <= 2)  return 'f';
  if (playersLeft <= 4)  return 'sf';
  if (playersLeft <= 8)  return 'qf';
  if (playersLeft <= 16) return 'r16';
  if (playersLeft <= 32) return 'r32';
  return `r${playersLeft}`;
}

export async function POST(req, { params }) {
  const { id: tournamentId, matchId } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) return Response.json({ error: 'Admin login required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { scoreA, scoreB } = body;

  if (scoreA === undefined || scoreB === undefined || isNaN(scoreA) || isNaN(scoreB)) {
    return Response.json({ error: 'Enter scores for both players.' }, { status: 400 });
  }
  if (parseInt(scoreA, 10) === parseInt(scoreB, 10)) {
    // Draws allowed in group stage only
  }

  const { data: match } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('id', matchId)
    .eq('tournament_id', tournamentId)
    .single();

  if (!match) return Response.json({ error: 'Match not found.' }, { status: 404 });
  if (match.status === 'played') return Response.json({ error: 'Match already played.' }, { status: 400 });
  if (!match.player_a || !match.player_b) {
    return Response.json({ error: 'Both players must be set before entering a result.' }, { status: 400 });
  }

  const sA = parseInt(scoreA, 10);
  const sB = parseInt(scoreB, 10);
  const winnerId = sA > sB ? match.player_a : sA < sB ? match.player_b : null;

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  // ── Update match ──────────────────────────────────────────────
  const { error: matchError } = await serverSupabase
    .from('tournament_matches')
    .update({ score_a: sA, score_b: sB, winner_id: winnerId, status: 'played', played_at: new Date().toISOString() })
    .eq('id', matchId);
  if (matchError) return Response.json({ error: matchError.message }, { status: 500 });

  // ── ELO update (if tournament affects ELO) ────────────────────
  if (tournament.affects_elo && winnerId !== null) {
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .in('id', [match.player_a, match.player_b]);

    const pA = players.find((p) => p.id === match.player_a);
    const pB = players.find((p) => p.id === match.player_b);
    const result = sA > sB ? 1 : sA < sB ? 0 : 0.5;
    const dA = eloDelta(pA.elo, pB.elo, result);
    const dB = eloDelta(pB.elo, pA.elo, 1 - result);

    await serverSupabase.from('players').update({
      elo: pA.elo + dA,
      wins: pA.wins + (sA > sB ? 1 : 0),
      draws: pA.draws + (sA === sB ? 1 : 0),
      losses: pA.losses + (sA < sB ? 1 : 0),
    }).eq('id', pA.id);

    await serverSupabase.from('players').update({
      elo: pB.elo + dB,
      wins: pB.wins + (sB > sA ? 1 : 0),
      draws: pB.draws + (sA === sB ? 1 : 0),
      losses: pB.losses + (sB < sA ? 1 : 0),
    }).eq('id', pB.id);
  }

  // ── Group stage stats update ──────────────────────────────────
  if (match.stage === 'group') {
    const goalsA = sA, goalsB = sB;
    const ptsA = sA > sB ? 3 : sA === sB ? 1 : 0;
    const ptsB = sB > sA ? 3 : sA === sB ? 1 : 0;

    const { data: tpA } = await supabase.from('tournament_players')
      .select('*').eq('tournament_id', tournamentId).eq('player_id', match.player_a).single();
    const { data: tpB } = await supabase.from('tournament_players')
      .select('*').eq('tournament_id', tournamentId).eq('player_id', match.player_b).single();

    await serverSupabase.from('tournament_players').update({
      group_wins: (tpA.group_wins || 0) + (sA > sB ? 1 : 0),
      group_draws: (tpA.group_draws || 0) + (sA === sB ? 1 : 0),
      group_losses: (tpA.group_losses || 0) + (sA < sB ? 1 : 0),
      group_goals_for: (tpA.group_goals_for || 0) + goalsA,
      group_goals_against: (tpA.group_goals_against || 0) + goalsB,
      group_points: (tpA.group_points || 0) + ptsA,
    }).eq('id', tpA.id);

    await serverSupabase.from('tournament_players').update({
      group_wins: (tpB.group_wins || 0) + (sB > sA ? 1 : 0),
      group_draws: (tpB.group_draws || 0) + (sA === sB ? 1 : 0),
      group_losses: (tpB.group_losses || 0) + (sB < sA ? 1 : 0),
      group_goals_for: (tpB.group_goals_for || 0) + goalsB,
      group_goals_against: (tpB.group_goals_against || 0) + goalsA,
      group_points: (tpB.group_points || 0) + ptsB,
    }).eq('id', tpB.id);
  }

  // ── Knockout bracket advancement ──────────────────────────────
  if (match.stage === 'knockout' && winnerId && match.next_match_id) {
    const slot = match.next_match_slot === 'a' ? { player_a: winnerId } : { player_b: winnerId };
    await serverSupabase.from('tournament_matches').update(slot).eq('id', match.next_match_id);

    // Mark loser as eliminated
    const loserId = winnerId === match.player_a ? match.player_b : match.player_a;
    await serverSupabase.from('tournament_players')
      .update({ eliminated: true })
      .eq('tournament_id', tournamentId)
      .eq('player_id', loserId);
  }

  // ── Check if tournament is complete ──────────────────────────
  const { data: remaining } = await supabase
    .from('tournament_matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'pending');

  if (!remaining || remaining.length === 0) {
    // Find the champion (winner of the final, or top of round robin)
    let championId = null;

    if (tournament.format === 'round_robin') {
      const { data: standings } = await supabase
        .from('tournament_players')
        .select('player_id, group_points, group_goals_for, group_goals_against')
        .eq('tournament_id', tournamentId)
        .order('group_points', { ascending: false })
        .order('group_goals_for', { ascending: false })
        .limit(1);
      championId = standings?.[0]?.player_id || null;
    } else {
      // Find the final match winner
      const { data: finalMatch } = await supabase
        .from('tournament_matches')
        .select('winner_id')
        .eq('tournament_id', tournamentId)
        .eq('round', 'f')
        .single();
      championId = finalMatch?.winner_id || null;
    }

    await serverSupabase.from('tournaments').update({
      status: 'completed',
      champion_id: championId,
      completed_at: new Date().toISOString(),
    }).eq('id', tournamentId);

    if (championId) {
      await serverSupabase.from('tournament_players')
        .update({ knockout_round: 'champion', eliminated: false })
        .eq('tournament_id', tournamentId)
        .eq('player_id', championId);
    }
  }

  return Response.json({ success: true });
}
