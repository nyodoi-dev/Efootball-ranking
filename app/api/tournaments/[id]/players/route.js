import { supabase } from '../../../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req, { params }) {
  const { id } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) return Response.json({ error: 'Admin login required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { playerIds } = body;

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return Response.json({ error: 'Provide an array of playerIds.' }, { status: 400 });
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', id)
    .single();

  if (!tournament) return Response.json({ error: 'Tournament not found.' }, { status: 404 });
  if (tournament.status !== 'draft') {
    return Response.json({ error: 'Cannot modify players after tournament has started.' }, { status: 400 });
  }

  await serverSupabase.from('tournament_players').delete().eq('tournament_id', id);

  const rows = playerIds.map((pid) => ({ tournament_id: id, player_id: pid }));
  const { data, error } = await serverSupabase
    .from('tournament_players')
    .insert(rows)
    .select();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
