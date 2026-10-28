// Shared Resend helpers for the edge functions that send email
// (send-outreach-email, request-access, request-password-reset).
import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
export const FROM_EMAIL = Deno.env.get("OUTREACH_FROM_EMAIL") ?? "Virtual Assistant Intelligence Referee <team@vaireferee.com>";
export const APP_URL = Deno.env.get("APP_URL") ?? "https://vaireferee.com";
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Email = { subject: string; html: string; text: string };

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export async function sendEmail(to: string, email: Email, replyTo?: string) {
  if (!RESEND_API_KEY) {
    return { email: to, ok: false, error: "Email is not configured — set the RESEND_API_KEY secret" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
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

// auth.admin.listUsers() returns one page (50 users by default), so walk
// every page — a single call silently misses users once the project grows.
export async function listAllUsers(admin: SupabaseClient): Promise<User[]> {
  const all: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) return all;
  }
}

export async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const target = email.trim().toLowerCase();
  return (await listAllUsers(admin)).find((u) => u.email?.toLowerCase() === target) ?? null;
}

export const INVITE_TTL_DAYS = 30;

export async function sha256Hex(s: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Record an invitation (see migration 018) and return the link for the
// email button: vaireferee.com/?invite=<token>, which opens a pre-filled
// "create your password" form handled by the accept-invite function. The
// account itself is only created when they submit that form.
export async function createInvitation(admin: SupabaseClient, inv: {
  email: string;
  kind: "invite" | "access_request";
  first_name?: string | null;
  last_name?: string | null;
  access_request_id?: string | null;
  invited_by: string;
}): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const { error } = await admin.from("invitations").insert({
    token_hash: await sha256Hex(token),
    email: inv.email.trim().toLowerCase(),
    first_name: inv.first_name || null,
    last_name: inv.last_name || null,
    kind: inv.kind,
    access_request_id: inv.access_request_id ?? null,
    invited_by: inv.invited_by,
    expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return `${APP_URL}/?invite=${token}`;
}

export function isEnded(user: User) {
  return !!user.banned_until && new Date(user.banned_until) > new Date();
}

// Short, single-purpose email (account link, password reset, admin
// notification) in the same look as the outreach emails.
export function renderActionEmail(c: {
  subject: string;
  greeting: string;
  headline: string;
  body: string; // trusted HTML
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
}): Email {
  const cta = c.ctaLabel && c.ctaUrl
    ? `
        <tr><td align="center" style="padding:8px 32px 28px 32px;">
          <a href="${c.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#0e7a58,#1d9e75);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 34px;border-radius:10px;">
            ${c.ctaLabel}
          </a>
        </td></tr>`
    : "";

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#06101d;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06101d;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0d2137;border:1px solid rgba(29,158,117,0.3);border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0a1e0f,#0e7a58);padding:28px;text-align:center;">
          <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">VAiR</div>
          <div style="font-size:13px;color:#bfe8d6;margin-top:4px;">Virtual Assistant Intelligence Referee</div>
        </td></tr>

        <tr><td style="padding:32px 32px 8px 32px;color:#e8f5e9;">
          <div style="font-size:16px;margin-bottom:16px;">${c.greeting}</div>
          <div style="font-size:20px;font-weight:700;color:#ffffff;line-height:1.35;margin-bottom:16px;">${c.headline}</div>
          <div style="font-size:15px;line-height:1.65;color:#c9dccd;margin-bottom:24px;">${c.body}</div>
        </td></tr>
${cta}
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(29,158,117,0.2);font-size:12px;color:#7f9a88;line-height:1.5;text-align:center;">
          ${c.footnote ?? "— The VAiR team"}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    c.greeting.replace(/&#39;/g, "'"),
    "",
    c.bodyText,
    ...(c.ctaLabel && c.ctaUrl ? ["", `${c.ctaLabel.replace(" →", "")}: ${c.ctaUrl}`] : []),
    "",
    (c.footnote ?? "— The VAiR team").replace(/<br>/g, "\n"),
  ].join("\n");

  return { subject: c.subject, html, text };
}
