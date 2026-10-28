import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { APP_URL, EMAIL_RE, corsHeaders, findUserByEmail, isEnded, json, renderActionEmail, sendEmail } from "../_shared/email.ts";

// Public endpoint behind "Forgot password?" on the login form. Generates a
// Supabase recovery link and sends it through Resend (rather than
// resetPasswordForEmail(), which depends on the project's auth mailer).
// Clicking the link signs the user in with a PASSWORD_RECOVERY event, which
// RefereeLLM.jsx turns into its "Set a new password" screen.
//   POST { email, redirect_to? } → always { ok: true }, so it can't be used
//   to probe which addresses have accounts. redirect_to lets the mobile app
//   send the link back into itself (vairreferee://reset-password); only the
//   app's scheme, Expo Go (exp://) or the website are accepted, and Supabase's
//   Redirect URLs allowlist still applies on top (falling back to Site URL).
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const THROTTLE_MS = 2 * 60 * 1000;
// Trailing "/" so e.g. https://vaireferee.com.evil.com doesn't match.
const ALLOWED_REDIRECT_PREFIXES = [`${APP_URL}/`, "vairreferee://", "exp://"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email: rawEmail, redirect_to: rawRedirect } = await req.json();
    const redirectTo = typeof rawRedirect === "string" &&
        ALLOWED_REDIRECT_PREFIXES.some((prefix) => rawRedirect.startsWith(prefix))
      ? rawRedirect
      : APP_URL;
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) throw new Error("Please enter a valid email address");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const user = await findUserByEmail(supabaseAdmin, email);
    if (!user || isEnded(user)) return json({ ok: true });

    // One reset email per address every couple of minutes.
    const { data: recent } = await supabaseAdmin
      .from("outreach_emails")
      .select("id")
      .eq("kind", "password_reset")
      .eq("email", email)
      .gte("created_at", new Date(Date.now() - THROTTLE_MS).toISOString())
      .limit(1);
    if (recent && recent.length > 0) return json({ ok: true });

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    if (linkErr) throw new Error(linkErr.message);

    const result = await sendEmail(email, renderActionEmail({
      subject: "Reset your VAiR password",
      greeting: "Hi there,",
      headline: "Let's get you back in.",
      body: `Someone (hopefully you) asked to reset the password for your VAiR account.
             Click the button below to choose a new one. The link works once and expires soon.`,
      bodyText: "Someone (hopefully you) asked to reset the password for your VAiR account. Use the link below to choose a new one. The link works once and expires soon.",
      ctaLabel: "Choose a new password →",
      ctaUrl: link.properties.action_link,
      footnote: "Didn't ask for this? You can ignore this email — your password won't change.",
    }));

    await supabaseAdmin.from("outreach_emails").insert({
      kind: "password_reset",
      email,
      status: result.ok ? "sent" : "failed",
      error: result.error,
    });
    if (!result.ok) console.error("Password reset email failed:", result.error);

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
