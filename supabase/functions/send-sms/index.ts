import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/email.ts";

// Admin-only text-message invites ("Invite by text" on the Admin panel),
// logged to the sms_messages table:
//   POST { action: "config" }
//     → { twilio: boolean } — whether the Twilio secrets are set
//   POST { action: "send", recipients: { phone, name?, body }[], send_at?: ISO string }
//     — send now, or schedule (15 min – 35 days ahead) through Twilio
//   POST { action: "cancel", id }      — cancel a scheduled Twilio message
//   POST { action: "log_manual", phone, name?, body }
//     — the admin texted it from their own phone; just record it
//   POST { action: "list" }            — latest 200 messages
//
// Secrets (supabase secrets set ...):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID
// Delivery updates arrive at the sms-status function (Twilio StatusCallback).
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
const BOOTSTRAP_ADMIN_EMAIL = "fsdowie@yahoo.com";
const MAX_RECIPIENTS = 50;
const PHONE_RE = /^\+\d{8,15}$/;
const STATUS_CALLBACK = `${SUPABASE_URL}/functions/v1/sms-status`;

const twilioConfigured = () =>
  Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_MESSAGING_SERVICE_SID);

async function twilio(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // e.g. 21610 = recipient replied STOP; 21211 = invalid number
    throw new Error(data?.message ? `${data.message}${data.code ? ` (Twilio ${data.code})` : ""}` : `Twilio HTTP ${res.status}`);
  }
  return data;
}

const cleanBody = (v: unknown) => String(v ?? "").trim().slice(0, 640);
const cleanName = (v: unknown) => String(v ?? "").trim().slice(0, 100) || null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerErr } =
      await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (callerErr || !caller) throw new Error("Unauthorized");

    if (caller.email !== BOOTSTRAP_ADMIN_EMAIL) {
      const { data: profile } = await db.from("profiles").select("is_admin").eq("id", caller.id).single();
      if (!profile?.is_admin) throw new Error("Forbidden — not an admin");
    }

    const body = await req.json();

    if (body.action === "config") {
      if (!twilioConfigured()) return json({ twilio: false });
      // Check the keys actually work: list the Messaging Service's numbers and
      // each toll-free number's verification status.
      const auth = { "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}` };
      try {
        const res = await fetch(
          `https://messaging.twilio.com/v1/Services/${TWILIO_MESSAGING_SERVICE_SID}/PhoneNumbers?PageSize=20`,
          { headers: auth },
        );
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) return json({ twilio: true, ok: false, problem: "Twilio rejected the Account SID / Auth Token — check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN." });
        if (res.status === 404) return json({ twilio: true, ok: false, problem: "Messaging Service not found — check TWILIO_MESSAGING_SERVICE_SID (it starts with MG)." });
        if (!res.ok) return json({ twilio: true, ok: false, problem: data?.message ?? `Twilio HTTP ${res.status}` });

        const numbers = await Promise.all((data.phone_numbers ?? []).map(async (n: { sid: string; phone_number: string }) => {
          let verification: string | null = null;
          try {
            const v = await fetch(
              `https://messaging.twilio.com/v1/Tollfree/Verifications?TollfreePhoneNumberSid=${n.sid}`,
              { headers: auth },
            );
            const vd = await v.json().catch(() => ({}));
            verification = vd?.verifications?.[0]?.status ?? null; // PENDING_REVIEW | IN_REVIEW | TWILIO_APPROVED | TWILIO_REJECTED
          } catch { /* status is optional */ }
          return { phone: n.phone_number, verification };
        }));
        if (numbers.length === 0) {
          return json({ twilio: true, ok: false, problem: "Your Messaging Service has no phone number — add your toll-free number to its Sender Pool in Twilio." });
        }
        return json({ twilio: true, ok: true, numbers });
      } catch (err) {
        return json({ twilio: true, ok: false, problem: err instanceof Error ? err.message : String(err) });
      }
    }

    if (body.action === "list") {
      const { data, error } = await db
        .from("sms_messages")
        .select("id, via, phone, recipient_name, body, status, error, send_at, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return json({ messages: data ?? [] });
    }

    if (body.action === "log_manual") {
      const phone = String(body.phone ?? "").trim();
      if (!PHONE_RE.test(phone)) throw new Error("Invalid phone number");
      const { error } = await db.from("sms_messages").insert({
        via: "manual", phone, recipient_name: cleanName(body.name), body: cleanBody(body.body),
        status: "manual", sent_by: caller.id,
      });
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (!twilioConfigured()) {
      throw new Error("Twilio isn't set up yet — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID as Supabase secrets.");
    }

    if (body.action === "cancel") {
      const { data: row } = await db.from("sms_messages").select("id, twilio_sid, status").eq("id", body.id).single();
      if (!row?.twilio_sid) throw new Error("Message not found");
      if (row.status !== "scheduled") throw new Error("Only scheduled messages can be canceled");
      await twilio(`Messages/${row.twilio_sid}.json`, { Status: "canceled" });
      await db.from("sms_messages").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("id", row.id);
      return json({ ok: true });
    }

    if (body.action !== "send") throw new Error("Unknown action");

    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    if (recipients.length === 0) throw new Error("No recipients");
    if (recipients.length > MAX_RECIPIENTS) throw new Error(`At most ${MAX_RECIPIENTS} at a time`);

    let sendAt: string | null = null;
    if (body.send_at) {
      const t = new Date(body.send_at).getTime();
      const now = Date.now();
      if (Number.isNaN(t)) throw new Error("Invalid schedule time");
      if (t < now + 15 * 60 * 1000) throw new Error("Scheduled texts must be at least 15 minutes from now");
      if (t > now + 35 * 24 * 60 * 60 * 1000) throw new Error("Scheduled texts can be at most 35 days ahead");
      sendAt = new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
    }

    const results = await Promise.all(recipients.map(async (r: { phone?: string; name?: string; body?: string }) => {
      const phone = String(r.phone ?? "").trim();
      const text = cleanBody(r.body);
      const name = cleanName(r.name);
      if (!PHONE_RE.test(phone)) return { phone, ok: false, error: "Invalid phone number" };
      if (!text) return { phone, ok: false, error: "Empty message" };

      const params: Record<string, string> = {
        To: phone,
        MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID!,
        Body: text,
        StatusCallback: STATUS_CALLBACK,
      };
      if (sendAt) { params.ScheduleType = "fixed"; params.SendAt = sendAt; }

      try {
        const msg = await twilio("Messages.json", params);
        await db.from("sms_messages").insert({
          via: "twilio", phone, recipient_name: name, body: text, twilio_sid: msg.sid,
          status: msg.status ?? (sendAt ? "scheduled" : "queued"), send_at: sendAt, sent_by: caller.id,
        });
        return { phone, ok: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await db.from("sms_messages").insert({
          via: "twilio", phone, recipient_name: name, body: text, status: "failed", error,
          send_at: sendAt, sent_by: caller.id,
        });
        return { phone, ok: false, error };
      }
    }));

    return json({ results });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
