import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_EMAIL = 'fsdowie@yahoo.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function versionLabel(): string {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'UTC',
  }) + ' UTC';
}

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

    const { action, report_id, correction_text, notes, rejection_reason, correction_id } = await req.json();

    // Mark reporter notification as read (called by reporter, not admin)
    if (action === 'mark_read') {
      const { error } = await supabase
        .from('answer_reports')
        .update({ is_read: true })
        .eq('id', report_id)
        .eq('user_id', user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // All other actions require admin
    if (user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'accept') {
      if (!correction_text) {
        return new Response(JSON.stringify({ error: 'correction_text is required when accepting' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Update report status
      const { error: reportError } = await supabase
        .from('answer_reports')
        .update({ status: 'accepted', processed_at: new Date().toISOString(), is_read: false })
        .eq('id', report_id);
      if (reportError) throw reportError;

      // Create versioned correction
      const { error: correctionError } = await supabase
        .from('llm_corrections')
        .insert({
          report_id,
          correction_text,
          version_label: versionLabel(),
          notes: notes || null,
          is_active: true,
        });
      if (correctionError) throw correctionError;

    } else if (action === 'reject') {
      if (!rejection_reason) {
        return new Response(JSON.stringify({ error: 'rejection_reason is required when rejecting' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error } = await supabase
        .from('answer_reports')
        .update({ status: 'rejected', rejection_reason, processed_at: new Date().toISOString(), is_read: false })
        .eq('id', report_id);
      if (error) throw error;

    } else if (action === 'delete_correction') {
      // Hard delete a correction (rollback)
      const { error } = await supabase
        .from('llm_corrections')
        .delete()
        .eq('id', correction_id);
      if (error) throw error;

    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
