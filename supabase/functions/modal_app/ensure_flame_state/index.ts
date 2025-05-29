// supabase/functions/modal_app/ensure_flame_state/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../../_shared/cors.ts";
import { getOrCreateFirstFlameProgress } from "../../_shared/db/firstFlame.ts";
import { log } from "../../_shared/logger.ts";

/** This function should be callable ONLY with a service-role JWT */
export const config = { verify_jwt: "service_role" };

const FN = "ensure-flame-state";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEBUG = Deno.env.get(`DEBUG_${FN.toUpperCase().replace(/-/g, "_")}`) === "true";

Deno.serve(async (req) => {
  /* ── CORS / method guard ───────────────────────── */
  if (req.method === "OPTIONS") {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
  
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    /* ── Parse body ────────────────────────────────── */
    let body: { user_id?: string; quest_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "INVALID_JSON" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { user_id, quest_id } = body;
    if (!user_id || !quest_id) {
      return new Response(JSON.stringify({ error: "MISSING_FIELDS" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    /* ── Service-role Supabase client ──────────────── */
    const sb = createClient(SB_URL, SB_SVC, {
      auth: { persistSession: false },
      db: { schema: "ritual" },
    });

    // Log the request if in debug mode
    log("INFO", `Ensuring flame state for user ${user_id} and quest ${quest_id}`, null, FN, DEBUG);

    // Ensure the flame progress record exists
    const result = await getOrCreateFirstFlameProgress(sb, user_id, quest_id);
    
    if (!result.ok) {
      log("ERROR", `Failed to ensure flame progress: ${result.error}`, null, FN, true);
      return new Response(JSON.stringify({ error: result.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Log success details if in debug mode
    if (DEBUG) {
      log("DEBUG", `Flame progress ensured successfully: ${JSON.stringify(result)}`, null, FN, true);
    }

    return new Response(JSON.stringify({ ok: true, note: "STATE_ENSURED" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    log("ERROR", `Unexpected error: ${error.message}`, error, FN, true);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});