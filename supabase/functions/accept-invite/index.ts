import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, findUserByEmail, isEnded, json, sha256Hex } from "../_shared/email.ts";

// Public endpoint behind the "Claim your early access" / "Create your
// password" button in Admin-sent invitations (vaireferee.com/?invite=<token>).
// Invited people are pre-approved, so submitting the form creates the
// account straight away; the page then signs them in with the new password.
//   POST { action: "lookup", token }
//     → { status: "open", email, first_name, last_name }
//     | { status: "accepted" | "exists", email }   (they should just log in)
//   POST { action: "accept", token, first_name, last_name?, phone?, password }
//     → { email }
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = clean(body.token, 200);
    if (!token) throw new Error("This invite link isn't valid.");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: invite, error: lookupErr } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("token_hash", await sha256Hex(token))
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (!invite) throw new Error("This invite link isn't valid. Please check you used the full link from the email.");
    if (invite.accepted_at) return json({ status: "accepted", email: invite.email });
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("This invite link has expired. Please reply to the invite email and we'll send you a new one.");
    }

    // Accounts made by the older invite flow exist without a password and
    // have never signed in — those can still claim their invite. Anyone who
    // has signed in before just logs in.
    const existing = await findUserByEmail(supabaseAdmin, invite.email);
    if (existing && isEnded(existing)) throw new Error("This account has been deactivated. Please contact the admin.");
    if (existing?.last_sign_in_at) return json({ status: "exists", email: invite.email });

    if (body.action === "lookup") {
      return json({ status: "open", email: invite.email, first_name: invite.first_name, last_name: invite.last_name });
    }
    if (body.action !== "accept") throw new Error("Unknown action");

    const firstName = clean(body.first_name, 60);
    const lastName = clean(body.last_name, 60);
    const phone = clean(body.phone, 40);
    const password = typeof body.password === "string" ? body.password : "";
    if (!firstName) throw new Error("Please enter your first name.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (password.length > 72) throw new Error("Password must be at most 72 characters.");

    // Claim the invitation first so a double-submit can't create two accounts.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)
      .is("accepted_at", null)
      .select("id");
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed?.length) return json({ status: "accepted", email: invite.email });

    const metadata = { first_name: firstName, ...(lastName ? { last_name: lastName } : {}), ...(phone ? { phone } : {}) };
    let userId: string;
    try {
      if (existing) {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          user_metadata: { ...existing.user_metadata, ...metadata },
        });
        if (error) throw error;
        userId = data.user.id;
      } else {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: invite.email,
          password,
          email_confirm: true,
          user_metadata: metadata,
        });
        if (error) throw error;
        userId = data.user.id;
      }
    } catch (err) {
      // Release the invitation so they can try again (e.g. a rejected password).
      await supabaseAdmin.from("invitations").update({ accepted_at: null }).eq("id", invite.id);
      throw new Error(err instanceof Error ? err.message : String(err));
    }

    await supabaseAdmin.from("invitations").update({ user_id: userId }).eq("id", invite.id);
    // Link the account to its access request (if any) so the Admin panel's
    // "Connected" column picks it up.
    await supabaseAdmin
      .from("access_requests")
      .update({ status: "activated", user_id: userId })
      .eq("email", invite.email);

    return json({ email: invite.email });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
