/**********************************************************************
 * create-quest – Edge Function  (Deno)
 *********************************************************************/
import { serve } from "https://deno.land/std@0.206.0/http/server.ts";
import { createClient, type PostgrestError } from "https://esm.sh/@supabase/supabase-js@2";

//─────────────────────────────────────────────────────────────────────
// 0.  Tiny helpers
//─────────────────────────────────────────────────────────────────────
const FN = "create-quest";
const log = (lvl: "INFO" | "ERROR", msg: string, data?: unknown) =>
  data ? console[lvl === "INFO" ? "log" : "error"](`[${FN}] [${lvl}] ${msg}`, data)
       : console[lvl === "INFO" ? "log" : "error"](`[${FN}] [${lvl}] ${msg}`);

const CORS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const must = (k: string) => Deno.env.get(k) ?? (()=>{throw new Error(`Missing env ${k}`)})();

//─────────────────────────────────────────────────────────────────────
// 1.  Cold-start: env check
//─────────────────────────────────────────────────────────────────────
const SB_URL  = must("SUPABASE_URL");
const SB_ANON = must("SUPABASE_ANON_KEY");          // auth / row-level
const SB_SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // optional admin

//─────────────────────────────────────────────────────────────────────
// 2.  Handler
//─────────────────────────────────────────────────────────────────────
serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")     return new Response(JSON.stringify({ error:"method" }), { status:405, headers:CORS });

  log("INFO", "POST received");

  // 2-A Auth ----------------------------------------------------------------
  const jwt = req.headers.get("Authorization");
  if (!jwt) {
    log("ERROR", "Missing auth header");
    return new Response(JSON.stringify({ error:"auth" }), { status:401, headers:CORS });
  }
  const sb = createClient(SB_URL, SB_ANON, { global:{ headers:{ Authorization:jwt }}});
  const { data:{ user }, error:authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    log("ERROR", "Auth failed", authErr);
    return new Response(JSON.stringify({ error:"auth" }), { status:401, headers:CORS });
  }
  log("INFO", `User ${user.id}`);

  // 2-B Body  ---------------------------------------------------------------
  let body: any = {};
  try { body = await req.json(); }
  catch { log("ERROR","Bad JSON"); return new Response(JSON.stringify({ error:"json" }), { status:400, headers:CORS }); }

  if (!body?.name?.trim()) {
    log("ERROR","Missing name");
    return new Response(JSON.stringify({ error:"name" }), { status:400, headers:CORS });
  }
  const title = body.name.trim();
  log("INFO", "Name OK:", title);

  // 2-C  DB call  -----------------------------------------------------------
  // Call your SECURITY DEFINER RPC (preferred)
  const { data:rows, error:rpcErr } = await sb.rpc(
    "create_new_quest_with_participant",
    { p_title:title, p_type:"agent", p_realm:"oracle_hub", p_creator_id:user.id },
  );

  if (rpcErr) {
    const e = rpcErr as PostgrestError;
    log("ERROR","RPC failed", e);          //  ❗ shows code / message in logs
    return new Response(JSON.stringify({ error:"rpc", ...e }), { status:500, headers:CORS });
  }
  if (!rows?.length) {
    log("ERROR","RPC returned 0 rows");
    return new Response(JSON.stringify({ error:"empty" }), { status:500, headers:CORS });
  }

  const q = rows[0];
  const payload = {
    id: q.id,
    name: q.title,
    type: q.type,
    timestamp: q.created_at,
    lastMessagePreview: "",
    unreadCount: 0,
    agentId: q.agent_id ?? null,
    realm: q.realm,
    isPinned: false,
  };
  log("INFO","Quest created", payload.id);
  return new Response(JSON.stringify(payload), { status:201, headers:CORS });
});
