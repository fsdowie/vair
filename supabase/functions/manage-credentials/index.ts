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

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function testLogin(siteUrl: string, username: string, password: string): Promise<{ success: boolean; error?: string; debug?: string[] }> {
  const log: string[] = [];
  try {
    // 1. GET login page to extract CSRF token + initial cookies
    const loginPageRes = await fetch(`${siteUrl}/logon.php`, {
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA },
    });
    log.push(`[1] GET /logon.php → ${loginPageRes.status} ${loginPageRes.url}`);

    const loginHtml = await loginPageRes.text();
    const tokenMatch = loginHtml.match(/name="flgX"\s+type="hidden"\s+value="([^"]+)"/);
    if (!tokenMatch) return { success: false, error: 'Could not find login token', debug: log };
    log.push(`[1] flgX token found: ${tokenMatch[1].substring(0, 10)}...`);

    let cookieJar = extractCookies(loginPageRes.headers);
    log.push(`[1] initial cookies: ${cookieJar || '(none)'}`);

    // Extract all hidden fields from the login form (any attribute order)
    const hiddenFields: Record<string, string> = {};
    const hiddenRe = /<input[^>]+>/gi;
    let hm: RegExpExecArray | null;
    while ((hm = hiddenRe.exec(loginHtml)) !== null) {
      const tag = hm[0];
      if (!tag.includes('hidden')) continue;
      const nameM = tag.match(/name="([^"]+)"/i);
      const valM  = tag.match(/value="([^"]*)"/i);
      if (nameM) hiddenFields[nameM[1]] = valM?.[1] ?? '';
    }
    log.push(`[1] hidden fields found: ${JSON.stringify(hiddenFields)}`);

    // Log the raw form HTML
    const formMatch = loginHtml.match(/<form[^>]*action[^>]*logon[^>]*>[\s\S]*?<\/form>/i);
    log.push(`[1] form HTML: ${formMatch ? formMatch[0].replace(/\s+/g, ' ').substring(0, 400) : '(not found)'}`);

    const jsSnippets = [...loginHtml.matchAll(/document\.cookie\s*=[^;'"]{0,120}|flg\w+\s*=[^;'"]{0,80}/gi)].map(m => m[0]);
    log.push(`[1] JS cookie/field assignments: ${jsSnippets.length ? jsSnippets.join(' | ') : '(none found)'}`);

    // Fetch ALL external scripts — log first 800 chars of each
    const scriptSrcs = [...loginHtml.matchAll(/<script[^>]+src="([^"]+)"/gi)].map(m => m[1]);
    log.push(`[1] external scripts: ${scriptSrcs.join(', ') || '(none)'}`);
    for (const src of scriptSrcs) {
      const scriptUrl = src.startsWith('http') ? src : `${siteUrl}${src.startsWith('/') ? '' : '/'}${src}`;
      try {
        const jsRes = await fetch(scriptUrl, { headers: { 'User-Agent': BROWSER_UA } });
        const jsText = await jsRes.text();
        log.push(`[1] ${src} (${jsText.length} bytes): ${jsText.replace(/\s+/g, ' ').substring(0, 800)}`);
      } catch (e) {
        log.push(`[1] failed to fetch ${src}: ${e}`);
      }
    }

    // 2. POST credentials — include ALL hidden fields + credentials
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(hiddenFields)) form.set(k, v);
    // xCDT() dynamically appends a hidden "cdt" field: "1,{innerWidth},{innerHeight},{cookieEnabled}"
    form.set('cdt', '1,1280,800,1');
    form.set('flgSiteName', username);
    form.set('flgPassword', password);
    log.push(`[2] posting fields: ${[...form.keys()].join(', ')}`);

    const loginRes = await fetch(`${siteUrl}/logon.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieJar,
        'Referer': `${siteUrl}/logon.php`,
        'Origin': siteUrl,
        'User-Agent': BROWSER_UA,
      },
      body: form.toString(),
      redirect: 'manual',
    });

    const loginSetCookie = loginRes.headers.get('set-cookie') || '(none)';
    const location = loginRes.headers.get('location') || '';
    log.push(`[2] POST /logon.php → ${loginRes.status}, location: "${location}", set-cookie: ${loginSetCookie}`);

    // Log a snippet of the response body to see any error messages
    const loginBody = await loginRes.text();
    const errorSnippet = loginBody.match(/(?:error|invalid|incorrect|failed|wrong)[^<]{0,120}/i)?.[0]
      ?? loginBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200);
    log.push(`[2] response body snippet: ${errorSnippet}`);

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
        headers: { 'Cookie': cookieJar, 'User-Agent': BROWSER_UA },
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
      headers: { 'Cookie': cookieJar, 'User-Agent': BROWSER_UA },
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
