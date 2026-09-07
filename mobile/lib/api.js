import { EDGE_BASE, SUPABASE_ANON_KEY } from './supabase';

// Thin wrapper around the Supabase edge functions used by the admin panel
// and chat screen. Deliberately raw fetch(), not supabase.functions.invoke()
// — the web app (src/RefereeLLM.jsx, src/Admin.jsx) already moved off
// invoke() everywhere because it can hang forever if the SDK's internal
// auth lock gets wedged, leaving screens stuck on a loading spinner with no
// way to recover. Same risk applies on native, so every call here goes
// through this one helper instead.
export async function callEdge(accessToken, path, { method = 'POST', body, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const res = await fetch(`${EDGE_BASE}/${path}${qs}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text.slice(0, 300) };
  }
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}
