import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin-only outreach emails, sent through Resend (RESEND_API_KEY) and
// logged to the outreach_emails table:
//   POST { action: "invite", emails: string[], name?: string, note?: string }
//     — invite hand-picked beta testers to try VAiR
//   POST { action: "remind", user_ids: string[], note?: string }
//     — nudge existing users to log back in and see what's new
//   POST { action: "list", kind: "invite" | "reminder" }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("OUTREACH_FROM_EMAIL") ?? "VAiR <team@vaireferee.com>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://vaireferee.com";
const BOOTSTRAP_ADMIN_EMAIL = "fsdowie@yahoo.com";
const MAX_RECIPIENTS = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Feature = { emoji: string; title: string; text: string; isNew?: boolean };

const ALL_FEATURES: Feature[] = [
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

const WHATS_NEW: Feature[] = [
  {
    emoji: "📋",
    isNew: true,
    title: "Misconduct reports from a few taps",
    text: "Just the essentials — where it happened on the pitch, the offence, the minute and one line of what you saw. VAiR turns it into a complete, professionally worded report ready to paste into your assignor's site.",
  },
  {
    emoji: "📖",
    isNew: true,
    title: "Updated for the 2026/27 Laws of the Game",
    text: "Every ruling now reflects the latest IFAB Laws, so you're studying and deciding on the rules as they stand today.",
  },
  {
    emoji: "🏆",
    isNew: true,
    title: "National 1 League rules",
    text: "Competition-specific rules for the National 1 League are built in — ask about them just like any Law.",
  },
  {
    emoji: "🎙️",
    title: "Still here: ask by voice",
    text: "Dictate a match scenario hands-free and get a ruling with the exact Law cited.",
  },
];

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

type EmailContent = {
  subject: string;
  greeting: string;
  headline: string;
  intro: string; // trusted HTML
  introText: string;
  note: string | null;
  sectionTitle: string;
  features: Feature[];
  ctaLabel: string;
  ctaSub: string;
  closingTitle: string;
  closing: string; // trusted HTML
  closingText: string;
};

function renderEmail(c: EmailContent) {
  const featureRows = c.features.map((f) => `
          <tr>
            <td style="padding:0 0 18px 0;vertical-align:top;width:40px;font-size:24px;line-height:1;">${f.emoji}</td>
            <td style="padding:0 0 18px 0;vertical-align:top;">
              <div style="font-size:15px;font-weight:700;color:#5ecda4;margin-bottom:4px;">${f.title}${f.isNew
                ? ' <span style="display:inline-block;font-size:10px;font-weight:800;letter-spacing:1px;color:#0a1628;background:#5ecda4;border-radius:999px;padding:2px 8px;vertical-align:middle;">NEW</span>'
                : ""}</div>
              <div style="font-size:14px;line-height:1.55;color:#c9dccd;">${f.text}</div>
            </td>
          </tr>`).join("");

  const noteBlock = c.note
    ? `
        <tr><td style="padding:0 32px 24px 32px;">
          <div style="border-left:3px solid #1d9e75;background:rgba(29,158,117,0.10);padding:14px 18px;border-radius:6px;font-size:14px;line-height:1.6;color:#e8f5e9;font-style:italic;">
            ${escapeHtml(c.note).replace(/\n/g, "<br>")}
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
          <div style="font-size:16px;margin-bottom:16px;">${c.greeting}</div>
          <div style="font-size:20px;font-weight:700;color:#ffffff;line-height:1.35;margin-bottom:16px;">${c.headline}</div>
          <div style="font-size:15px;line-height:1.65;color:#c9dccd;margin-bottom:24px;">${c.intro}</div>
        </td></tr>
${noteBlock}
        <tr><td style="padding:0 32px 8px 32px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1d9e75;margin-bottom:18px;">${c.sectionTitle}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${featureRows}
          </table>
        </td></tr>

        <tr><td align="center" style="padding:8px 32px 28px 32px;">
          <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#0e7a58,#1d9e75);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 34px;border-radius:10px;">
            ${c.ctaLabel}
          </a>
          <div style="font-size:12px;color:#7f9a88;margin-top:10px;">${c.ctaSub}</div>
        </td></tr>

        <tr><td style="padding:0 32px 32px 32px;">
          <div style="background:rgba(29,158,117,0.08);border:1px solid rgba(29,158,117,0.25);border-radius:12px;padding:20px 22px;">
            <div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:8px;">${c.closingTitle}</div>
            <div style="font-size:14px;line-height:1.6;color:#c9dccd;">${c.closing}</div>
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
    c.greeting.replace(/&#39;/g, "'"),
    "",
    c.introText,
    ...(c.note ? ["", c.note] : []),
    "",
    c.sectionTitle.toUpperCase(),
    ...c.features.map((f) => `- ${f.isNew ? "[NEW] " : ""}${f.title}: ${f.text}`),
    "",
    `${c.ctaLabel.replace(" →", "")}: ${APP_URL}`,
    "",
    c.closingTitle.replace(/^\S+\s/, "").toUpperCase(),
    c.closingText,
    "",
    "Thanks for being part of this from the start.",
    "— The VAiR team",
  ].join("\n");

  return { subject: c.subject, html, text };
}

function inviteEmail(name: string | null, note: string | null) {
  return renderEmail({
    subject: "You've been hand-picked to test VAiR — the AI assistant referee",
    greeting: name ? `Hi ${escapeHtml(name)},` : "Hi there,",
    headline: "You're one of a small group of officials we've personally chosen to get early access to VAiR.",
    intro: `We didn't open this up to everyone — we picked people whose judgement on the pitch we trust.
            VAiR is an AI assistant referee built to settle tough calls in seconds and take the paperwork
            off your plate after the final whistle. Before we launch more widely, we want <strong style="color:#ffffff;">your</strong>
            honest eye on it.`,
    introText: "You're one of a small group of officials we've personally chosen to get early access to VAiR — an AI assistant referee built to settle tough calls in seconds and take the paperwork off your plate after the final whistle. Before we launch more widely, we want your honest eye on it.",
    note,
    sectionTitle: "What you can do with VAiR",
    features: ALL_FEATURES,
    ctaLabel: "Claim your early access →",
    ctaSub: `Sign up free at ${APP_URL.replace(/^https?:\/\//, "")} with this email address.`,
    closingTitle: "🗣️ Your feedback shapes what comes next",
    closing: `Throw your hardest scenarios at it, build a misconduct report from your last game, and tell us
              what's brilliant and what's off. Just <strong style="color:#ffffff;">reply to this email</strong> —
              every message is read personally — or use the 🚩 flag on any answer inside the app.
              Testers who help shape VAiR now will be the first to see what we build next.`,
    closingText: "Throw your hardest scenarios at it, build a misconduct report from your last game, and tell us what's brilliant and what's off. Just reply to this email, or use the flag on any answer inside the app.",
  });
}

function reminderEmail(note: string | null) {
  return renderEmail({
    subject: "New in VAiR: misconduct reports in a few taps (and more)",
    greeting: "Hi there,",
    headline: "VAiR has grown since you last visited — come take a look.",
    intro: `You were one of the first referees to try VAiR, and your questions have helped shape it.
            We've been busy since then, and the newest features were built with officials like you in mind.
            Log in to see what's changed — it takes less than a minute to try.`,
    introText: "You were one of the first referees to try VAiR, and your questions have helped shape it. We've been busy since then — log in to see what's changed.",
    note,
    sectionTitle: "What's new",
    features: WHATS_NEW,
    ctaLabel: "Log in to VAiR →",
    ctaSub: `Sign in at ${APP_URL.replace(/^https?:\/\//, "")} with your existing account.`,
    closingTitle: "🗣️ Tell us what you think",
    closing: `Try building a report from your last game or throw a tricky scenario at the AI Referee, then
              <strong style="color:#ffffff;">reply to this email</strong> with what works and what doesn't —
              every message is read personally.`,
    closingText: "Try building a report from your last game or throw a tricky scenario at the AI Referee, then reply to this email with what works and what doesn't.",
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendOne(to: string, email: { subject: string; html: string; text: string }, replyTo: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        reply_to: replyTo,
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
      const kind = body.kind === "reminder" ? "reminder" : "invite";
      const { data, error } = await supabaseAdmin
        .from("outreach_emails")
        .select("id, email, recipient_name, status, error, created_at")
        .eq("kind", kind)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return json({ emails: data ?? [] });
    }

    if (body.action !== "invite" && body.action !== "remind") throw new Error("Unknown action");
    if (!RESEND_API_KEY) throw new Error("Email is not configured — set the RESEND_API_KEY secret");

    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 1000) : null;
    let recipients: string[];
    let name: string | null = null;
    let email: { subject: string; html: string; text: string };

    if (body.action === "invite") {
      recipients = Array.from(new Set(
        (Array.isArray(body.emails) ? body.emails : [])
          .map((e: unknown) => String(e).trim().toLowerCase())
          .filter(Boolean),
      ));
      const invalid = recipients.filter((e) => !EMAIL_RE.test(e));
      if (invalid.length) throw new Error(`Invalid email(s): ${invalid.join(", ")}`);
      // A name only makes sense for a single recipient.
      name = recipients.length === 1 && typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 100)
        : null;
      email = inviteEmail(name, note);
    } else {
      const ids: string[] = Array.from(new Set(Array.isArray(body.user_ids) ? body.user_ids.map(String) : []));
      // Resolve addresses server-side; skip end-dated (banned) accounts.
      const lookups = await Promise.all(ids.map((id) => supabaseAdmin.auth.admin.getUserById(id)));
      recipients = lookups
        .map((r) => r.data?.user)
        .filter((u) => u?.email && !(u.banned_until && new Date(u.banned_until) > new Date()))
        .map((u) => u!.email!.toLowerCase());
      email = reminderEmail(note);
    }

    if (recipients.length === 0) throw new Error("No valid recipients");
    if (recipients.length > MAX_RECIPIENTS) throw new Error(`Send to at most ${MAX_RECIPIENTS} people at a time`);

    // One email per recipient so nobody sees anyone else's address.
    const results = await Promise.all(recipients.map((to) => sendOne(to, email, caller.email!)));

    await supabaseAdmin.from("outreach_emails").insert(results.map((r) => ({
      kind: body.action === "invite" ? "invite" : "reminder",
      email: r.email,
      recipient_name: name,
      personal_note: note,
      sent_by: caller.id,
      status: r.ok ? "sent" : "failed",
      error: r.error,
    })));

    return json({ results });
  } catch (err) {
    return json({ error: String(err) }, 400);
  }
});
