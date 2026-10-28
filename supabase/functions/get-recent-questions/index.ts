import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRENDING_COUNT = 10;
// How far back (in asked questions) to look for trending candidates.
const CANDIDATE_POOL = 500;

// Same question asked with different casing/spacing counts as one.
const questionKey = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Trending questions for the AI Referee landing page.
//   GET / POST {}                     → { questions: [{ question, answer, clicks }] }
//     Up to 10 distinct recent questions, most-clicked first (ties: most
//     recent first). answer is the ruling VAiR gave last time, so the page
//     can show it without asking the AI again (null if none was saved).
//   POST { action: "click", question } → { ok: true }
//     Records that the caller clicked a trending question; each person
//     counts once per question.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Any authenticated user may call this — it only ever returns question
    // and answer text (no user_id/email), so there's nothing here for an
    // admin gate to protect.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return json({ error: 'Invalid authentication' }, 401);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    if (body.action === 'click') {
      const q = typeof body.question === 'string' ? body.question : '';
      const key = questionKey(q).slice(0, 2000);
      if (!key) return json({ error: 'Missing question' }, 400);
      const { error } = await supabaseAdmin
        .from('trending_question_clicks')
        .upsert({ question_key: key, user_id: user.id }, { onConflict: 'question_key,user_id', ignoreDuplicates: true });
      if (error) {
        console.error('Error recording trending click:', error);
        return json({ error: 'Failed to record click' }, 500);
      }
      return json({ ok: true });
    }

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('questions_log')
      .select('question, answer, created_at')
      .eq('is_followup', false)
      .order('created_at', { ascending: false })
      .limit(CANDIDATE_POOL);
    if (logsError) {
      console.error('Error fetching recent questions:', logsError);
      return json({ error: 'Failed to fetch recent questions' }, 500);
    }

    // Distinct questions, newest first; keep the most recent saved answer.
    const candidates = new Map<string, { question: string; answer: string | null; order: number }>();
    for (const log of logs ?? []) {
      const q = (log.question ?? '').trim();
      const key = questionKey(q);
      if (!q) continue;
      const existing = candidates.get(key);
      if (!existing) {
        candidates.set(key, { question: q, answer: log.answer ?? null, order: candidates.size });
      } else if (!existing.answer && log.answer) {
        existing.answer = log.answer;
      }
    }

    const { data: clickRows, error: clicksError } = await supabaseAdmin
      .from('trending_question_clicks')
      .select('question_key')
      .limit(50000);
    if (clicksError) console.error('Error fetching trending clicks:', clicksError);
    const clicks = new Map<string, number>();
    for (const row of clickRows ?? []) {
      clicks.set(row.question_key, (clicks.get(row.question_key) ?? 0) + 1);
    }

    const questions = [...candidates.entries()]
      .map(([key, c]) => ({ ...c, clicks: clicks.get(key) ?? 0 }))
      .sort((a, b) => b.clicks - a.clicks || a.order - b.order)
      .slice(0, TRENDING_COUNT)
      .map(({ question, answer, clicks }) => ({ question, answer, clicks }));

    return json({ questions });
  } catch (error) {
    console.error('get-recent-questions error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
