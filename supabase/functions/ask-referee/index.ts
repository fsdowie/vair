import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildSystem } from './prompt.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_EMAIL = 'fsdowie@yahoo.com';
const DAILY_LIMIT = 5;
const MODEL = 'claude-sonnet-5';

function numOrNull(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

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
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = user.email === ADMIN_EMAIL;

    // Check daily limit for non-admin users
    if (!isAdmin) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error: countError } = await supabase
        .from('questions_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if (countError) {
        console.error('Error counting questions:', countError);
      } else if (count !== null && count >= DAILY_LIMIT) {
        return new Response(
          JSON.stringify({ 
            error: `Daily limit reached. You can ask ${DAILY_LIMIT} questions per day. Try again tomorrow!`,
            limitReached: true,
            questionsToday: count,
            dailyLimit: DAILY_LIMIT
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get the last user message (the question)
    const userQuestion = messages.filter(m => m.role === 'user').pop()?.content || '';

    // Fetch active corrections from DB
    const { data: corrections } = await supabase
      .from('llm_corrections')
      .select('correction_text, version_label, notes')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        // Cached in blocks (see prompt.ts): Laws 2026/27 always, other
        // rulebooks only when the conversation mentions them, corrections last.
        system: buildSystem(messages, corrections),
        messages: messages,
        // Claude Sonnet 5 runs adaptive thinking by default when this is
        // omitted, which prepends a `thinking` content block before the
        // `text` block. This tool wants short, direct rulings, not extended
        // reasoning, so disable it explicitly — also avoids thinking tokens
        // competing with the answer for the 300-token budget above.
        thinking: { type: 'disabled' },
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Snapshot Anthropic's rate-limit headers before consuming the body —
    // this is the only place we see the account's live capacity, so record
    // it on every call for the admin panel to read back.
    const rl = anthropicResponse.headers;
    const rateLimitSnapshot = {
      id: 1,
      requests_limit: numOrNull(rl.get('anthropic-ratelimit-requests-limit')),
      requests_remaining: numOrNull(rl.get('anthropic-ratelimit-requests-remaining')),
      requests_reset: rl.get('anthropic-ratelimit-requests-reset'),
      input_tokens_limit: numOrNull(rl.get('anthropic-ratelimit-input-tokens-limit')),
      input_tokens_remaining: numOrNull(rl.get('anthropic-ratelimit-input-tokens-remaining')),
      input_tokens_reset: rl.get('anthropic-ratelimit-input-tokens-reset'),
      output_tokens_limit: numOrNull(rl.get('anthropic-ratelimit-output-tokens-limit')),
      output_tokens_remaining: numOrNull(rl.get('anthropic-ratelimit-output-tokens-remaining')),
      output_tokens_reset: rl.get('anthropic-ratelimit-output-tokens-reset'),
      tokens_limit: numOrNull(rl.get('anthropic-ratelimit-tokens-limit')),
      tokens_remaining: numOrNull(rl.get('anthropic-ratelimit-tokens-remaining')),
      tokens_reset: rl.get('anthropic-ratelimit-tokens-reset'),
      updated_at: new Date().toISOString(),
    };
    const { error: rlError } = await supabase
      .from('api_rate_limit_status')
      .upsert(rateLimitSnapshot);
    if (rlError) {
      console.error('Error saving rate limit snapshot:', rlError);
    }

    const data = await anthropicResponse.json();
    // Find the text block by type rather than assuming index 0 — defensive
    // even with thinking disabled, in case other block types are ever added.
    const content = data.content.find((block) => block.type === 'text')?.text;
    if (!content) {
      console.error('Anthropic response had no text block:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the question along with the real token usage Anthropic billed for
    // this request, so usage can be broken down per VAIR user later.
    const usage = data.usage ?? {};
    const logRow = {
      user_id: user.id,
      question: userQuestion,
      input_tokens: usage.input_tokens ?? null,
      output_tokens: usage.output_tokens ?? null,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? null,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? null,
    };
    // The answer is kept so trending questions can replay it for free
    // (get-recent-questions); follow-ups are flagged so they're never
    // offered out of context.
    const answerRow = {
      ...logRow,
      answer: content,
      is_followup: messages.filter(m => m.role === 'user').length > 1,
    };
    // Still log the question (it backs the daily limit) if the columns from
    // migration 020 (model) or 019 (answer, is_followup) aren't there yet.
    let { error: logError } = await supabase
      .from('questions_log')
      .insert({ ...answerRow, model: MODEL });
    if (logError) {
      console.error('Error logging question with model, retrying without:', logError);
      ({ error: logError } = await supabase.from('questions_log').insert(answerRow));
    }
    if (logError) {
      console.error('Error logging question with answer, retrying without:', logError);
      ({ error: logError } = await supabase.from('questions_log').insert(logRow));
    }

    if (logError) {
      console.error('Error logging question:', logError);
    }

    // Get updated count for response
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('questions_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    return new Response(
      JSON.stringify({ 
        content,
        questionsToday: count || 0,
        dailyLimit: isAdmin ? 'unlimited' : DAILY_LIMIT,
        isAdmin
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
