import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import {
  type RitualDayNumber,
} from "../_shared/5dayquest/FirstFlame.ts";
import { loadValidateAndCacheDayDef } from "../_shared/5dayquest/flame-data-loader.ts";
import {
  ensureFirstFlameQuest,
  getOrCreateFirstFlameProgress,
} from "../_shared/db/firstFlame.ts";

const FN = "get-flame-status";
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY");
const SB_SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST" && req.method !== "GET")
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const authHdr = req.headers.get("Authorization") ?? "";
  if (!authHdr.startsWith("Bearer ")) return json({ error: "AUTH" }, 401);

  try {
    const sbUser = createClient(SB_URL!, SB_ANON!, {
      global: { headers: { Authorization: authHdr } },
      auth: { persistSession: false },
      db: { schema: "ritual" },
    });
    const sbAdmin = createClient(SB_URL!, SB_SVC!, {
      auth: { persistSession: false },
      db: { schema: "ritual" },
    });

    const { data: { user }, error: authErr } = await sbUser.auth.getUser();
    if (authErr || !user?.id) return json({ error: "AUTH" }, 401);

    const { id: questId } = await ensureFirstFlameQuest(sbAdmin);

    await getOrCreateFirstFlameProgress(sbAdmin, user.id, questId);

    const { data: progress, error: pe } = await sbUser
      .from("flame_progress")
      .select("current_day_target, is_quest_complete, last_imprint_at, updated_at")
      .eq("quest_id", questId)
      .maybeSingle();
    if (pe) throw pe;

    const overallProgress = progress ?? null;
    const day = (overallProgress?.current_day_target ?? 1) as RitualDayNumber;
    const dayDefinition = await loadValidateAndCacheDayDef(day);

    return json({
      dataVersion: Date.now(),
      overallProgress,
      dayDefinition,
    });
  } catch (err) {
    console.error(`[${FN}] error`, err);
    return json({ error: "SERVER_ERROR" }, 500);
  }
});
