import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Any authenticated user may call this — it only ever returns question
    // text (no user_id/email), so there's nothing here for an admin gate to
    // protect.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pull a bit more than 3 so we can drop exact-duplicate text (e.g. a
    // double-submit, or several people asking the same sample question)
    // and still end up with 3 distinct trending questions.
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('questions_log')
      .select('question, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error('Error fetching recent questions:', logsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch recent questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const seen = new Set<string>();
    const questions: string[] = [];
    for (const log of logs ?? []) {
      const q = (log.question ?? '').trim();
      const key = q.toLowerCase();
      if (!q || seen.has(key)) continue;
      seen.add(key);
      questions.push(q);
      if (questions.length === 3) break;
    }

    return new Response(JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('get-recent-questions error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
