import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { IFAB_UPDATES } from './ifab-updates.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

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

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert football/soccer referee assistant with deep knowledge of IFAB Laws of the Game 2025/26.

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

    return new Response(
      JSON.stringify({ content }),
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
