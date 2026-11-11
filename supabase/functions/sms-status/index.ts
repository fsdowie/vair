import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Twilio StatusCallback for messages sent by send-sms. Public (Twilio calls
// it), so every request must carry a valid X-Twilio-Signature made with our
// auth token. Updates sms_messages.status / error by MessageSid.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
// Must be exactly the StatusCallback URL send-sms gives Twilio — the
// signature covers it (req.url inside the function is an internal URL).
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/sms-status`;

// Callbacks can arrive out of order; never move a message backwards.
const RANK: Record<string, number> = {
  accepted: 1, scheduled: 2, queued: 3, sending: 4, sent: 5,
  delivered: 6, undelivered: 6, failed: 6, canceled: 6, read: 7,
};

const ERROR_HINTS: Record<string, string> = {
  "21610": "Recipient replied STOP — they've opted out",
  "30003": "Phone unreachable or switched off",
  "30005": "Unknown or inactive number",
  "30006": "Landline or number that can't receive texts",
  "30007": "Blocked by the carrier as spam",
  "30032": "Toll-free number not verified yet",
  "30034": "Number not registered for A2P 10DLC yet",
};

async function validSignature(signature: string, params: URLSearchParams) {
  if (!TWILIO_AUTH_TOKEN || !signature) return false;
  const data = CALLBACK_URL + [...params.keys()].sort().map((k) => k + params.get(k)).join("");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(TWILIO_AUTH_TOKEN), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  const expected = btoa(String.fromCharCode(...mac));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const params = new URLSearchParams(await req.text());
  if (!(await validSignature(req.headers.get("X-Twilio-Signature") ?? "", params))) {
    return new Response("Invalid signature", { status: 403 });
  }

  const sid = params.get("MessageSid");
  const status = params.get("MessageStatus");
  if (!sid || !status) return new Response("", { status: 204 });

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row } = await db.from("sms_messages").select("id, status").eq("twilio_sid", sid).maybeSingle();
  if (row && (RANK[status] ?? 0) >= (RANK[row.status] ?? 0)) {
    const code = params.get("ErrorCode");
    await db.from("sms_messages").update({
      status,
      error: code ? (ERROR_HINTS[code] ?? `Twilio error ${code}`) : null,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
  }

  return new Response("", { status: 204 });
});
