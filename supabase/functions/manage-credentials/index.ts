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

function extractCookies(headers: Headers): string {
  const cookies: string[] = [];
  const raw = headers.get('set-cookie') || '';
  const parts = raw.split(',');
  for (const part of parts) {
    const kv = part.trim().split(';')[0].trim();
    if (kv.includes('=')) cookies.push(kv);
  }
  return cookies.join('; ');
}

function mergeCookies(existing: string, incoming: string): string {
  if (!incoming) return existing;
  if (!existing) return incoming;
  // Build a map so newer values overwrite older ones
  const map = new Map<string, string>();
  for (const pair of existing.split(';')) {
    const kv = pair.trim();
    if (kv.includes('=')) {
      const [k, ...rest] = kv.split('=');
      map.set(k.trim(), rest.join('='));
    }
  }
  for (const pair of incoming.split(';')) {
    const kv = pair.trim();
    if (kv.includes('=')) {
      const [k, ...rest] = kv.split('=');
      map.set(k.trim(), rest.join('='));
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function testLogin(siteUrl: string, username: string, password: string): Promise<{ success: boolean; error?: string; debug?: string[] }> {
  const log: string[] = [];
  try {
    // 1. GET login page to extract CSRF token + initial cookies
    const loginPageRes = await fetch(`${siteUrl}/logon.php`, { redirect: 'follow' });
    log.push(`[1] GET /logon.php → ${loginPageRes.status} ${loginPageRes.url}`);

    const loginHtml = await loginPageRes.text();
    const tokenMatch = loginHtml.match(/name="flgX"\s+type="hidden"\s+value="([^"]+)"/);
    if (!tokenMatch) return { success: false, error: 'Could not find login token', debug: log };
    log.push(`[1] flgX token found: ${tokenMatch[1].substring(0, 10)}...`);

    let cookieJar = extractCookies(loginPageRes.headers);
    log.push(`[1] initial cookies: ${cookieJar || '(none)'}`);

    // 2. POST credentials
    const form = new URLSearchParams();
    form.set('flgX', tokenMatch[1]);
    form.set('flgSiteName', username);
    form.set('flgPassword', password);

    const loginRes = await fetch(`${siteUrl}/logon.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieJar },
      body: form.toString(),
      redirect: 'manual',
    });

    const loginSetCookie = loginRes.headers.get('set-cookie') || '(none)';
    const location = loginRes.headers.get('location') || '';
    log.push(`[2] POST /logon.php → ${loginRes.status}, location: "${location}", set-cookie: ${loginSetCookie}`);

    cookieJar = mergeCookies(cookieJar, extractCookies(loginRes.headers));
    log.push(`[2] cookie jar after POST: ${cookieJar || '(none)'}`);

    // Redirected back to login = bad credentials
    if (location.includes('logon')) {
      return { success: false, error: 'Invalid credentials', debug: log };
    }

    // 3. Follow the redirect manually to collect any session cookies set there
    if (location) {
      const redirectUrl = location.startsWith('http') ? location : `${siteUrl}${location.startsWith('/') ? '' : '/'}${location}`;
      log.push(`[3] following redirect → ${redirectUrl}`);
      const redirectRes = await fetch(redirectUrl, {
        headers: { 'Cookie': cookieJar },
        redirect: 'manual',
      });
      const redirectSetCookie = redirectRes.headers.get('set-cookie') || '(none)';
      const redirectLocation = redirectRes.headers.get('location') || '';
      log.push(`[3] redirect response → ${redirectRes.status}, location: "${redirectLocation}", set-cookie: ${redirectSetCookie}`);
      cookieJar = mergeCookies(cookieJar, extractCookies(redirectRes.headers));
      log.push(`[3] cookie jar after redirect: ${cookieJar || '(none)'}`);
    } else {
      log.push(`[3] no redirect location, skipping`);
    }

    // 4. Verify by hitting the inquiry page
    const checkRes = await fetch(`${siteUrl}/refereeinquiry.php`, {
      headers: { 'Cookie': cookieJar },
      redirect: 'manual',
    });
    const checkLocation = checkRes.headers.get('location') || '';
    log.push(`[4] GET /refereeinquiry.php → ${checkRes.status}, location: "${checkLocation}"`);

    if (checkRes.status === 302 || checkLocation.includes('logon')) {
      return { success: false, error: 'Login failed — redirected back to login', debug: log };
    }

    return { success: true, debug: log };
  } catch (err) {
    log.push(`[ERR] ${String(err)}`);
    return { success: false, error: String(err), debug: log };
  }
}
