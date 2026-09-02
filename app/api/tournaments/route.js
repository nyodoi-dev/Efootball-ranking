import { supabase } from '../../../lib/supabase';
import { createClient as createServerSupabase, getUser } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req) {
  const serverSupabase = createServerSupabase();
  const user = await getUser(serverSupabase);
  if (!user) return Response.json({ error: 'Admin login required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, format, affectsElo, groupsCount, groupSize } = body;

  if (!name || !format) {
    return Response.json({ error: 'Name and format are required.' }, { status: 400 });
  }
  if (!['knockout', 'group_knockout', 'round_robin'].includes(format)) {
    return Response.json({ error: 'Invalid format.' }, { status: 400 });
  }
  if (format === 'group_knockout' && (!groupsCount || !groupSize)) {
    return Response.json({ error: 'Groups count and group size required for group knockout.' }, { status: 400 });
  }

  const { data, error } = await serverSupabase
    .from('tournaments')
    .insert({
      name: name.trim(),
      format,
      affects_elo: !!affectsElo,
      groups_count: groupsCount || null,
      group_size: groupSize || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
