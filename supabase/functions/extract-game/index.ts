import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = `Extract all game/match details from this referee assignment screenshot.
Return ONLY a valid JSON object with these exact fields (use null for any field not visible):
{
  "match_number": "string — the match/game number e.g. 181094",
  "date": "YYYY-MM-DD",
  "time": "HH:MM — 24h format",
  "field": "string — field/venue name",
  "gender": "string — e.g. B, G, M, F",
  "level": "string — e.g. U11, U14, Adult",
  "league": "string",
  "division": "string",
  "client": "string — club or client name",
  "season": "string — e.g. 25-26",
  "area": "string",
  "home_team": "string — full home team name",
  "away_team": "string — full away team name",
  "referee": "string — referee full name",
  "ar1": "string — AR1 full name or null",
  "ar2": "string — AR2 full name or null"
}
Return only the JSON object, no explanation or markdown.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { image_base64, media_type } = await req.json();
    if (!image_base64) throw new Error('image_base64 is required');

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: media_type || 'image/png',
                data: image_base64,
              },
            },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });

    const aiData = await res.json();
    if (!res.ok) throw new Error(aiData.error?.message || 'Claude API error');

    const text = aiData.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse game details from image');

    const game = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ success: true, game }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
