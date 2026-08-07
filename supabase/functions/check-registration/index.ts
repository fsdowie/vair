import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public endpoint (no user session required) — called from the signup form
// before an account exists. Supabase's signUp() intentionally stays silent
// about whether an email is already registered (anti-enumeration default),
// so the signup form checks explicitly here first.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      throw new Error("email is required");
    }
    const normalized = email.trim().toLowerCase();

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const match = (users ?? []).find((u) => u.email?.toLowerCase() === normalized);

    if (!match) {
      return new Response(JSON.stringify({ exists: false, ended: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ended = !!match.banned_until && new Date(match.banned_until) > new Date();

    return new Response(JSON.stringify({ exists: true, ended }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
