import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_EMAIL = 'fsdowie@yahoo.com';

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

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'admin'; // admin | user-notifications

    // User checking their own report notifications
    if (mode === 'user-notifications') {
      const { data: reports, error } = await supabase
        .from('answer_reports')
        .select('id, question, vair_answer, status, rejection_reason, is_read, created_at, processed_at')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .eq('is_read', false)
        .order('processed_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ reports: reports || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin: list all reports + corrections
    if (user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const [reportsResult, correctionsResult] = await Promise.all([
      supabase
        .from('answer_reports')
        .select('id, user_id, question, vair_answer, explanation, status, rejection_reason, created_at, processed_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('llm_corrections')
        .select('id, report_id, correction_text, version_label, notes, is_active, created_at')
        .order('created_at', { ascending: false }),
    ]);

    if (reportsResult.error) throw reportsResult.error;
    if (correctionsResult.error) throw correctionsResult.error;

    // Enrich reports with user emails
    const userIds = [...new Set((reportsResult.data || []).map(r => r.user_id))];
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const emailMap = Object.fromEntries((authUsers || []).map(u => [u.id, u.email]));

    const reports = (reportsResult.data || []).map(r => ({
      ...r,
      user_email: emailMap[r.user_id] || 'Unknown',
    }));

    return new Response(
      JSON.stringify({ reports, corrections: correctionsResult.data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
