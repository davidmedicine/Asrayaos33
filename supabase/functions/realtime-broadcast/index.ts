// deno-lint-ignore-file
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/** Only service-role JWTs may call this function */
export const config = { verify_jwt: "service_role" };

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FN = "realtime-broadcast";
const DEBUG = Deno.env.get(`DEBUG_${FN.toUpperCase().replace(/-/g, "_")}`) === "true";
const DEBUG_FN = DEBUG && Deno.env.get('DEBUG_REALTIME_BROADCAST') === 'true';

const sb = createClient(SB_URL, SB_SVC);
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  /* ── CORS / method guard ───────────────────────── */
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST")
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  /* ── Parse body ────────────────────────────────── */
  let body: { channel?: string; event?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const { channel: channelName, event, payload } = body;
  if (!channelName || !event)
    return json({ error: "MISSING_FIELDS" }, 400);

  /* ── Broadcast via Supabase Realtime ───────────── */
  if (DEBUG_FN) {
    console.log(`[${FN}] Broadcasting to channel: ${channelName}, event: ${event}, payload: ${JSON.stringify(payload)}`);
  }

  const channel = sb.channel(channelName);
  const sendPromise = channel.send({ type: "broadcast", event, payload });

  const result = (await Promise.race([sendPromise, delay(5_000)])) as
    | { error: { message: string } | null }
    | undefined;

  if (!result) {
    console.error(`[${FN}] Broadcast timed out after 5s`);
    return json({ error: "TIMEOUT" }, 500);
  }
  
  if (result.error) {
    console.error(`[${FN}] Broadcast error: ${result.error.message}`);
    return json({ error: result.error.message }, 500);
  }

  if (DEBUG_FN) {
    console.log(`[${FN}] Broadcast successful to ${channelName}:${event}`);
  }

  return json({ ok: true });
});
