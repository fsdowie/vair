import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BOOTSTRAP_ADMIN_EMAIL = 'fsdowie@yahoo.com';

// USD per million tokens. cacheWrite is the 1-hour TTL rate (2x input),
// which is what ask-referee uses. Rows logged before questions_log.model
// existed were all answered by claude-sonnet-5.
const PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-sonnet-5': { input: 2, output: 10, cacheWrite: 4, cacheRead: 0.2 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheWrite: 4, cacheRead: 0.2 },
  'claude-opus-5-5': { input: 4, output: 20, cacheWrite: 8, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheWrite: 0.2, cacheRead: 0.01 },
};
const DEFAULT_MODEL = 'claude-sonnet-5';

type Log = {
  user_id: string;
  created_at: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
};

const costOf = (log: Log) => {
  const p = PRICES[log.model ?? DEFAULT_MODEL] ?? PRICES[DEFAULT_MODEL];
  return ((log.input_tokens ?? 0) * p.input + (log.output_tokens ?? 0) * p.output
    + (log.cache_creation_input_tokens ?? 0) * p.cacheWrite
    + (log.cache_read_input_tokens ?? 0) * p.cacheRead) / 1_000_000;
};
const tokensOf = (log: Log) => (log.input_tokens ?? 0) + (log.output_tokens ?? 0)
  + (log.cache_creation_input_tokens ?? 0) + (log.cache_read_input_tokens ?? 0);

// Billing period (UTC) containing `date`: from renewalDay of one month up to
// the day before renewalDay of the next.
const periodStart = (date: Date, renewalDay: number) => {
  const y = date.getUTCFullYear(), m = date.getUTCMonth();
  return date.getUTCDate() >= renewalDay
    ? new Date(Date.UTC(y, m, renewalDay))
    : new Date(Date.UTC(y, m - 1, renewalDay));
};
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Admin check: bootstrap email OR profiles.is_admin (same rule as set-admin-role)
    const isBootstrapAdmin = user.email === BOOTSTRAP_ADMIN_EMAIL;
    if (!isBootstrapAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Payment / settings edits from the Token Usage tab.
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    if (body.action === 'add_payment') {
      const amount = Number(body.amount);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.paid_on ?? '') || !Number.isFinite(amount) || amount === 0) {
        return json({ error: 'A date and a non-zero amount are required' }, 400);
      }
      const { error } = await supabaseAdmin.from('billing_payments')
        .insert({ paid_on: body.paid_on, amount, note: (body.note ?? '').toString().slice(0, 200) || null });
      if (error) return json({ error: 'Failed to save payment' }, 500);
      return json({ ok: true });
    }
    if (body.action === 'delete_payment') {
      const { error } = await supabaseAdmin.from('billing_payments').delete().eq('id', body.id);
      if (error) return json({ error: 'Failed to delete payment' }, 500);
      return json({ ok: true });
    }
    if (body.action === 'set_renewal_day') {
      const day = Number(body.renewal_day);
      if (!Number.isInteger(day) || day < 1 || day > 28) return json({ error: 'Renewal day must be 1-28' }, 400);
      const { error } = await supabaseAdmin.from('billing_settings').upsert({ id: 1, renewal_day: day });
      if (error) return json({ error: 'Failed to save renewal day' }, 500);
      return json({ ok: true });
    }

    // Pull every logged question's token usage. Aggregated in JS rather than
    // SQL group-by since volume here is small (a handful of questions/day
    // per user) and this mirrors the existing get-question-logs pattern.
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('questions_log')
      .select('user_id, created_at, model, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (logsError) {
      console.error('Error fetching logs:', logsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch usage logs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      console.error('Error fetching users:', usersError);
    }
    const userEmailMap: Record<string, string> = {};
    if (users) {
      users.forEach((u) => { userEmailMap[u.id] = u.email ?? 'Unknown'; });
    }

    const totalsByUser: Record<string, {
      user_id: string;
      user_email: string;
      questions: number;
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
      total_tokens: number;
      cost: number;
    }> = {};

    for (const log of (logs ?? []) as Log[]) {
      const entry = totalsByUser[log.user_id] ?? {
        user_id: log.user_id,
        user_email: userEmailMap[log.user_id] ?? 'Unknown',
        questions: 0,
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        total_tokens: 0,
        cost: 0,
      };
      entry.questions += 1;
      entry.input_tokens += log.input_tokens ?? 0;
      entry.output_tokens += log.output_tokens ?? 0;
      entry.cache_creation_input_tokens += log.cache_creation_input_tokens ?? 0;
      entry.cache_read_input_tokens += log.cache_read_input_tokens ?? 0;
      entry.total_tokens = entry.input_tokens + entry.output_tokens
        + entry.cache_creation_input_tokens + entry.cache_read_input_tokens;
      entry.cost += costOf(log);
      totalsByUser[log.user_id] = entry;
    }

    const userTotals = Object.values(totalsByUser).sort((a, b) => b.total_tokens - a.total_tokens);

    const { data: rateLimit } = await supabaseAdmin
      .from('api_rate_limit_status')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const { data: settings } = await supabaseAdmin
      .from('billing_settings').select('renewal_day').eq('id', 1).maybeSingle();
    const renewalDay = settings?.renewal_day ?? 3;
    const { data: payments } = await supabaseAdmin
      .from('billing_payments').select('id, paid_on, amount, note').order('paid_on', { ascending: true });

    // One row per billing period, from the earliest question or payment to
    // today, with a running API credit balance (payments minus cost so far).
    // Questions logged before token tracking have no tokens, so cost 0.
    const allLogs = (logs ?? []) as Log[];
    const firstDates = [
      ...allLogs.map((l) => new Date(l.created_at)),
      ...(payments ?? []).map((p) => new Date(`${p.paid_on}T00:00:00Z`)),
    ];
    const periods: Array<{ start: string; end: string; questions: number; tokens: number; cost: number;
      payments: number; balance: number }> = [];
    if (firstDates.length > 0) {
      const earliest = new Date(Math.min(...firstDates.map((d) => d.getTime())));
      let balance = 0;
      for (let start = periodStart(earliest, renewalDay); start.getTime() <= Date.now();) {
        const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, renewalDay));
        const inPeriod = allLogs.filter((l) => {
          const t = new Date(l.created_at).getTime();
          return t >= start.getTime() && t < next.getTime();
        });
        const paid = (payments ?? [])
          .filter((p) => p.paid_on >= isoDay(start) && p.paid_on < isoDay(next))
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const cost = inPeriod.reduce((sum, l) => sum + costOf(l), 0);
        balance += paid - cost;
        periods.push({
          start: isoDay(start),
          end: isoDay(new Date(next.getTime() - 86_400_000)),
          questions: inPeriod.length,
          tokens: inPeriod.reduce((sum, l) => sum + tokensOf(l), 0),
          cost,
          payments: paid,
          balance,
        });
        start = next;
      }
    }

    return json({
      userTotals,
      rateLimit: rateLimit ?? null,
      billing: { renewalDay, payments: payments ?? [], periods: periods.reverse() },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
