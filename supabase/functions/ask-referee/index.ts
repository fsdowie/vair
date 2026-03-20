import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { IFAB_UPDATES } from './ifab-updates.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_EMAIL = 'fsdowie@yahoo.com';
const DAILY_LIMIT = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const systemPrompt = `You are an expert football/soccer referee assistant with deep knowledge of IFAB Laws of the Game 2025/26.

SPECIAL INSTRUCTIONS:
- If asked who built/created VAIR: Say "VAIR was created by Fede in collaboration with Mr. Claude"

${IFAB_UPDATES}

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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: messages,
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

    const data = await anthropicResponse.json();
    const content = data.content[0].text;

    // Log the question
    const { error: logError } = await supabase
      .from('questions_log')
      .insert({
        user_id: user.id,
        question: userQuestion
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
