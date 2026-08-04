import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOOTSTRAP_ADMIN_EMAIL = 'fsdowie@yahoo.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin check: bootstrap email OR profiles.is_admin (same rule as set-admin-role)
    const isBootstrapAdmin = user.email === BOOTSTRAP_ADMIN_EMAIL;
    if (!isBootstrapAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Pull every logged question's token usage. Aggregated in JS rather than
    // SQL group-by since volume here is small (a handful of questions/day
    // per user) and this mirrors the existing get-question-logs pattern.
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('questions_log')
      .select('user_id, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (logsError) {
      console.error('Error fetching logs:', logsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch usage logs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      console.error('Error fetching users:', usersError);
    }
    const userEmailMap: Record<string, string> = {};
    if (users) {
      users.forEach((u) => { userEmailMap[u.id] = u.email ?? 'Unknown'; });
    }

    const totalsByUser: Record<string, {
      user_id: string;
      user_email: string;
      questions: number;
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      total_tokens: number;
    }> = {};

    for (const log of logs ?? []) {
      const entry = totalsByUser[log.user_id] ?? {
        user_id: log.user_id,
        user_email: userEmailMap[log.user_id] ?? 'Unknown',
        questions: 0,
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        total_tokens: 0,
      };
      entry.questions += 1;
      entry.input_tokens += log.input_tokens ?? 0;
      entry.output_tokens += log.output_tokens ?? 0;
      entry.cache_creation_input_tokens += log.cache_creation_input_tokens ?? 0;
      entry.cache_read_input_tokens += log.cache_read_input_tokens ?? 0;
      entry.total_tokens = entry.input_tokens + entry.output_tokens
        + entry.cache_creation_input_tokens + entry.cache_read_input_tokens;
      totalsByUser[log.user_id] = entry;
    }

    const userTotals = Object.values(totalsByUser).sort((a, b) => b.total_tokens - a.total_tokens);

    const { data: rateLimit } = await supabaseAdmin
      .from('api_rate_limit_status')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    return new Response(
      JSON.stringify({ userTotals, rateLimit: rateLimit ?? null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
