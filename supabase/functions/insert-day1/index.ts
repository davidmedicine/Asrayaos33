// deno-lint-ignore-file
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { log } from "../_shared/logger.ts";
import {
  getOrCreateFirstFlameProgress,
  isValidUuid,
} from "../_shared/db/firstFlame.ts";

/* ───────── CONFIG ───────── */

export const config = { verify_jwt: "service_role" };

const FN       = "insert-day1";
const SB_URL   = Deno.env.get("SUPABASE_URL")               ?? "";
const SB_SVC   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DEBUG_FN = Deno.env.get("DEBUG_INSERT_DAY1") === "true";

if (!SB_URL || !SB_SVC) {
  console.error(`[${FN}] Missing env vars → SUPABASE_URL=${!!SB_URL}, SUPABASE_SERVICE_ROLE_KEY=${!!SB_SVC}`);
}

const json = (d: unknown, s = 200): Response =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ───────── HANDLER ───────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST")    return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  if (!SB_URL || !SB_SVC) {
    log("ERROR", "Missing env vars at runtime", null, FN, true);
    return json({ error: "SERVER_CONFIGURATION_ERROR" }, 500);
  }

  /* body */
  let body: { user_id?: string; quest_id?: string };
  try { body = await req.json(); } catch { return json({ error: "INVALID_JSON" }, 400); }

  const { user_id, quest_id } = body;
  if (!user_id || !quest_id) return json({ error: "MISSING_FIELDS" }, 400);
  if (!isValidUuid(user_id))  return json({ error: "INVALID_USER_ID" }, 400);

  /* client */
  const sb = createClient(SB_URL, SB_SVC, {
    auth: { persistSession: false },
    db  : { schema: "ritual" },
  });

  /* flame_progress → get validated uuid */
  const { ok, error: progressErr, row } =
    await getOrCreateFirstFlameProgress(sb, user_id, quest_id);
  if (!ok) return json({ error: "FLAME_PROGRESS_ERROR", details: progressErr }, 500);
  const quest_uuid = row?.quest_id ?? quest_id;

  /* log intent */
  log("INFO", "Upserting Day-1 system message", {
    quest_uuid,
    user_id,
    questIdIsUuid: isValidUuid(quest_uuid),
  }, FN, DEBUG_FN);

  /* upsert */
  let res;
  try {
    res = await sb
      .schema("ritual")
      .from("messages")
      .upsert(
        [{
          quest_id : quest_uuid,
          user_id,
          author_id: "oracle-system",   // 🔄 TODO: use UUID or make column text
          role     : "system",
          content  : "Welcome to Day 1. Describe a truth you have never spoken aloud.",
        }],
        {
          onConflict      : "quest_id,user_id,role,author_id,content",
          ignoreDuplicates: true,
          count           : "exact",
        },
      );
  } catch (err) {
    log("ERROR", "MESSAGE_UPSERT_EXCEPTION", err, FN, true);
    return json({ error: "MESSAGE_UPSERT_EXCEPTION", details: String(err) }, 500);
  }

  const { error: upErr, count } = res;
  if (upErr && upErr.code !== "23505") {            // non-duplicate
    // Safely log the error properties individually to avoid stringification issues
    log("ERROR", "MESSAGE_UPSERT_ERROR_RAW", {
      message: upErr?.message || "No message",
      code: upErr?.code || "No code",
      details: upErr?.details || "No details",
      hint: upErr?.hint || "No hint",
      column: upErr?.column || "No column",
      table: upErr?.table || "No table",
      schema: upErr?.schema || "No schema",
      toString: String(upErr)
    }, FN, true);
    return json({
      error  : "MESSAGE_UPSERT_ERROR",
      code   : upErr.code,
      message: upErr.message,
      detail : upErr.detail,
      hint   : upErr.hint,
      column : upErr.column,
      table  : upErr.table,
      schema : upErr.schema,
    }, 500);
  }
  if (upErr?.code === "23505") {
    log("INFO", "Duplicate message → treated as success", null, FN, DEBUG_FN);
  }

  /* broadcast */
  try {
    await sb.functions.invoke("realtime-broadcast", {
      body: {
        channel: "flame_status",
        event  : "ready",
        payload: { user_id, quest_id: quest_uuid },
      },
    });
  } catch (e) {
    log("WARN", "Broadcast failed", e, FN, true);
  }

  /* success */
  return json({ note: "OK", rows: upErr?.code === "23505" ? 0 : count ?? 1 });
});
