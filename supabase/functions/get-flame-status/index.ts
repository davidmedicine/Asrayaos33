// supabase/functions/get-flame-status/index.ts
// deno-lint-ignore-file
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import {
  FIRST_FLAME_SLUG,
  type RitualDayNumber,
  LOG_STAGES,
} from "../_shared/5dayquest/FirstFlame.ts";
import {
  getOrCreateFirstFlame,
  getOrCreateFirstFlameProgress,
  isValidUuid,
} from "../_shared/db/firstFlame.ts";
import { log } from "../_shared/logger.ts";

/* -------------------------------------------------------------------------- */
/* 1.  Config & helpers                                                       */
/* -------------------------------------------------------------------------- */
export const config = { verify_jwt: "anon" };           // client may call unauthenticated

const FN        = "get-flame-status";
const SB_URL    = Deno.env.get("SUPABASE_URL")!;
const SB_ANON   = Deno.env.get("SUPABASE_ANON_KEY")!;
const SB_SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEBUG_ALL = Deno.env.get("DEBUG_FIRST_FLAME") === "true";
const DEBUG_FN  = DEBUG_ALL || Deno.env.get(`DEBUG_${FN.toUpperCase().replace(/-/g, "_")}`) === "true";

const STALE_MS        = 60_000;                         // cache freshness window
const MAX_RETRY_MS    = Number(Deno.env.get("FLAME_MAX_RETRY_MS") ?? 15_000); // Increased from 8_000
const RETRY_DELAY_MS  = 1000;                                       // Increased from 800

/** typed JSON helper */
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Hardcoded day definitions for days 1-5
const HARDCODED_DAY_DEFS = {
  1: {
    ritualDay: 1,
    ritualStage: "ember",
    theme: "Inner Flame",
    title: "Ignition",
    subtitle: "Discovering your inner spark",
    accentColor: "#FF6B35",
    iconName: "flame",
    intention: "Connect with your inner spark and ignite your journey",
    narrativeOpening: ["Welcome to the First Flame ritual. This is a journey of self-discovery and empowerment."],
    oracleGuidance: {
      interactionPrompt: "Share something that ignites your passion or curiosity.",
      oraclePromptPreview: "What lights your inner flame?"
    },
    reflectionJourney: [{
      id: "reflection-1",
      title: "Inner Spark",
      description: "What brings you joy and energy?"
    }],
    contemplationPrompts: ["What ignites your curiosity?"],
    symbolism: ["The flame represents transformation and energy"],
    affirmation: "I am awakening to my inner power",
    narrativeClosing: ["Your journey has just begun."]
  },
  2: {
    ritualDay: 2,
    ritualStage: "spark",
    theme: "Kindling Courage",
    title: "Expansion",
    subtitle: "Growing your inner strength",
    accentColor: "#FF8C61",
    iconName: "flame",
    intention: "Cultivate courage to face challenges with resilience",
    narrativeOpening: ["As your flame grows stronger, so does your courage. Day 2 is about expanding your inner strength."],
    oracleGuidance: {
      interactionPrompt: "Share a challenge you've faced or are facing that requires courage.",
      oraclePromptPreview: "What challenge tests your courage?"
    },
    reflectionJourney: [{
      id: "reflection-2",
      title: "Courage Within",
      description: "Where do you find strength in difficult moments?"
    }],
    contemplationPrompts: ["How does courage manifest in your daily life?"],
    symbolism: ["The growing flame represents expanding courage"],
    affirmation: "My inner strength grows with each challenge",
    narrativeClosing: ["Your courage continues to build as you progress."]
  },
  3: {
    ritualDay: 3,
    ritualStage: "blaze",
    theme: "Creative Fire",
    title: "Expression",
    subtitle: "Channeling your creative energy",
    accentColor: "#FFB347",
    iconName: "flame",
    intention: "Express your authentic self through creative channels",
    narrativeOpening: ["Your flame now illuminates your creative potential. Day 3 invites you to express yourself freely."],
    oracleGuidance: {
      interactionPrompt: "Share a way you express yourself creatively or would like to.",
      oraclePromptPreview: "How does your creativity flow?"
    },
    reflectionJourney: [{
      id: "reflection-3",
      title: "Creative Expression",
      description: "What forms of expression bring you alive?"
    }],
    contemplationPrompts: ["How can you integrate more creativity into your daily life?"],
    symbolism: ["The dancing flame represents creative expression"],
    affirmation: "I express my authentic self through creative channels",
    narrativeClosing: ["Your creative fire continues to burn brightly."]
  },
  4: {
    ritualDay: 4,
    ritualStage: "forge",
    theme: "Transformative Heat",
    title: "Transformation",
    subtitle: "Forging new possibilities",
    accentColor: "#FFD447",
    iconName: "flame",
    intention: "Transform challenges into opportunities for growth",
    narrativeOpening: ["The heat of your flame now transforms what it touches. Day 4 is about powerful personal change."],
    oracleGuidance: {
      interactionPrompt: "Share something in your life that's ready for transformation.",
      oraclePromptPreview: "What are you transforming?"
    },
    reflectionJourney: [{
      id: "reflection-4",
      title: "Personal Alchemy",
      description: "How are you changing and evolving?"
    }],
    contemplationPrompts: ["What needs to be released to make space for new growth?"],
    symbolism: ["The transformative flame reshapes what it touches"],
    affirmation: "I transform challenges into growth opportunities",
    narrativeClosing: ["Your transformation continues with each step forward."]
  },
  5: {
    ritualDay: 5,
    ritualStage: "beacon",
    theme: "Guiding Light",
    title: "Illumination",
    subtitle: "Sharing your inner light",
    accentColor: "#FFE647",
    iconName: "flame",
    intention: "Let your inner light guide yourself and inspire others",
    narrativeOpening: ["Your flame has become a beacon. Day 5 celebrates how your light illuminates the path forward."],
    oracleGuidance: {
      interactionPrompt: "Share how you might use your gifts to light the way for others.",
      oraclePromptPreview: "How will your light guide others?"
    },
    reflectionJourney: [{
      id: "reflection-5",
      title: "Beacon of Light",
      description: "How can your wisdom and experience benefit others?"
    }],
    contemplationPrompts: ["What legacy do you wish to create with your inner flame?"],
    symbolism: ["The beacon flame guides and inspires"],
    affirmation: "My inner light shines brightly, guiding myself and others",
    narrativeClosing: ["Your journey with the First Flame ritual concludes, but your inner flame continues to burn eternally."]
  }
};

// Function to get day definition by day number
function getHardcodedDayDefinition(day) {
  // Log the requested day
  log("INFO", `Using hardcoded day definition for day ${day}`, null, FN, DEBUG_FN);
  
  // Default to day 1 if the requested day is not found
  const dayDef = HARDCODED_DAY_DEFS[day] || HARDCODED_DAY_DEFS[1];
  
  if (!HARDCODED_DAY_DEFS[day]) {
    log("WARN", `Day definition not found for day ${day}, using fallback day 1`, null, FN, DEBUG_ALL);
  }
  
  return dayDef;
}

/* -------------------------------------------------------------------------- */
/* 2.  Entry point                                                            */
/* -------------------------------------------------------------------------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  

  const url     = new URL(req.url);
  const authHdr = req.headers.get("Authorization") ?? "";

  /* ---------- 2.1  Resolve caller identity ------------------------------ */
  let userId: string | null = null;

  const sbUser = createClient(SB_URL, SB_ANON, {
    global: authHdr ? { headers: { Authorization: authHdr } } : {},
    auth:   { persistSession: false },
    db:     { schema: "ritual" },
  });

  if (authHdr.startsWith("Bearer ")) {
    const { data: { user } } = await sbUser.auth.getUser();
    if (user?.id) userId = user.id;
  }

  /* ---------- 2.2  Allow dev override (?userId= & allowPublic) ---------- */
  const qsUser        = url.searchParams.get("userId");
  const allowPublicQS = url.searchParams.get("allowPublic") === "1";
  const isDev         = Deno.env.get("ENV")?.toLowerCase() === "dev";

  if (qsUser && (isDev || allowPublicQS)) {
    userId = qsUser;
  }

  /* ---------- 2.3  Final guard ------------------------------------------ */
  if (!userId) return json({ error: "AUTH_REQUIRED" }, 401);
  if (!isValidUuid(userId) && userId !== "demo-user") {
    return json({ error: "INVALID_TOKEN" }, 401);
  }

  /* ---------- 3.  Supabase admin client --------------------------------- */
  const sbAdmin = createClient(SB_URL, SB_SVC, {
    auth: { persistSession: false },
    db:   { schema: "ritual" },
  });

  try {
    log("INFO", LOG_STAGES.EF_GET_FLAME_STATUS_START, { user_id: userId }, FN, DEBUG_ALL);

    /* ------------------------------------------------------------------ */
    /* 3.1 Ensure quest & progress rows exist (safe for demo-user)        */
    /* ------------------------------------------------------------------ */
    const quest = await getOrCreateFirstFlame(sbAdmin);
    await getOrCreateFirstFlameProgress(sbAdmin, userId, quest.id);

    /* ------------------------------------------------------------------ */
    /* 3.2 Poll until fresh                                               */
    /* ------------------------------------------------------------------ */
    const started = Date.now();
    let cachedDayDef: any | null = null;
    let broadcastSent = false;
    let retryCount = 0;
    const MAX_RETRIES = 10;

    // Pre-load the day definition using our hardcoded values
    try {
      // Always use the hardcoded day 1 definition for initial loading
      cachedDayDef = getHardcodedDayDefinition(1);
      log("INFO", "Pre-loaded day 1 definition from hardcoded values", null, FN, DEBUG_FN);
    } catch (e) {
      log("WARN", "Failed to use hardcoded day 1 definition", e, FN, DEBUG_ALL);
      // This shouldn't happen, but just in case, use the first day definition directly
      cachedDayDef = HARDCODED_DAY_DEFS[1];
    }

    while (retryCount < MAX_RETRIES) {
      retryCount++;
      const elapsed = Date.now() - started;
      
      // If we've exceeded our max retry time, return a partial response
      // with processing=true, but ALWAYS include a dayDefinition
      if (elapsed >= MAX_RETRY_MS) {
        // Always ensure we have a day definition (should already be loaded, but just in case)
        if (!cachedDayDef) {
          cachedDayDef = getHardcodedDayDefinition(1);
          log("INFO", "Using default day 1 definition for timeout response", null, FN, DEBUG_ALL);
        }
        
        log("WARN", "Returning partial response due to timeout", { retryCount, elapsed }, FN, DEBUG_ALL);
        return json(
          {
            processing: true,
            dataVersion: Date.now(),
            meta: { 
              estimatedRetryMs: RETRY_DELAY_MS,
              retryCount,
              maxRetryExceeded: true,
              partialData: true
            },
            dayDefinition: cachedDayDef, // Always include the day definition even though we're still processing
            // Add overallProgress as null to match schema expectations
            overallProgress: null
          },
          202,
        );
      }

      /* ---- fetch progress ------------------------------------------ */
      const { data: progress, error } = await sbUser
        .from("flame_progress")
        .select("current_day_target, is_quest_complete, last_imprint_at, updated_at")
        .eq("quest_id", quest.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (isValidUuid(userId)) {
          log("ERROR", "Error fetching progress", error, FN, DEBUG_ALL);
          throw error; // ignore demo-user errors but throw for real users
        } else {
          log("WARN", "Error fetching progress for demo user", error, FN, DEBUG_FN);
        }
      }

      const overallProgress   = progress ?? null;
      const day               = (overallProgress?.current_day_target ?? 1) as RitualDayNumber;
      const updatedAtMs       = overallProgress?.updated_at ? new Date(overallProgress.updated_at).getTime() : 0;
      const cacheIsFresh      = overallProgress && Date.now() - updatedAtMs <= STALE_MS;

      /* ---- stale branch -------------------------------------------- */
      if (!cacheIsFresh) {
        if (DEBUG_FN) log("DEBUG", "Progress stale – cache miss", { user_id: userId, retryCount }, FN, true);

        if (!broadcastSent) {
          broadcastSent = true;
          log("INFO", "Sending broadcast for missing data", { user_id: userId }, FN, DEBUG_FN);
          sbAdmin.functions.invoke("realtime-broadcast", {
            body: { channel: "flame_status", event: "missing", payload: { user_id: userId, quest_id: quest.id } },
          }).catch((e) => log("WARN", `broadcast fail: ${e}`, null, FN, DEBUG_ALL));
        }

        // Load the day definition if we don't have it yet
        if (!cachedDayDef) {
          try { 
            // Use our hardcoded day definition based on the current day
            cachedDayDef = getHardcodedDayDefinition(day);
            log("INFO", "Loaded hardcoded day definition during polling", { day }, FN, DEBUG_FN);
          } catch (e) { 
            log("WARN", "Failed to load hardcoded day definition", { day, error: e }, FN, DEBUG_ALL);
            // This shouldn't happen, but use a fallback based on the current day
            cachedDayDef = HARDCODED_DAY_DEFS[1];
          }
        }

        // Return partial data if we have both progress and day definition
        if (overallProgress && cachedDayDef) {
          log("INFO", "Returning data with stale cache", { user_id: userId, retryCount }, FN, DEBUG_FN);
          return json({
            processing: false,
            dataVersion: Date.now(),
            overallProgress,
            dayDefinition: cachedDayDef,
          });
        }

        // Return partial data with processing=true, but always ensure we have a day definition
        log("INFO", "Returning partial data while processing", { 
          hasProgress: !!overallProgress, 
          hasDayDef: !!cachedDayDef,
          retryCount 
        }, FN, DEBUG_FN);
        
        // Ensure we always have a day definition
        if (!cachedDayDef) {
          cachedDayDef = getHardcodedDayDefinition(1);
          log("INFO", "Using default day 1 definition for partial response", null, FN, DEBUG_ALL);
        }
        
        return json({
          processing: true,
          dataVersion: Date.now(),
          overallProgress: overallProgress || null,
          dayDefinition: cachedDayDef, // Always include a day definition
          meta: { 
            estimatedRetryMs: RETRY_DELAY_MS,
            retryCount,
            partialData: true,
            maxRetryExceeded: false
          },
        }, 202);

        await delay(RETRY_DELAY_MS);
        continue;
      }

      /* ---- fresh branch --------------------------------------------- */
      if (!cachedDayDef) {
        try {
          // Use our hardcoded day definition based on the current day
          cachedDayDef = getHardcodedDayDefinition(day);
          log("INFO", "Loaded hardcoded day definition for fresh data", { day }, FN, DEBUG_FN);
        } catch (e) {
          log("ERROR", "Failed to load hardcoded day definition for fresh data", { day, error: e }, FN, DEBUG_ALL);
          // This shouldn't happen, but use a fallback based on the current day
          cachedDayDef = HARDCODED_DAY_DEFS[1];
        }
      }

      log("INFO", LOG_STAGES.EF_GET_FLAME_STATUS_SUCCESS, { retryCount }, FN, DEBUG_ALL);
      return json({
        processing: false,
        dataVersion: Date.now(),
        overallProgress,
        dayDefinition: cachedDayDef,
      });
    }
  } catch (err) {
    console.error(`[${FN}]`, err);
    return json({ error: "SERVER_ERROR" }, 500);
  }
});
