// -----------------------------------------------------------------------------
//  list-quests – Edge Function  (Deno Deploy · Supabase-JS v2)
//  Returns quests as { data, serverTimestamp, error }
// -----------------------------------------------------------------------------

// deno-lint-ignore-file
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import { log } from "../_shared/logger.ts";
import { maskAuthorizationHeader } from "../_shared/jwt.ts";
import {
  initializeSentryOnce,
  captureError,
  flushSentryEvents,
} from "../_shared/sentry.ts";
import {
  ensureFirstFlameQuest,
  getOrCreateFirstFlameProgress,
  isValidUuid,
} from "../_shared/db/firstFlame.ts";
import { toISO } from "../_shared/types/index.ts";
import {
  FIRST_FLAME_SLUG,
  type TimestampISO,
} from "../_shared/5dayquest/FirstFlame.ts";

/*───────────────────  Supabase edge-function config  ──────────────────*/
/** Allow anonymous JWTs – we’ll decide locally how strict to be */
export const config = { verify_jwt: "anon" };

initializeSentryOnce();

/*────────────────────────  ENV  ──────────────────────────────*/
const FN = "list-quests";
const SB_URL  = Deno.env.get("SUPABASE_URL")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SB_SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEBUG   = Deno.env.get(`DEBUG_${FN.toUpperCase().replace(/-/g, "_")}`) === "true";
const DEBUG_FN= DEBUG && Deno.env.get("DEBUG_LIST_QUESTS") === "true";
const IS_PROD = Deno.env.get("ENV") === "production";

/*────────────────────────  Types & mappers  ───────────────────────────*/
interface QuestRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  realm: string | null;
  is_pinned: boolean | null;
  created_at: string;
  agent_id: string | null;
  last_message_preview: string | null;
  unread_count: number | null;
  community_id: string | null;
}

interface QuestPayload {
  id: string;
  slug: string;
  name: string;
  type: string;
  timestamp: TimestampISO;
  createdAt: TimestampISO;
  lastMessagePreview: string;
  unreadCount: number;
  agentId: string | null;
  realm?: string | null;
  isPinned: boolean;
  communityId?: string | null;
  isFirstFlameRitual: boolean;
}

const mapRow = (r: QuestRow): QuestPayload => ({
  id:   r.id,
  slug: r.slug,
  name: r.title,
  type: r.type,
  timestamp:  toISO(r.created_at),
  createdAt:  toISO(r.created_at),
  lastMessagePreview:
    r.last_message_preview ??
    (r.slug === FIRST_FLAME_SLUG ? "Begin your inner journey…" : "No messages yet"),
  unreadCount: r.unread_count ?? 0,
  agentId:     r.agent_id,
  realm:       r.realm ?? undefined,
  isPinned:    r.is_pinned ?? r.slug === FIRST_FLAME_SLUG,
  communityId: r.community_id ?? undefined,
  isFirstFlameRitual: r.slug === FIRST_FLAME_SLUG,
});

/*────────────────────────  Helpers  ────────────────────────────────*/
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 
      ...corsHeaders,
      "Content-Type": "application/json",
      // downstream clients & logs can link every hop
      "x-request-id": (body as any)?.requestId ?? "n/a",
    },
  });

/*────────────────────────  Handler  ──────────────────────────────*/
Deno.serve(async (req) => {
  const started   = Date.now();
  const requestId = crypto.randomUUID();

  if (req.method === "OPTIONS") return json({ ok: true, requestId });

  if (!["GET", "POST"].includes(req.method))
    return json({ error: "METHOD_NOT_ALLOWED", requestId }, 405);

  /*── Authorisation header selection ───────────────────────────*/
  const rawAuth   = req.headers.get("Authorization") ?? "";
  const devAltAuth= req.headers.get("X-Authorization") ?? "";
  const authHdr   =
    rawAuth.startsWith("Bearer ")
      ? rawAuth
      : !IS_PROD && devAltAuth.startsWith("Bearer ")
        ? devAltAuth
        : "";

  if (!authHdr) {
    return json({ error: "MISSING_AUTH_HEADER", requestId }, 401);
  }

  /*── Clients ──────────────────────────────────────────────────*/
  const sbUser  = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: authHdr } },
    auth:   { persistSession: false },
    db:     { schema: "ritual" },
  });
  const sbAdmin = createClient(SB_URL, SB_SVC, {
    auth: { persistSession: false },
    db:   { schema: "ritual" },
  });

  try {
    /*── Resolve user ──────────────────────────────────────────*/
    const { data: { user }, error: authErr } = await sbUser.auth.getUser();
    if (authErr || !user?.id) {
      return json({ error: "AUTH", requestId }, 401);
    }
    const userId = user.id;

    /*──────────────── Ensure First-Flame artefacts ───────────*/
    // We’ll only touch the DB if caller *doesn’t* already have the quest,
    // which we check after the first query.
    const firstFlameQuestIdPromise = ensureFirstFlameQuest(sbAdmin)
      .then((q) => q.id)
      .catch((e) => { log("ERROR", e.message, null, FN, true); return null; });

    /*──────────────── Fetch all quests  ──────────────────────*/
    const { data, error: qErr } = await sbUser
      .from("quests")
      .select(
        `id, slug, title, type, realm, is_pinned, created_at,
         agent_id, last_message_preview, unread_count, community_id`,
      )
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (qErr) throw qErr;

    const rows = (data as QuestRow[]).map(mapRow);

    /*──────────────── Conditionally create participant/progress ─────────*/
    if (!rows.some((q) => q.slug === FIRST_FLAME_SLUG)) {
      const questId = await firstFlameQuestIdPromise; // already kicked off
      if (questId && isValidUuid(userId)) {
        await sbAdmin.from("quest_participants").upsert(
          { quest_id: questId, user_id: userId, role: "participant" },
          { onConflict: "quest_id,user_id", ignoreDuplicates: true },
        );
        await getOrCreateFirstFlameProgress(sbAdmin, userId, questId);
      }
    }

    /*──────────────── Response  ──────────────────────────────*/
    const body = {
      data: rows,
      serverTimestamp: new Date().toISOString() as TimestampISO,
      requestId,
    };
    if (DEBUG_FN) {
      log("DEBUG", `→ ${rows.length} quests [${requestId}]`, null, FN, true);
    }
    return json(body);
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    captureError(e, { context: FN, requestId, auth: maskAuthorizationHeader(authHdr) });
    log("ERROR", e.message, { stack: e.stack, requestId }, FN, true);

    const status =
      (e as any).status && (e as any).status >= 400 && (e as any).status < 600
        ? (e as any).status
        : 500;

    return json(
      {
        error: (e as any).code ?? "SERVER_ERROR",
        message: e.message || "Unknown server error",
        requestId,
      },
      status,
    );
  } finally {
    await flushSentryEvents(400);
    if (DEBUG) {
      log(
        "DEBUG",
        `done in ${Date.now() - started} ms [${requestId}]`,
        null,
        FN,
        true,
      );
    }
  }
});
