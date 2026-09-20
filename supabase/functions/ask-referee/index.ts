import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { IFAB_UPDATES } from './ifab-updates.ts';
import { ECNL_RULES } from './ecnl-rules.ts';
import { EA_RULES } from './ea-rules.ts';
import { LAWS_2026_27 } from './laws-2026-27.ts';
import { LAWS_2025_26 } from './laws-2025-26.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_EMAIL = 'fsdowie@yahoo.com';
const DAILY_LIMIT = 5;

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

    const correctionsBlock = corrections && corrections.length > 0
      ? `\n--- VERIFIED CORRECTIONS (admin-reviewed, take precedence over default answers) ---\n` +
        corrections.map(c =>
          `[${c.version_label}]${c.notes ? ` (${c.notes})` : ''}\n${c.correction_text}`
        ).join('\n\n') +
        `\n--- END CORRECTIONS ---\n`
      : '';

    const systemPrompt = `You are an expert football/soccer referee assistant with deep knowledge of IFAB Laws of the Game 2026/27.

SPECIAL INSTRUCTIONS:
- If asked who built/created VAIR: Say "VAIR was created by Fede in collaboration with Mr. Claude"
- IFAB Laws of the Game 2026/27 (the current, default ruleset, embedded in full below) are ALWAYS the default ruleset for all answers.
- Only reference the IFAB Laws of the Game 2025/26 (also embedded below, for reference) if the user explicitly asks about the previous season, a match played under 2025/26 rules, or what changed between the two seasons. If a rule changed between seasons, say so.
- Only reference ECNL rules if the user explicitly asks about ECNL rules or an ECNL match.
- Only reference EA rules if the user explicitly asks about EA rules or an EA match.
- If an ECNL or EA rule conflicts with IFAB, state the IFAB ruling first, then note "Note: this has been modified by [ECNL/EA] rules: [modification]".

${IFAB_UPDATES}
${correctionsBlock}

--- IFAB LAWS OF THE GAME 2026/27 (current, default ruleset) ---
${LAWS_2026_27}
--- END LAWS OF THE GAME 2026/27 ---

--- IFAB LAWS OF THE GAME 2025/26 (previous season, reference only) ---
${LAWS_2025_26}
--- END LAWS OF THE GAME 2025/26 ---

--- ECNL COMPETITION RULES 2025/26 (use only when explicitly asked) ---
${ECNL_RULES}
--- END ECNL RULES ---

--- EA STANDARDS & RULES 2026/27 (use only when explicitly asked) ---
${EA_RULES}
--- END EA RULES ---

IMPORTANT: Keep responses SHORT (2-3 sentences):
1. State the ruling with Law number
2. Brief explanation
3. If relevant, mention recent IFAB clarifications above
4. Include the specific Law link from this list:

Law 1: https://www.theifab.com/laws/latest/the-field-of-play/
Law 2: https://www.theifab.com/laws/latest/the-ball/
Law 3: https://www.theifab.com/laws/latest/the-players/
Law 4: https://www.theifab.com/laws/latest/the-players-equipment/
Law 5: https://www.theifab.com/laws/latest/the-referee/
Law 6: https://www.theifab.com/laws/latest/the-other-match-officials/
Law 7: https://www.theifab.com/laws/latest/the-duration-of-the-match/
Law 8: https://www.theifab.com/laws/latest/the-start-and-restart-of-play/
Law 9: https://www.theifab.com/laws/latest/the-ball-in-and-out-of-play/
Law 10: https://www.theifab.com/laws/latest/determining-the-outcome-of-a-match/
Law 11: https://www.theifab.com/laws/latest/offside/
Law 12: https://www.theifab.com/laws/latest/fouls-and-misconduct/
Law 13: https://www.theifab.com/laws/latest/free-kicks/
Law 14: https://www.theifab.com/laws/latest/the-penalty-kick/
Law 15: https://www.theifab.com/laws/latest/the-throw-in/
Law 16: https://www.theifab.com/laws/latest/the-goal-kick/
Law 17: https://www.theifab.com/laws/latest/the-corner-kick/

For specific sections, add anchors (e.g., Law 4 safety: #safety, #colours, #jewellery, etc.)

Only provide detailed explanations if user asks for more.`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        // system is now ~150K+ tokens (both seasons' full Laws text plus
        // ECNL/EA rules), so it's cached to avoid re-billing and
        // re-processing it on every question. 1h TTL since usage is bursty
        // (a handful of questions per user per day) rather than continuous.
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral', ttl: '1h' },
          },
        ],
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
    const { error: logError } = await supabase
      .from('questions_log')
      .insert({
        user_id: user.id,
        question: userQuestion,
        input_tokens: usage.input_tokens ?? null,
        output_tokens: usage.output_tokens ?? null,
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? null,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? null,
      });

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
