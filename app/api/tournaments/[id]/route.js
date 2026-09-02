import { supabase } from '../../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req, { params }) {
  const { id } = params;

  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (tError) return Response.json({ error: tError.message }, { status: 404 });

  const { data: players } = await supabase
    .from('tournament_players')
    .select('*')
    .eq('tournament_id', id)
    .order('group_points', { ascending: false });

  const { data: matches } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', id)
    .order('match_order', { ascending: true });

  return Response.json({ tournament, players: players || [], matches: matches || [] });
}

export async function DELETE(req, { params }) {
  const { id } = params;
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) return Response.json({ error: 'Admin login required.' }, { status: 401 });

  const { error } = await serverSupabase.from('tournaments').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
