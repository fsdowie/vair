import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INQUIRY_PATH = '/refereeinquiry.php?friShowRef=0&friShowRef=1&friSRef=Mine' +
  '&friShowAR=0&friShowAR=1&friSAR=Mine&friShow4th=0&friS4th=All' +
  '&friShowMatch=0&friShowMatch=1&friKey=&friShowTeams=0&friShowTeams=1&friTeam=' +
  '&friShowDate=0&friShowDate=1&friStartDate=01%2F01%2F2026&friEndDate=12%2F31%2F2026' +
  '&friShowLeague=0&friShowLeague=1&friLeagueM=0&friLeague=All' +
  '&friShowField=0&friShowField=1&friFieldM=0&friField=All' +
  '&friShowTime=0&friShowTime=1&friTimeM=0&friTime=All' +
  '&friShowLevel=0&friShowLevel=1&friLevelM=0&friLevel=All' +
  '&friShowGender=0&friShowGender=1&friGenderM=0&friGender=All' +
  '&friShowStatus=0&friShowStatus=1&friStatus=All' +
  '&friShowDivision=0&friShowDivision=1&friDivisionM=0&friDivision=All' +
  '&friOrder=Date%2C+Field%2C+Time&action=Show&friMax=500';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  let targetUserIds: string[] = [];

  // If called with service role key (cron) → scrape all users
  // If called with user token → scrape only that user
  if (token === SUPABASE_SERVICE_ROLE_KEY || token === SUPABASE_ANON_KEY || !token) {
    // Cron / admin call — get all users with credentials
    const { data } = await supabase.from('website_credentials').select('user_id');
    targetUserIds = [...new Set((data || []).map((r: { user_id: string }) => r.user_id))];
  } else {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    targetUserIds = [user.id];
  }

  const results: Record<string, unknown>[] = [];

  for (const userId of targetUserIds) {
    const { data: credentials } = await supabase
      .from('website_credentials')
      .select('*')
      .eq('user_id', userId);

    for (const cred of credentials || []) {
      try {
        const games = await scrapeGames(cred.site_url, cred.username, cred.password);
        let upserted = 0;

        for (const game of games) {
          const { error } = await supabase.from('games').upsert({
            user_id: userId,
            match_id: game.match_id,
            source_site: cred.site_url,
            date: game.date,
            time: game.time,
            league: game.league,
            level: game.level,
            gender: game.gender,
            field: game.field,
            home_team: game.home_team,
            away_team: game.away_team,
            referee: game.referee,
            ar1: game.ar1,
            ar2: game.ar2,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,match_id,source_site',
            ignoreDuplicates: false,
          });
          if (!error) upserted++;
        }

        await supabase.from('website_credentials').update({
          last_scraped_at: new Date().toISOString(),
          last_error: null,
        }).eq('id', cred.id);

        results.push({ site: cred.site_url, scraped: games.length, upserted });
      } catch (err) {
        const errMsg = String(err);
        await supabase.from('website_credentials').update({ last_error: errMsg }).eq('id', cred.id);
        results.push({ site: cred.site_url, error: errMsg });
      }
    }
  }

  return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

interface GameRow {
  match_id: string;
  date: string;
  time: string;
  league: string;
  gender: string;
  level: string;
  field: string;
  home_team: string;
  away_team: string;
  referee: string;
  ar1: string;
  ar2: string;
}

async function scrapeGames(siteUrl: string, username: string, password: string): Promise<GameRow[]> {
  // 1. GET login page for CSRF token
  const loginPageRes = await fetch(`${siteUrl}/logon.php`, { redirect: 'follow' });
  const loginHtml = await loginPageRes.text();
  const tokenMatch = loginHtml.match(/name="flgX"\s+type="hidden"\s+value="([^"]+)"/);
  if (!tokenMatch) throw new Error('Could not extract login token from ' + siteUrl);

  const initialCookies = extractCookies(loginPageRes.headers);

  // 2. POST login
  const form = new URLSearchParams();
  form.set('flgX', tokenMatch[1]);
  form.set('flgSiteName', username);
  form.set('flgPassword', password);

  const loginRes = await fetch(`${siteUrl}/logon.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': initialCookies,
    },
    body: form.toString(),
    redirect: 'manual',
  });

  const sessionCookies = extractCookies(loginRes.headers) || initialCookies;

  // 3. Fetch inquiry page
  const inquiryRes = await fetch(`${siteUrl}${INQUIRY_PATH}`, {
    headers: { 'Cookie': sessionCookies },
    redirect: 'follow',
  });

  if (!inquiryRes.ok) throw new Error(`Inquiry page returned ${inquiryRes.status}`);
  const html = await inquiryRes.text();

  if (html.includes('logon.php') && !html.includes('x_results')) {
    throw new Error('Session not established — login may have failed');
  }

  return parseGamesTable(html, siteUrl);
}

function extractCookies(headers: Headers): string {
  const cookies: string[] = [];
  // Deno fetch returns multiple Set-Cookie as comma-separated in some implementations
  const raw = headers.get('set-cookie') || '';
  // Extract name=value pairs before any semicolon
  const parts = raw.split(',');
  for (const part of parts) {
    const kv = part.trim().split(';')[0].trim();
    if (kv.includes('=')) cookies.push(kv);
  }
  return cookies.join('; ');
}

function parseGamesTable(html: string, siteUrl: string): GameRow[] {
  // Extract the results table
  const tableMatch = html.match(/<table[^>]*id="x_results"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];

  // Extract all <tr> rows, skip the header row
  const rowMatches = [...tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  const games: GameRow[] = [];

  for (let i = 1; i < rowMatches.length; i++) { // skip header row
    const rowHtml = rowMatches[i][1];
    const tds = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);

    if (tds.length < 22) continue;

    const getText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
    const getLink = (html: string) => {
      const m = html.match(/<a[^>]*>([^<]+)<\/a>/i);
      return m ? m[1].trim() : getText(html);
    };

    // Column indices based on the table structure (0-based):
    // 0: match_id, 1: notes, 2: date, 3: day, 4: time, 5: authority, 6: client,
    // 7: group, 8: league, 9: gender, 10: level, 11: division, 12: season,
    // 13: membership, 14: field, 15: rank, 16: status, 17: home, 18: away,
    // 19: ref, 20: ar1, 21: ar2
    const matchId = getLink(tds[0]);
    if (!matchId || matchId === '') continue;

    const rawDate = getText(tds[2]);
    const rawTime = getText(tds[4]);

    const parsedDate = parseDate(rawDate);
    const parsedTime = parseTime(rawTime);

    if (!parsedDate) continue;

    games.push({
      match_id: matchId,
      date: parsedDate,
      time: parsedTime,
      league: getText(tds[8]),
      gender: getText(tds[9]),
      level: getText(tds[10]),
      field: getLink(tds[14]),
      home_team: getText(tds[17]),
      away_team: getText(tds[18]),
      referee: getLink(tds[19]),
      ar1: getLink(tds[20]),
      ar2: getLink(tds[21]),
    });
  }

  return games;
}

function parseDate(raw: string): string | null {
  // Format: "1/24/2026" → "2026-01-24"
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, month, day, year] = m;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseTime(raw: string): string {
  // Format: "11:15 am" → "11:15:00" or "1:30 pm" → "13:30:00"
  const m = raw.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) return '00:00:00';
  let hours = parseInt(m[1]);
  const minutes = m[2];
  const ampm = m[3].toLowerCase();
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
}
