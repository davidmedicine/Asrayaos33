/*
 * ⚠  RLS note:
 *  The helper runs with the Supabase **service_role** key.
 *  That role is _not_ a superuser and does **NOT** bypass RLS.
 *  Production expects an `ON ritual.quests FOR ALL TO service_role USING (true)` policy.
 *  If you change the helper to touch other tables, add the matching
 *  `… TO service_role USING (true)` policy in the migration.
 */
// supabase/functions/_shared/db/firstFlame.ts
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Keep if admin client is explicitly typed SupabaseClient
import { FIRST_FLAME_SLUG } from '../5dayquest/FirstFlame.ts';
// day1Content is no longer directly used in this version of the helper,
// as title is now passed by the caller or defaults if not provided.

/**
 * Defines the minimal structure of a quest row, primarily what is returned
 * by the getOrCreateFirstFlame helper after ensuring the quest exists.
 * This interface focuses on the essential identifiers and core type information.
 * RLS policies on 'quests' table should allow access based on user participation
 * (via quest_participants linking user_id to quest_id (UUID)).
 */
export interface QuestRow {
  id: string;          // UUID PK
  slug: string;        // unique text (e.g., 'first-flame-ritual')
  title: string;       // Title of the quest
  type: string;        // e.g., 'ritual'
  // is_pinned and realm are removed from default return as they are business logic
  // and not essential for just getting/creating the quest entry.
  // created_at is also removed from default to keep the payload lean.
}

interface UpsertQuestPayload {
  slug: string;
  title: string;
  type: string;
  realm?: string | null; // Optional, to be provided by caller if not default
  is_pinned?: boolean | null; // Optional, to be provided by caller if not default
}

/**
 * Idempotently loads or creates the 'First-Flame' quest using its predefined slug.
 * This version uses a "read-first, then write-if-missing" approach.
 * It returns only the essential 'id', 'slug', 'title', and 'type' of the quest.
 *
 * @param admin - A Supabase client instance with service_role or appropriate admin rights.
 * @param payloadOverrides - Optional an object to override default title, type, or provide realm/is_pinned.
 * @returns A Promise resolving to the minimal QuestRow object for the First Flame quest.
 * @throws If the operation fails.
 *
 * Database operations are within the 'ritual' schema (assumed to be set on the client).
 */
export async function getOrCreateFirstFlame(
  admin: SupabaseClient,
  payloadOverrides?: Partial<UpsertQuestPayload> // Allow caller to specify title, type, realm, is_pinned
): Promise<QuestRow> {
  const selectCols = 'id, slug, title, type'; // Minimal essential columns

  // 1. Attempt to read the quest first (fast path)
  const { data: existingQuest, error: selectError } = await admin
    .from('quests')
    .select(selectCols)
    .eq('slug', FIRST_FLAME_SLUG)
    .maybeSingle<QuestRow>();

  if (selectError) {
    console.error(`[shared/db/firstFlame] Error selecting quest by slug '${FIRST_FLAME_SLUG}'. Error:`, selectError);
    throw selectError;
  }

  if (existingQuest) {
    // console.debug(`[shared/db/firstFlame] Found existing quest for slug '${FIRST_FLAME_SLUG}'. ID: ${existingQuest.id}`);
    return existingQuest;
  }

  // 2. Quest not found, proceed to insert (slower path)
  // console.debug(`[shared/db/firstFlame] Quest with slug '${FIRST_FLAME_SLUG}' not found. Attempting to insert.`);

  const insertPayload: UpsertQuestPayload = {
    slug: FIRST_FLAME_SLUG,
    title: payloadOverrides?.title ?? 'First Flame Ritual', // Default title, can be overridden
    type: payloadOverrides?.type ?? 'ritual', // Default type, can be overridden
    realm: payloadOverrides?.realm, // Pass from caller or undefined
    is_pinned: payloadOverrides?.is_pinned, // Pass from caller or undefined
  };

  const { data: newQuest, error: insertError } = await admin
    .from('quests')
    .insert(insertPayload)
    .select(selectCols) // Select the same minimal columns
    .single<QuestRow>();

  if (insertError || !newQuest) {
    console.error(
        `[shared/db/firstFlame] CRITICAL: Insert failed for slug '${FIRST_FLAME_SLUG}'. Error: ${JSON.stringify(insertError)}, Data: ${JSON.stringify(newQuest)}`
    );
    throw insertError ?? new Error(`getOrCreateFirstFlame: Insert for slug '${FIRST_FLAME_SLUG}' failed or returned no data.`);
  }
  // console.debug(`[shared/db/firstFlame] Successfully inserted quest for slug '${FIRST_FLAME_SLUG}'. ID: ${newQuest.id}`);
  return newQuest;
}

/**
 * getOrCreateFirstFlameProgress
 * -----------------------------------------------------
 * Ensure a flame_progress row exists for the given user.
 * Inserts `current_day_target = 1` if missing. Caller must
 * provide the quest id (typically from getOrCreateFirstFlame).
 */
export async function getOrCreateFirstFlameProgress(
  admin: SupabaseClient,
  userId: string,
  questId: string,
): Promise<void> {
  const { error } = await admin
    .from('flame_progress')
    .upsert(
      {
        quest_id: questId,
        user_id: userId,
        current_day_target: 1,
        is_quest_complete: false,
      },
      { onConflict: 'quest_id,user_id', ignoreDuplicates: true },
    );

  if (error) {
    console.error('[shared/db/firstFlame] flame_progress upsert error', error);
    throw error;
  }
}

/**
 * ensureFirstFlameQuest
 * -----------------------------------------------------
 * Thin wrapper used by Edge Functions to guarantee the
 * First Flame quest exists and return only its id.
 */
export async function ensureFirstFlameQuest(
  admin: SupabaseClient,
): Promise<{ id: string }> {
  const { id } = await getOrCreateFirstFlame(admin, {
    title: 'First Flame Ritual',
    type: 'ritual',
    realm: 'first_flame',
    is_pinned: true,
  });
  return { id };
}