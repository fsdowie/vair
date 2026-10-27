import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  APP_URL, EMAIL_RE, RESEND_API_KEY, accountSetupLink, corsHeaders, escapeHtml, isEnded, json,
  listAllUsers, renderActionEmail, sendEmail,
} from "../_shared/email.ts";

// Admin-only outreach emails, sent through Resend (RESEND_API_KEY) and
// logged to the outreach_emails table:
//   POST { action: "invite", emails: string[], name?: string, note?: string }
//     — invite hand-picked beta testers to try VAiR (new addresses get an
//       account and a personal "create your password" link)
//   POST { action: "remind", user_ids: string[], note?: string }
//     — nudge existing users to log back in and see what's new
//   POST { action: "list", kind: "invite" | "reminder" }
// Access requests from the public "Request access" form (request-access):
//   POST { action: "list_requests" }
//   POST { action: "activate_request", request_ids: string[] }
//     — create the account and email a link to set a password
//   POST { action: "remind_request", request_ids: string[] }
//     — re-send a fresh link to activated users who haven't signed in yet
//   POST { action: "reject_request", request_ids: string[] }
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOOTSTRAP_ADMIN_EMAIL = "fsdowie@yahoo.com";
const MAX_RECIPIENTS = 50;

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
  ctaUrl: string;
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
          <a href="${c.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#0e7a58,#1d9e75);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 34px;border-radius:10px;">
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
    `${c.ctaLabel.replace(" →", "")}: ${c.ctaUrl}`,
    "",
    c.closingTitle.replace(/^\S+\s/, "").toUpperCase(),
    c.closingText,
    "",
    "Thanks for being part of this from the start.",
    "— The VAiR team",
  ].join("\n");

  return { subject: c.subject, html, text };
}

// setupLink: a personal "create your password" link for a new account, or
// null when the address already has an account (they just sign in).
function inviteEmail(name: string | null, note: string | null, setupLink: string | null) {
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
    ctaUrl: setupLink ?? APP_URL,
    ctaSub: setupLink
      ? "Your account is ready — the button takes you straight to creating your password."
      : `Sign in at ${APP_URL.replace(/^https?:\/\//, "")} with your existing account.`,
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
    ctaUrl: APP_URL,
    ctaSub: `Sign in at ${APP_URL.replace(/^https?:\/\//, "")} with your existing account.`,
    closingTitle: "🗣️ Tell us what you think",
    closing: `Try building a report from your last game or throw a tricky scenario at the AI Referee, then
              <strong style="color:#ffffff;">reply to this email</strong> with what works and what doesn't —
              every message is read personally.`,
    closingText: "Try building a report from your last game or throw a tricky scenario at the AI Referee, then reply to this email with what works and what doesn't.",
  });
}

// Sent when an admin activates an access request (and, as a reminder, to
// activated users who haven't signed in yet).
function accountEmail(firstName: string, link: string, reminder: boolean) {
  const greeting = `Hi ${escapeHtml(firstName)},`;
  return reminder
    ? renderActionEmail({
      subject: "Your VAiR account is waiting for you",
      greeting,
      headline: "You haven't connected to VAiR yet — your account is ready whenever you are.",
      body: `Just a quick reminder: your access request was approved, but you haven't signed in yet.
             Click below to create your password and start asking the AI Referee your toughest calls.
             We've sent you a fresh link — it works once and expires soon.`,
      bodyText: "Just a quick reminder: your access request was approved, but you haven't signed in yet. Use the link below to create your password. We've sent you a fresh link — it works once and expires soon.",
      ctaLabel: "Create your password →",
      ctaUrl: link,
      footnote: "Questions? Just reply to this email.<br>— The VAiR team",
    })
    : renderActionEmail({
      subject: "Your VAiR access is approved",
      greeting,
      headline: "Welcome to VAiR — your account is ready.",
      body: `Thanks for requesting access. Click below to create your password, then you're in:
             instant, citable rulings on the Laws of the Game, misconduct reports in a few taps, and more.
             The link works once and expires soon — if it's expired, use <strong style="color:#ffffff;">Forgot password?</strong>
             on the login page to get a new one.`,
      bodyText: "Thanks for requesting access. Use the link below to create your password, then you're in. The link works once and expires soon — if it's expired, use \"Forgot password?\" on the login page to get a new one.",
      ctaLabel: "Create your password →",
      ctaUrl: link,
      footnote: "Questions? Just reply to this email.<br>— The VAiR team",
    });
}

type AccessRequest = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  user_id: string | null;
  activated_at: string | null;
  email_count: number;
};

async function handleRequests(
  admin: SupabaseClient,
  caller: { id: string; email?: string },
  action: string,
  rawIds: unknown,
) {
  const ids: string[] = Array.from(new Set(Array.isArray(rawIds) ? rawIds.map(String) : []));
  if (ids.length === 0) throw new Error("No requests selected");
  if (ids.length > MAX_RECIPIENTS) throw new Error(`Select at most ${MAX_RECIPIENTS} requests at a time`);

  const { data: rows, error } = await admin.from("access_requests").select("*").in("id", ids);
  if (error) throw new Error(error.message);
  const requests = (rows ?? []) as AccessRequest[];

  if (action === "reject_request") {
    const pendingIds = requests.filter((r) => r.status === "pending").map((r) => r.id);
    if (pendingIds.length) {
      const { error: updErr } = await admin.from("access_requests").update({ status: "rejected" }).in("id", pendingIds);
      if (updErr) throw new Error(updErr.message);
    }
    return requests.map((r) => ({
      email: r.email,
      ok: r.status === "pending",
      error: r.status === "pending" ? null : `Already ${r.status}`,
    }));
  }

  const reminder = action === "remind_request";
  const usersByEmail = new Map((await listAllUsers(admin)).map((u) => [u.email?.toLowerCase(), u]));

  return await Promise.all(requests.map(async (r) => {
    try {
      if (reminder && r.status !== "activated") throw new Error("Not activated yet");
      if (!reminder && r.status === "activated") throw new Error("Already activated — use Remind to re-send");
      const existing = usersByEmail.get(r.email) ?? null;
      if (existing && isEnded(existing)) throw new Error("Account is end-dated");
      if (reminder && existing?.last_sign_in_at) throw new Error("Already signed in");

      const { user, link } = await accountSetupLink(
        admin, r.email, { first_name: r.first_name, last_name: r.last_name }, existing,
      );
      const result = await sendEmail(r.email, accountEmail(r.first_name, link, reminder), caller.email);

      const now = new Date().toISOString();
      await admin.from("access_requests").update({
        status: "activated",
        user_id: user.id,
        ...(r.activated_at ? {} : { activated_at: now, activated_by: caller.id }),
        ...(result.ok ? { last_emailed_at: now, email_count: (r.email_count ?? 0) + 1 } : {}),
      }).eq("id", r.id);

      await admin.from("outreach_emails").insert({
        kind: reminder ? "access_reminder" : "access_invite",
        email: r.email,
        recipient_name: `${r.first_name} ${r.last_name}`,
        sent_by: caller.id,
        status: result.ok ? "sent" : "failed",
        error: result.error,
      });
      return result;
    } catch (err) {
      return { email: r.email, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }));
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

    if (body.action === "list_requests") {
      const { data, error } = await supabaseAdmin
        .from("access_requests")
        .select("id, first_name, last_name, email, status, user_id, created_at, activated_at, last_emailed_at, email_count")
        .neq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      // "Connected" = the account has signed in at least once.
      const users = new Map((await listAllUsers(supabaseAdmin)).map((u) => [u.id, u]));
      return json({
        requests: (data ?? []).map((r) => ({
          ...r,
          last_sign_in_at: (r.user_id && users.get(r.user_id)?.last_sign_in_at) || null,
        })),
      });
    }

    if (["activate_request", "remind_request", "reject_request"].includes(body.action)) {
      if (body.action !== "reject_request" && !RESEND_API_KEY) {
        throw new Error("Email is not configured — set the RESEND_API_KEY secret");
      }
      return json({ results: await handleRequests(supabaseAdmin, caller, body.action, body.request_ids) });
    }

    if (body.action !== "invite" && body.action !== "remind") throw new Error("Unknown action");
    if (!RESEND_API_KEY) throw new Error("Email is not configured — set the RESEND_API_KEY secret");

    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 1000) : null;
    let name: string | null = null;
    let results: { email: string; ok: boolean; error: string | null }[];

    if (body.action === "invite") {
      const recipients: string[] = Array.from(new Set(
        (Array.isArray(body.emails) ? body.emails : [])
          .map((e: unknown) => String(e).trim().toLowerCase())
          .filter(Boolean),
      ));
      const invalid = recipients.filter((e) => !EMAIL_RE.test(e));
      if (invalid.length) throw new Error(`Invalid email(s): ${invalid.join(", ")}`);
      if (recipients.length === 0) throw new Error("No valid recipients");
      if (recipients.length > MAX_RECIPIENTS) throw new Error(`Send to at most ${MAX_RECIPIENTS} people at a time`);
      // A name only makes sense for a single recipient.
      name = recipients.length === 1 && typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 100)
        : null;

      // Self-service signup is gone, so new testers get an account and a
      // personal link to create their password; existing users just sign in.
      const usersByEmail = new Map((await listAllUsers(supabaseAdmin)).map((u) => [u.email?.toLowerCase(), u]));
      results = await Promise.all(recipients.map(async (to) => {
        try {
          const setupLink = usersByEmail.has(to)
            ? null
            : (await accountSetupLink(supabaseAdmin, to, name ? { first_name: name } : {}, null)).link;
          return await sendEmail(to, inviteEmail(name, note, setupLink), caller.email);
        } catch (err) {
          return { email: to, ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }));
    } else {
      const ids: string[] = Array.from(new Set(Array.isArray(body.user_ids) ? body.user_ids.map(String) : []));
      // Resolve addresses server-side; skip end-dated (banned) accounts.
      const lookups = await Promise.all(ids.map((id) => supabaseAdmin.auth.admin.getUserById(id)));
      const recipients = lookups
        .map((r) => r.data?.user)
        .filter((u) => u?.email && !isEnded(u))
        .map((u) => u!.email!.toLowerCase());
      if (recipients.length === 0) throw new Error("No valid recipients");
      if (recipients.length > MAX_RECIPIENTS) throw new Error(`Send to at most ${MAX_RECIPIENTS} people at a time`);
      const email = reminderEmail(note);
      // One email per recipient so nobody sees anyone else's address.
      results = await Promise.all(recipients.map((to) => sendEmail(to, email, caller.email)));
    }

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
