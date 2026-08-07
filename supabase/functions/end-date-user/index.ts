import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BOOTSTRAP_ADMIN_EMAIL = "fsdowie@yahoo.com";

// GoTrue bans have no "indefinite" option, so a ~100 year ban stands in for one.
const PERMANENT_BAN_DURATION = "876000h";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller's JWT and get their user record
    const { data: { user: caller }, error: callerErr } =
      await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (callerErr || !caller) throw new Error("Unauthorized");

    // Check caller is an admin (bootstrap email OR profiles row)
    const isBootstrapAdmin = caller.email === BOOTSTRAP_ADMIN_EMAIL;
    if (!isBootstrapAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", caller.id)
        .single();
      if (!profile?.is_admin) throw new Error("Forbidden — not an admin");
    }

    const { target_user_id, end_dated, password } = await req.json();
    if (!target_user_id || typeof end_dated !== "boolean" || !password) {
      throw new Error("target_user_id, end_dated, and password are required");
    }
    if (target_user_id === caller.id) {
      throw new Error("You cannot end-date your own account");
    }

    const { data: { user: target }, error: targetErr } =
      await supabaseAdmin.auth.admin.getUserById(target_user_id);
    if (targetErr || !target) throw new Error("User not found");
    if (target.email === BOOTSTRAP_ADMIN_EMAIL) {
      throw new Error("Cannot end-date the bootstrap admin account");
    }

    // Verify caller's password via direct Auth API call (avoids overwriting supabaseAdmin session)
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: caller.email, password }),
    });
    if (!verifyRes.ok) throw new Error("Incorrect password");

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
      ban_duration: end_dated ? PERMANENT_BAN_DURATION : "none",
    });
    if (updateErr) throw new Error(updateErr.message);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
