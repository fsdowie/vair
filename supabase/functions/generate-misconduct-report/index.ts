import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { LAW12_REFERENCE } from './law12-reference.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OFFENDER_TYPES = ['player', 'team_official'];
const TEAMS = ['home', 'away'];
const OFFENSES = ['caution', 'send_off'];

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

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

    const body = await req.json();
    const {
      offenderType, offenderName, team, jerseyNumber,
      offense, reason, fieldSpot, fieldZone, minute, description,
    } = body ?? {};

    if (!OFFENDER_TYPES.includes(offenderType)) return badRequest('Invalid offenderType');
    if (typeof offenderName !== 'string' || !offenderName.trim()) return badRequest('offenderName is required');
    if (!TEAMS.includes(team)) return badRequest('Invalid team');
    if (!OFFENSES.includes(offense)) return badRequest('Invalid offense');
    if (typeof reason !== 'string' || !reason.trim()) return badRequest('reason is required');
    if (typeof minute !== 'string' || !minute.trim()) return badRequest('minute is required');
    if (typeof description !== 'string' || !description.trim()) return badRequest('description is required');
    if (offenderType === 'player' && (typeof jerseyNumber !== 'string' || !jerseyNumber.trim())) {
      return badRequest('jerseyNumber is required for a player');
    }

    const offenderLabel = offenderType === 'player'
      ? `#${jerseyNumber.trim()} ${offenderName.trim()}`
      : `${offenderName.trim()} (Team Official)`;

    const systemPrompt = `You are helping a soccer/football referee write an official misconduct report for their league's disciplinary committee. Many committee reviewers are NOT referees, so the report must be precise, factual, and reference the Law 12 terminology below correctly.

${LAW12_REFERENCE}

TASK: Given the structured incident details and the referee's own plain-language description of what happened, write ONE short factual paragraph (3-5 sentences) in the referee's first-person voice ("I stopped play, showed...") following the Who/What/Where/When/How structure and style shown in the examples above.

Rules:
- Use the exact offender label, team, minute, and field location given below — do not invent or change them.
- Base the "What happened" and "How" entirely on the referee's description below — do not invent facts, injuries, or details that were not stated.
- Do NOT speculate about motive or intent (avoid "why") — leave that to the committee.
- If the description includes a quote (for dissent/abusive language), reproduce it exactly in quotation marks.
- End by naming the specific Law 12 category (e.g. "Unsporting Behaviour", "Violent Conduct", "Serious Foul Play") and stating the restart (a caution = yellow card shown and play restarts with the appropriate free kick for the opposing team, unless the description says otherwise; a send-off = red card shown and sent off).
- Output ONLY the report paragraph itself — no preamble, no headers, no markdown.`;

    const userPrompt = `Offender: ${offenderLabel}
Team: ${team === 'home' ? 'Home' : 'Away'}
Offense: ${offense === 'caution' ? 'Caution (yellow card)' : 'Send-off (red card)'}
Reason category: ${reason}
Field location: ${fieldSpot || 'not specified'}${fieldZone ? ` (${fieldZone})` : ''}
Minute: ${minute}

Referee's description of what happened:
${description.trim()}`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('Anthropic API error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to generate report' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anthropicData = await anthropicResponse.json();
    const generatedReport = anthropicData.content?.[0]?.text?.trim();
    if (!generatedReport) {
      return new Response(JSON.stringify({ error: 'Empty response from model' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: saved, error: insertError } = await supabaseAdmin
      .from('misconduct_reports')
      .insert({
        user_id: user.id,
        offender_type: offenderType,
        offender_name: offenderName.trim(),
        team,
        jersey_number: offenderType === 'player' ? jerseyNumber.trim() : null,
        offense,
        reason,
        field_spot: fieldSpot || null,
        minute,
        description: description.trim(),
        generated_report: generatedReport,
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      // The report was generated successfully; failing to save history
      // shouldn't block the referee from getting (and copying) their report.
      console.error('Error saving misconduct report:', insertError);
    }

    return new Response(JSON.stringify({
      report: generatedReport,
      id: saved?.id ?? null,
      created_at: saved?.created_at ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('generate-misconduct-report error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
