import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BOOTSTRAP_ADMIN_EMAIL = "fsdowie@yahoo.com";

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

    const { target_user_id, password } = await req.json();
    if (!target_user_id || !password) {
      throw new Error("target_user_id and password are required");
    }
    if (target_user_id === caller.id) {
      throw new Error("You cannot delete your own account");
    }

    const { data: { user: target }, error: targetErr } =
      await supabaseAdmin.auth.admin.getUserById(target_user_id);
    if (targetErr || !target) throw new Error("User not found");
    if (target.email === BOOTSTRAP_ADMIN_EMAIL) {
      throw new Error("Cannot delete the bootstrap admin account");
    }

    // Verify caller's password via direct Auth API call (avoids overwriting supabaseAdmin session)
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: caller.email, password }),
    });
    if (!verifyRes.ok) throw new Error("Incorrect password");

    // Cascades: profiles row and website_credentials are removed with the
    // account; games/questions_log/answer_reports keep their history and
    // just lose the user_id link (see migration 013_user_lifecycle.sql).
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
    if (deleteErr) throw new Error(deleteErr.message);

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
