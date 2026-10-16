import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin-only: emails hand-picked beta testers an invitation to try VAiR,
// and lists past invites. Mail goes out through Resend (RESEND_API_KEY);
// every attempt is logged to the test_invites table.
//   POST { action: "send", emails: string[], name?: string, note?: string }
//   POST { action: "list" }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("INVITE_FROM_EMAIL") ?? "VAiR <invites@vaireferee.com>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://vaireferee.com";
const BOOTSTRAP_ADMIN_EMAIL = "fsdowie@yahoo.com";
const MAX_RECIPIENTS = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES: { emoji: string; title: string; text: string }[] = [
  {
    emoji: "🤖",
    title: "AI Referee — instant, citable rulings",
    text: "Describe any match incident in plain words (or just say it out loud) and get a decisive answer grounded in the IFAB Laws of the Game 2026/27, with the exact Law cited and VAR implications flagged.",
  },
  {
    emoji: "📋",
    title: "Misconduct Report Builder",
    text: "Tap the spot on the pitch, pick the offence, add a one-line description — VAiR writes a complete, professionally worded misconduct report ready to paste into your assignor's site.",
  },
  {
    emoji: "📅",
    title: "Games Organizer",
    text: "Every upcoming and past assignment in one place. Upload your games or add them manually — no more chasing spreadsheets.",
  },
  {
    emoji: "🚩",
    title: "Flag & Improve",
    text: "Disagree with a ruling? Flag it in one tap. Every report is reviewed and you're notified of the outcome.",
  },
];

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function buildEmail(name: string | null, note: string | null, inviterEmail: string) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";
  const subject = "You've been hand-picked to test VAiR — the AI assistant referee";

  const featureRows = FEATURES.map((f) => `
          <tr>
            <td style="padding:0 0 18px 0;vertical-align:top;width:40px;font-size:24px;line-height:1;">${f.emoji}</td>
            <td style="padding:0 0 18px 0;vertical-align:top;">
              <div style="font-size:15px;font-weight:700;color:#5ecda4;margin-bottom:4px;">${f.title}</div>
              <div style="font-size:14px;line-height:1.55;color:#c9dccd;">${f.text}</div>
            </td>
          </tr>`).join("");

  const noteBlock = note
    ? `
          <tr><td style="padding:0 32px 24px 32px;">
            <div style="border-left:3px solid #1d9e75;background:rgba(29,158,117,0.10);padding:14px 18px;border-radius:6px;font-size:14px;line-height:1.6;color:#e8f5e9;font-style:italic;">
              ${escapeHtml(note).replace(/\n/g, "<br>")}
            </div>
          </td></tr>`
    : "";

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#06101d;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06101d;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0d2137;border:1px solid rgba(29,158,117,0.3);border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0a1e0f,#0e7a58);padding:32px;text-align:center;">
          <div style="font-size:40px;line-height:1;margin-bottom:10px;">⚽</div>
          <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">VAiR</div>
          <div style="font-size:13px;color:#bfe8d6;margin-top:4px;">Video Assistant Intelligence Referee</div>
        </td></tr>

        <tr><td style="padding:32px 32px 8px 32px;color:#e8f5e9;">
          <div style="font-size:16px;margin-bottom:16px;">${greeting}</div>
          <div style="font-size:20px;font-weight:700;color:#ffffff;line-height:1.35;margin-bottom:16px;">
            You're one of a small group of officials we've personally chosen to get early access to VAiR.
          </div>
          <div style="font-size:15px;line-height:1.65;color:#c9dccd;margin-bottom:24px;">
            We didn't open this up to everyone — we picked people whose judgement on the pitch we trust.
            VAiR is an AI assistant referee built to settle tough calls in seconds and take the paperwork
            off your plate after the final whistle. Before we launch more widely, we want <strong style="color:#ffffff;">your</strong>
            honest eye on it.
          </div>
        </td></tr>
${noteBlock}
        <tr><td style="padding:0 32px 8px 32px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1d9e75;margin-bottom:18px;">What you can do with VAiR</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${featureRows}
          </table>
        </td></tr>

        <tr><td align="center" style="padding:8px 32px 28px 32px;">
          <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#0e7a58,#1d9e75);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 34px;border-radius:10px;">
            Claim your early access →
          </a>
          <div style="font-size:12px;color:#7f9a88;margin-top:10px;">Sign up free at ${APP_URL.replace(/^https?:\/\//, "")} with this email address.</div>
        </td></tr>

        <tr><td style="padding:0 32px 32px 32px;">
          <div style="background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.25);border-radius:12px;padding:20px 22px;">
            <div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:8px;">🗣️ Your feedback shapes what comes next</div>
            <div style="font-size:14px;line-height:1.6;color:#c9dccd;">
              Throw your hardest scenarios at it, build a misconduct report from your last game, and tell us
              what's brilliant and what's off. Just <strong style="color:#ffffff;">reply to this email</strong> —
              every message is read personally — or use the 🚩 flag on any answer inside the app.
              Testers who help shape VAiR now will be the first to see what we build next.
            </div>
          </div>
        </td></tr>

        <tr><td style="padding:20px 32px;border-top:1px solid rgba(29,158,117,0.2);font-size:12px;color:#7f9a88;line-height:1.5;text-align:center;">
          Thanks for being part of this from the start.<br>— The VAiR team
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    "You're one of a small group of officials we've personally chosen to get early access to VAiR — an AI assistant referee built to settle tough calls in seconds and take the paperwork off your plate after the final whistle. Before we launch more widely, we want your honest eye on it.",
    ...(note ? ["", note] : []),
    "",
    "WHAT YOU CAN DO WITH VAiR",
    ...FEATURES.map((f) => `- ${f.title}: ${f.text}`),
    "",
    `Claim your early access: ${APP_URL} (sign up free with this email address)`,
    "",
    "YOUR FEEDBACK SHAPES WHAT COMES NEXT",
    "Throw your hardest scenarios at it, build a misconduct report from your last game, and tell us what's brilliant and what's off. Just reply to this email, or use the flag on any answer inside the app.",
    "",
    "Thanks for being part of this from the start.",
    "— The VAiR team",
  ].join("\n");

  return { subject, html, text, replyTo: inviterEmail };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerErr } =
      await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (callerErr || !caller) throw new Error("Unauthorized");

    if (caller.email !== BOOTSTRAP_ADMIN_EMAIL) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", caller.id)
        .single();
      if (!profile?.is_admin) throw new Error("Forbidden — not an admin");
    }

    const body = await req.json();

    if (body.action === "list") {
      const { data, error } = await supabaseAdmin
        .from("test_invites")
        .select("id, email, recipient_name, status, error, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return json({ invites: data ?? [] });
    }

    if (body.action !== "send") throw new Error("Unknown action");
    if (!RESEND_API_KEY) throw new Error("Email is not configured — set the RESEND_API_KEY secret");

    const emails: string[] = Array.from(new Set(
      (Array.isArray(body.emails) ? body.emails : [])
        .map((e: unknown) => String(e).trim().toLowerCase())
        .filter(Boolean),
    ));
    if (emails.length === 0) throw new Error("At least one email is required");
    if (emails.length > MAX_RECIPIENTS) throw new Error(`Send at most ${MAX_RECIPIENTS} invites at a time`);
    const invalid = emails.filter((e) => !EMAIL_RE.test(e));
    if (invalid.length) throw new Error(`Invalid email(s): ${invalid.join(", ")}`);

    // A name only makes sense for a single recipient.
    const name = emails.length === 1 && typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 100)
      : null;
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 1000) : null;
    const email = buildEmail(name, note, caller.email!);

    // One email per recipient so testers never see each other's addresses.
    const results = await Promise.all(emails.map(async (to) => {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [to],
            reply_to: email.replyTo,
            subject: email.subject,
            html: email.html,
            text: email.text,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return { email: to, ok: false, error: `Resend ${res.status}: ${errText.slice(0, 300)}` };
        }
        return { email: to, ok: true, error: null };
      } catch (err) {
        return { email: to, ok: false, error: String(err) };
      }
    }));

    await supabaseAdmin.from("test_invites").insert(results.map((r) => ({
      email: r.email,
      recipient_name: name,
      personal_note: note,
      invited_by: caller.id,
      status: r.ok ? "sent" : "failed",
      error: r.error,
    })));

    return json({ results });
  } catch (err) {
    return json({ error: String(err) }, 400);
  }
});
