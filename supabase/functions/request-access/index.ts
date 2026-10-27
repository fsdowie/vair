import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  APP_URL, EMAIL_RE, corsHeaders, escapeHtml, findUserByEmail, isEnded, json, renderActionEmail, sendEmail,
} from "../_shared/email.ts";

// Public endpoint (no user session) behind the "Request access" form that
// replaced self-service signup. Records a pending request in access_requests
// and notifies the VAiR inbox; an admin activates it from the Admin panel
// (send-outreach-email, action "activate_request").
//   POST { first_name, last_name, email, website? }  — website is a honeypot
//   → { status: "requested" | "pending" | "exists" | "ended" }
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFY_EMAIL = Deno.env.get("ACCESS_REQUEST_NOTIFY_EMAIL") ?? "vaireferee@gmail.com";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const firstName = clean(body.first_name, 60);
    const lastName = clean(body.last_name, 60);
    const email = clean(body.email, 254).toLowerCase();

    // Bots fill every field; people never see this one. Pretend it worked.
    if (clean(body.website, 200)) return json({ status: "requested" });

    if (!firstName || !lastName) throw new Error("First and last name are required");
    if (!EMAIL_RE.test(email)) throw new Error("Please enter a valid email address");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const existingUser = await findUserByEmail(supabaseAdmin, email);
    if (existingUser) return json({ status: isEnded(existingUser) ? "ended" : "exists" });

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("access_requests")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);

    // Already waiting on an admin — don't notify the inbox again.
    if (existing?.status === "pending") return json({ status: "pending" });

    // New request, or a previously dismissed/activated one being re-made
    // (e.g. the account was since deleted) — reset it to pending.
    const row = { first_name: firstName, last_name: lastName, email, status: "pending", created_at: new Date().toISOString() };
    const { error: writeErr } = existing
      ? await supabaseAdmin.from("access_requests").update(row).eq("id", existing.id)
      : await supabaseAdmin.from("access_requests").insert(row);
    if (writeErr) throw new Error(writeErr.message);

    const fullName = `${firstName} ${lastName}`;
    const notification = renderActionEmail({
      subject: `[VAiR] Access request from ${fullName}`,
      greeting: "New access request",
      headline: `${escapeHtml(fullName)} would like to use VAiR.`,
      body: `<strong style="color:#ffffff;">Name:</strong> ${escapeHtml(fullName)}<br>
             <strong style="color:#ffffff;">Email:</strong> ${escapeHtml(email)}<br><br>
             Open the <strong style="color:#ffffff;">Access Requests</strong> tab in the VAiR Admin panel to activate
             the account — they'll get an email with a link to create their password.`,
      bodyText: `Name: ${fullName}\nEmail: ${email}\n\nOpen the Access Requests tab in the VAiR Admin panel to activate the account.`,
      ctaLabel: "Open VAiR Admin →",
      ctaUrl: APP_URL,
      footnote: "Reply to this email to write to the requester directly.",
    });
    const sent = await sendEmail(NOTIFY_EMAIL, notification, email);
    // The request is saved either way, so it still shows in the Admin panel.
    if (!sent.ok) console.error("Access request notification failed:", sent.error);

    return json({ status: "requested" });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
