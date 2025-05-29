/* -------------------------------------------------------------
 * supabase/functions/_shared/db/firstFlame.ts
 *
 * Helpers for creating / loading the First-Flame quest and the
 * per-user flame_progress row, with duplicate-insert protection.
 *
 * ⚠  RLS NOTE
 *    These helpers run with the **service_role** key.  That role
 *    is *not* a super-user and does **NOT** bypass RLS.  
 *    Production therefore needs an explicit policy such as:
 *
 *      ALTER POLICY ... ON ritual.quests
 *        FOR  ALL  TO service_role USING ( true );
 *
 * ----------------------------------------------------------- */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { FIRST_FLAME_SLUG }  from '../5dayquest/FirstFlame.ts';

/* ------------------------------------------------------------------ */
/*  0.  In-memory request de-dup                                      */
/* ------------------------------------------------------------------ */
// Keep track of in-flight requests with a 5-second expiration
const progressTracker = new Map<
  string,
  { 
    promise: Promise<{ ok: boolean; row?: any; error?: string }>,
    timestamp: number 
  }
>();

// Clear stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of progressTracker.entries()) {
    // Remove entries older than 5 seconds
    if (now - entry.timestamp > 5000) {
      progressTracker.delete(key);
    }
  }
}, 1000);

/* ------------------------------------------------------------------ */
/*  1.  Small utilities                                               */
/* ------------------------------------------------------------------ */
export function isValidUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str ?? ''
  );
}

async function safeUpsert<T>(
  table: ReturnType<SupabaseClient['from']>,
  values: T,
  conflictCols: string[]
): Promise<{ data: T | null; error: any }> {
  try {
    const { data, error } = await table
      .upsert(values, {
        onConflict: conflictCols.join(','),
        ignoreDuplicates: true,
      })
      .select()
      .maybeSingle();
    return { data: data as T | null, error };
  } catch (err) {
    console.error('[firstFlame] safeUpsert error:', err);
    return { data: null, error: err };
  }
}

/* ------------------------------------------------------------------ */
/*  2.  Quest helper                                                  */
/* ------------------------------------------------------------------ */
export interface QuestRow {
  id: string;
  slug: string;
  title: string;
  type: string;
}

interface UpsertQuestPayload
  extends Omit<QuestRow, 'id'> {
  realm?: string | null;
  is_pinned?: boolean | null;
}

export async function getOrCreateFirstFlame(
  admin: SupabaseClient,
  overrides: Partial<UpsertQuestPayload> = {}
): Promise<QuestRow> {
  try {
    const cols = 'id, slug, title, type';

    /* fast-path: read first */
    try {
      const { data: found, error: selErr } = await admin
        .from('quests')
        .select(cols)
        .eq('slug', FIRST_FLAME_SLUG)
        .maybeSingle<QuestRow>();

      if (selErr) {
        console.error('[firstFlame] Error finding quest:', selErr);
        throw selErr;
      }
      if (found) return found;
    } catch (findErr) {
      console.error('[firstFlame] Error in quest find:', findErr);
      throw findErr;
    }

    /* slow-path: insert */
    try {
      const payload: UpsertQuestPayload = {
        slug : FIRST_FLAME_SLUG,
        title: overrides.title ?? 'First Flame Ritual',
        type : overrides.type  ?? 'ritual',
        realm: overrides.realm,
        is_pinned: overrides.is_pinned,
      };

      const { data: created, error: insErr } = await admin
        .from('quests')
        .insert(payload)
        .select(cols)
        .single<QuestRow>();

      if (insErr) {
        console.error('[firstFlame] Error inserting quest:', insErr);
        throw insErr;
      }
      if (!created) {
        throw new Error('Insert returned no data');
      }

      return created;
    } catch (insertErr) {
      console.error('[firstFlame] Error in quest insert:', insertErr);
      throw insertErr;
    }
  } catch (err) {
    console.error('[firstFlame] getOrCreateFirstFlame error:', err);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  3.  flame_progress helper                                         */
/* ------------------------------------------------------------------ */
export async function getOrCreateFirstFlameProgress(
  admin: SupabaseClient,
  userId: string,
  questId: string
): Promise<{ ok: boolean; row?: any; error?: string }> {
  try {
    if (!isValidUuid(userId)) {
      console.warn('[firstFlame] skipping non-UUID user:', userId);
      return { ok: true, error: 'DEMO_USER_SKIP' };
    }

    // First, ensure the quest exists
    try {
      let actualQuestId = questId;
      
      // Check if questId is a UUID or a slug
      if (!isValidUuid(questId)) {
        console.log(`[firstFlame] questId "${questId}" is not a UUID, treating as slug`);
        
        // Try to find quest by slug
        const { data: questBySlug, error: slugErr } = await admin
          .from('quests')
          .select('id')
          .eq('slug', questId)
          .maybeSingle();
          
        if (slugErr) {
          console.error('[firstFlame] Error finding quest by slug:', slugErr);
          return { ok: false, error: `Failed to find quest by slug: ${slugErr.message}` };
        }
        
        if (questBySlug) {
          // Found by slug, use its ID
          actualQuestId = questBySlug.id;
          console.log(`[firstFlame] Found quest by slug, using ID: ${actualQuestId}`);
        } else {
          // Quest not found by slug, create it
          console.log(`[firstFlame] Quest not found by slug "${questId}", creating it`);
          try {
            // This will find or create the quest
            const quest = await getOrCreateFirstFlame(admin, { 
              realm: 'first_flame',
              is_pinned: true 
            });
            // Update actualQuestId to the actual quest ID
            actualQuestId = quest.id;
            console.log(`[firstFlame] Created quest with ID: ${actualQuestId} (slug: ${quest.slug})`);
          } catch (createErr) {
            console.error('[firstFlame] Error creating quest:', createErr);
            return { ok: false, error: `Failed to create quest: ${createErr.message}` };
          }
        }
      } else {
        // Try to find the quest by ID since it's a UUID
        const { data: quest, error: questErr } = await admin
          .from('quests')
          .select('id')
          .eq('id', actualQuestId)
          .maybeSingle();
        
        if (questErr) {
          console.error('[firstFlame] Error finding quest:', questErr);
          return { ok: false, error: `Failed to find quest: ${questErr.message}` };
        }
        
        // If quest doesn't exist by ID, create it
        if (!quest) {
          console.warn('[firstFlame] Quest not found by ID, creating new quest');
          try {
            // This will find or create the quest
            const quest = await getOrCreateFirstFlame(admin, { 
              realm: 'first_flame',
              is_pinned: true 
            });
            // Update actualQuestId to the actual quest ID
            actualQuestId = quest.id;
            console.log(`[firstFlame] Using quest ID: ${actualQuestId} (slug: ${quest.slug})`);
          } catch (createErr) {
            console.error('[firstFlame] Error creating quest:', createErr);
            return { ok: false, error: `Failed to create quest: ${createErr.message}` };
          }
        }
      }
      
      // Use actualQuestId for the rest of the function
      questId = actualQuestId;
    } catch (questCheckErr) {
      console.error('[firstFlame] Error checking quest:', questCheckErr);
      return { ok: false, error: `Quest check failed: ${questCheckErr.message}` };
    }

    const key = `${userId}:${questId}`;
    if (progressTracker.has(key)) {
      console.log(`[firstFlame] Using cached promise for ${key}`);
      return progressTracker.get(key)!.promise;
    }

    const promise = (async () => {
      try {
        /* already exists? --------------------------------------------------- */
        const { data: existing, error: selErr } = await admin
          .from('flame_progress')
          .select('*')
          .eq('quest_id', questId)
          .eq('user_id', userId)
          .maybeSingle();

        if (selErr) {
          console.error('[firstFlame] Error finding progress:', selErr);
          return { ok: false, error: selErr.message };
        }
        if (existing) {
          console.log('[firstFlame] Found existing progress');
          return { ok: true, row: existing, error: 'EXISTING' };
        }

        /* insert new row ---------------------------------------------------- */
        console.log(`[firstFlame] Creating new progress for user ${userId}, quest ${questId}`);
        const { data: row, error } = await safeUpsert(
          admin.from('flame_progress'),
          {
            quest_id: questId,
            user_id : userId,
            current_day_target: 1,
            is_quest_complete : false,
            /* imprint_ref intentionally omitted – column is nullable */
          },
          ['quest_id', 'user_id']
        );

        if (error) {
          console.error('[firstFlame] Error inserting progress:', error);
          return { ok: false, error: error.message };
        }
        
        console.log('[firstFlame] Successfully created new progress');
        return { ok: true, row };
      } catch (progressErr) {
        console.error('[firstFlame] Error in getOrCreateFirstFlameProgress:', progressErr);
        return { ok: false, error: progressErr.message };
      }
    })();

    // Store both the promise and the current timestamp
    progressTracker.set(key, { 
      promise, 
      timestamp: Date.now() 
    });
    
    return promise;
  } catch (outerErr) {
    console.error('[firstFlame] Outer error in getOrCreateFirstFlameProgress:', outerErr);
    return { ok: false, error: outerErr.message };
  }
}

/* ------------------------------------------------------------------ */
/*  4.  Legacy alias                                                  */
/* ------------------------------------------------------------------ */
export const ensureFirstFlameQuest = async (admin: SupabaseClient) => {
  try {
    const { id } = await getOrCreateFirstFlame(admin, {
      realm: 'first_flame',
      is_pinned: true,
    });
    return { id };
  } catch (err) {
    console.error('[firstFlame] Error in ensureFirstFlameQuest:', err);
    throw err;
  }
};