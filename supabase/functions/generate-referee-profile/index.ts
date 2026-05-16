import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY      = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_EMAIL             = 'fsdowie@yahoo.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROFILE_SCHEMA = `{
  "name": "string — full name",
  "country": "string — federation/country they represent as a referee (e.g. England, USA, Argentina, France)",
  "flag": "string — flagcdn.com ISO country code (e.g. 'gb-eng' for England, 'us' for USA, 'ar' for Argentina, 'fr' for France, 'de' for Germany, 'es' for Spain, 'it' for Italy, 'br' for Brazil, 'pt' for Portugal). Use 'gb-eng' for English referees specifically, not 'gb'.",
  "age": "number | null",
  "date_of_birth": "string YYYY-MM-DD | null",
  "place_of_birth": "string | null",
  "leagues": ["array of competition names they regularly officiate"],
  "active": "boolean",
  "fouls_per_game": "number — referee's rolling 3-season avg fouls called per game across all competitions",
  "fouls_per_league": {
    "Competition Name": { "per_game": "number — referee avg", "league_avg": "number — all referees in that competition avg" }
  },
  "yellow_per_game": "number",
  "yellow_per_league": {
    "Competition Name": { "per_game": "number", "league_avg": "number" }
  },
  "red_per_game": "number",
  "red_per_league": {
    "Competition Name": { "per_game": "number", "league_avg": "number" }
  },
  "penalties_per_game": "number",
  "penalties_per_league": {
    "Competition Name": { "per_game": "number", "league_avg": "number" }
  },
  "comments": "string — 2-3 sentences describing the referee's style, career highlights, and reputation"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check admin: bootstrap email or profiles.is_admin
    let isAdmin = user.email === ADMIN_EMAIL;
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.is_admin === true;
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { referee_name, request_id } = await req.json();
    if (!referee_name) {
      return new Response(JSON.stringify({ error: 'referee_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call Claude to generate the profile
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `You are a football/soccer referee statistics expert. When asked to generate a referee profile, respond with ONLY a valid JSON object — no markdown, no explanation, no code fences. Use your knowledge of the referee to populate biographical fields accurately. For statistics, provide rolling 3-season estimates based on typical performance in the competitions they work. The "league_avg" field is the estimated average per game across ALL referees in that competition, used as a peer benchmark.`,
        messages: [
          {
            role: 'user',
            content: `Generate a complete profile for referee "${referee_name}". Return a JSON object matching exactly this schema:\n${PROFILE_SCHEMA}`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text ?? '';

    let profile: Record<string, unknown>;
    try {
      // Strip any accidental markdown fences Claude might add
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      profile = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse Claude response as JSON: ${rawText.slice(0, 200)}`);
    }

    // Insert into referee_profiles using service role (bypasses RLS)
    const { data: inserted, error: insertError } = await supabase
      .from('referee_profiles')
      .insert({
        name:                  profile.name            ?? referee_name,
        country:               profile.country         ?? null,
        flag:                  profile.flag            ?? null,
        age:                   profile.age             ?? null,
        date_of_birth:         profile.date_of_birth   ?? null,
        place_of_birth:        profile.place_of_birth  ?? null,
        leagues:               profile.leagues         ?? [],
        active:                profile.active          ?? true,
        fouls_per_game:        profile.fouls_per_game     ?? null,
        fouls_per_league:      profile.fouls_per_league   ?? {},
        yellow_per_game:       profile.yellow_per_game    ?? null,
        yellow_per_league:     profile.yellow_per_league  ?? {},
        red_per_game:          profile.red_per_game       ?? null,
        red_per_league:        profile.red_per_league     ?? {},
        penalties_per_game:    profile.penalties_per_game    ?? null,
        penalties_per_league:  profile.penalties_per_league  ?? {},
        comments:              profile.comments        ?? null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // If a request_id was provided, mark it approved
    if (request_id) {
      await supabase
        .from('referee_profile_requests')
        .update({
          status:      'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request_id);
    }

    return new Response(JSON.stringify({ success: true, profile: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('generate-referee-profile error:', error);
    return new Response(JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
