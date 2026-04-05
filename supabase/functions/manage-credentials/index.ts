import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { action, site_url, site_name, username, password } = await req.json();

    if (action === 'list') {
      const { data, error } = await supabase
        .from('website_credentials')
        .select('id, site_url, site_name, username, last_scraped_at, last_error, updated_at')
        .eq('user_id', user.id)
        .order('site_name');
      if (error) throw error;
      return new Response(JSON.stringify({ credentials: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'save') {
      if (!site_url || !site_name || !username || !password)
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { error } = await supabase.from('website_credentials').upsert({
        user_id: user.id, site_url, site_name, username, password,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,site_url' });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      if (!site_url) return new Response(JSON.stringify({ error: 'Missing site_url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { error } = await supabase.from('website_credentials').delete().eq('user_id', user.id).eq('site_url', site_url);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'test') {
      // Try to login and return success/failure
      const { data: creds } = await supabase
        .from('website_credentials')
        .select('username, password')
        .eq('user_id', user.id)
        .eq('site_url', site_url)
        .single();
      if (!creds) return new Response(JSON.stringify({ success: false, error: 'No credentials found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const result = await testLogin(site_url, creds.username, creds.password);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function testLogin(siteUrl: string, username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. GET login page to extract CSRF token
    const loginPageRes = await fetch(`${siteUrl}/logon.php`, { redirect: 'follow' });
    const loginHtml = await loginPageRes.text();
    const tokenMatch = loginHtml.match(/name="flgX"\s+type="hidden"\s+value="([^"]+)"/);
    if (!tokenMatch) return { success: false, error: 'Could not find login token' };

    const cookies = loginPageRes.headers.get('set-cookie') || '';

    // 2. POST credentials
    const form = new URLSearchParams();
    form.set('flgX', tokenMatch[1]);
    form.set('flgSiteName', username);
    form.set('flgPassword', password);

    const loginRes = await fetch(`${siteUrl}/logon.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies },
      body: form.toString(),
      redirect: 'manual',
    });

    const sessionCookies = loginRes.headers.get('set-cookie') || cookies;
    const location = loginRes.headers.get('location') || '';

    // If redirect to error page, login failed
    if (location.includes('logon') || loginRes.status === 200) {
      const body = await loginRes.text();
      if (body.includes('Invalid') || body.includes('failed') || body.includes('incorrect')) {
        return { success: false, error: 'Invalid credentials' };
      }
    }

    // 3. Verify by hitting a protected page
    const checkRes = await fetch(`${siteUrl}/refereeinquiry.php`, {
      headers: { 'Cookie': sessionCookies },
      redirect: 'manual',
    });
    if (checkRes.status === 302 || checkRes.headers.get('location')?.includes('logon')) {
      return { success: false, error: 'Login failed — redirected back to login' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
