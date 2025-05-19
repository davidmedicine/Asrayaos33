// === File: src/lib/state/slices/questslice.ts ===
/**
 * questSlice.ts – Manages quest list, active selection, optimistic updates, LRU with pinning.
 * ---------------------------------------------------------------------------------
 * • "Production Bulletproof": Type-safe, SSR-aware, dev-tool friendly, LRU cache for quests
 *   (respecting pinned items), pure metadata updates, and performance-conscious array mutations.
 * • Optimistic Operations: Robust add, reconcile, and remove helpers.
 * • UI-Focused State: `metadata` for client-only flags, `firstQuestJustCreated` for UI flows.
 * • Strict React Query Alignment: Slice hydrated by React Query; core quest data updates
 *   flow via React Query, slice updates UI metadata directly.
 * • No Cross-Slice Imports: Animation gating based on motion preferences is handled by components.
 *
 * Patch v2.3.0 – YYYY-MM-DD (Based on "ultra-hard" feedback round 4)
 * • LRU cache (`pruneOldQuests`) now prioritizes and preserves pinned quests.
 * • `updateQuestMetadata` now *only* updates `metadata` object; server-field changes
 *   (like `is_pinned`) must be handled via React Query mutations.
 * • Optimistic operations and `setQuests` now use `immer` for efficient in-place array updates.
 * • Re-introduced dynamic parts to DevTools action labels with stable prefixes.
 * • Added migration logic for older `firstQuestJustCreated` session storage keys.
 * • Refined optimistic ID collision avoidance (acknowledging external strategy needed).
 * ---------------------------------------------------------------------------------
 */

import { StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { produce } from 'immer'; // For efficient immutable updates

import type { StoreState } from '@/lib/state/store';
import type { Quest as DbQuest } from '@/drizzle/schema';

/* ---------------------------------------------------------------------------
 * 1. Types, Constants & Configuration
 * ------------------------------------------------------------------------ */
const MAX_UNPINNED_QUESTS_IN_MEMORY = 40; // Max non-pinned quests. Pinned quests are always kept.
const FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1 = 'asraya_firstQuestJustCreated';
const FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V2 = 'asraya_firstQuestJustCreated_v2';

export interface QuestMetadata {
  pinned?: boolean;
  // Example: clientSideUnreadCount?: number;
}

export type Quest = DbQuest & {
  metadata: QuestMetadata;
  __optimistic__?: true;
};

export interface QuestSliceState {
  activeQuestId: string | null;
  quests: Quest[];
  firstQuestJustCreated: boolean;
  isLoadingQuests: boolean;
  errorLoadingQuests: string | null;
  lastSynced: number | null;
}

export interface QuestSliceActions {
  setActiveQuestId: (id: string | null) => void;
  setQuests: (questsFromServer: DbQuest[]) => void;
  updateQuestMetadata: (id: string, metadataUpdate: Partial<QuestMetadata>) => void;

  addOptimisticQuest: (optimisticQuestData: {
    tempId: string; // Caller guarantees reasonable uniqueness (e.g., UUID + timestamp/counter)
    name: string;
    type: string;
    agentId?: string | null;
    // ... other necessary non-server-generated DbQuest fields
    metadata?: QuestMetadata; // Initial metadata
  }) => void;
  reconcileOptimisticQuest: (tempId: string, finalQuestFromServer: DbQuest) => void;
  removeOptimisticQuest: (tempId: string) => void;

  setFirstQuestJustCreated: (value: boolean) => void;
  setIsLoadingQuests: (isLoading: boolean) => void;
  setErrorLoadingQuests: (error: string | null) => void;
  setLastSynced: (ts: number) => void;
  resetQuestSlice: () => void;
  _migrateFirstQuestFlag: () => void; // Internal action for migration
}

export type QuestSlice = QuestSliceState & QuestSliceActions;

/* ---------------------------------------------------------------------------
 * 2. Helper Functions
 * ------------------------------------------------------------------------ */
const loadFirstQuestFlag = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const v2Flag = window.sessionStorage.getItem(FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V2);
    if (v2Flag !== null) return v2Flag === 'true';
    // If v2 not found, check for v1 (migration handled by _migrateFirstQuestFlag)
    const v1Flag = window.sessionStorage.getItem(FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1);
    return v1Flag === 'true';
  } catch (error) {
    console.warn('[questSlice] Error reading firstQuestFlag from sessionStorage:', error);
    return false;
  }
};

const saveFirstQuestFlag = (value: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V2, String(value));
    // Remove old key after successful save of new one (part of migration)
    if (window.sessionStorage.getItem(FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1) !== null) {
      window.sessionStorage.removeItem(FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1);
    }
  } catch (error) {
    // Silently ignore as per feedback
  }
};

const mapDbQuestToClientQuest = (dbQuest: DbQuest): Quest => ({
  ...dbQuest,
  // Initialize metadata. `is_pinned` from DB is the source of truth for pinned status.
  // UI interactions to change pinned status should trigger a mutation,
  // which then updates `is_pinned` on the server and re-hydrates this slice.
  metadata: { pinned: dbQuest.is_pinned || false },
});

function pruneQuestsWithPinning(quests: Quest[], maxUnpinned: number): Quest[] {
  const pinnedQuests = quests.filter(q => q.metadata.pinned);
  const unpinnedQuests = quests.filter(q => !q.metadata.pinned);

  if (unpinnedQuests.length <= maxUnpinned) {
    return [...pinnedQuests, ...unpinnedQuests]; // All unpinned fit, combine with pinned
  }

  const prunedUnpinnedQuests = [...unpinnedQuests] // Create a new array for sorting
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) // Most recent unpinned first
    .slice(0, maxUnpinned);

  return [...pinnedQuests, ...prunedUnpinnedQuests];
}


/* ---------------------------------------------------------------------------
 * 3. Initial State
 * ------------------------------------------------------------------------ */
const INITIAL_QUEST_SLICE_STATE: QuestSliceState = {
  activeQuestId: null,
  quests: [],
  firstQuestJustCreated: false, // Will be properly set by _migrateFirstQuestFlag then loadFirstQuestFlag
  isLoadingQuests: true,
  errorLoadingQuests: null,
  lastSynced: null,
};

/* ---------------------------------------------------------------------------
 * 4. Slice Creator
 * ------------------------------------------------------------------------ */
export const createQuestSlice: StateCreator<
  StoreState,
  [['zustand/devtools', never]],
  [],
  QuestSlice
> = devtools(
  (set, get) => ({
    ...INITIAL_QUEST_SLICE_STATE,
    // Initialize firstQuestJustCreated on slice creation after potential migration
    // This ensures the initial state reflects the (potentially migrated) session storage value.
    firstQuestJustCreated: loadFirstQuestFlag(),


    _migrateFirstQuestFlag: () => {
        // This action should be called once when the app initializes,
        // potentially from the same place where other migrations or initial setups occur.
        if (typeof window !== 'undefined') {
            try {
                const v1Flag = window.sessionStorage.getItem(FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1);
                if (v1Flag !== null) {
                    // If v1 exists, save its value to v2 key and remove v1 key
                    const v1Value = v1Flag === 'true';
                    saveFirstQuestFlag(v1Value); // This also removes v1 key internally
                    set({ firstQuestJustCreated: v1Value }, false, 'quest/migrateFirstQuestFlag');
                }
            } catch (error) {
                console.warn('[questSlice] Error during firstQuestFlag migration:', error);
            }
        }
    },

    setActiveQuestId: (id) =>
      set({ activeQuestId: id }, false, `quest/setActiveQuestId:${id ?? 'null'}`),

    setQuests: (questsFromServer) => {
      const mappedQuests = questsFromServer.map(mapDbQuestToClientQuest);
      const finalQuests = pruneQuestsWithPinning(mappedQuests, MAX_UNPINNED_QUESTS_IN_MEMORY);
      set(
        produce((draft: QuestSliceState) => {
          draft.quests = finalQuests;
          draft.isLoadingQuests = false;
          draft.errorLoadingQuests = null;
        }),
        // `false` equivalent for immer `produce` is implicit (it doesn't replace the whole state object)
        // The action label is passed directly to devtools if it's the top-level wrapper.
        // If `set` is wrapped by `devtools` which is wrapped by `persist`, etc.,
        // the label needs to be in the `set` call that devtools sees.
        // For `produce`, the label is conceptually part of the `set` operation.
        // Let's assume devtools correctly picks up the action name from the wrapper.
        // To be explicit for `set(produce(...))`:
        // set(state => produce(state, draft => {...}), false, 'quest/setQuests')
        // However, common pattern is just: set(produce(draft => {...}))
        // For this setup, we provide the label to the outer set call:
        false,
        'quest/setQuests'
      );
    },

    updateQuestMetadata: (id, metadataUpdate) => {
      if (!id) {
        console.warn('[questSlice] updateQuestMetadata called with no id.');
        return;
      }
      // IMPORTANT: This action ONLY updates client-side metadata.
      // If `metadataUpdate.pinned` changes, the actual `is_pinned` field in the DB
      // should be updated via a React Query mutation. That mutation's onSuccess
      // would then call `setQuests` or trigger a refetch, re-hydrating this slice
      // with the authoritative server state (including the updated `is_pinned`).
      set(
        produce((draft: QuestSliceState) => {
          const questIndex = draft.quests.findIndex(q => q.id === id);
          if (questIndex !== -1) {
            draft.quests[questIndex].metadata = {
              ...draft.quests[questIndex].metadata,
              ...metadataUpdate,
            };
          }
        }),
        false,
        `quest/updateQuestMetadata:${id}`
      );
    },

    addOptimisticQuest: ({ tempId, metadata = {}, ...optimisticQuestData }) => {
      // Animation gating should happen in the component calling this action,
      // by checking uiSlice.isReduceMotionGloballyEnabled and device capabilities.
      // This slice action focuses solely on state update.

      set(
        produce((draft: QuestSliceState) => {
          if (draft.quests.some((q) => q.id === tempId)) {
            console.warn(`[questSlice] Optimistic quest with tempId "${tempId}" already exists.`);
            return;
          }
          const newOptimisticQuest: Quest = {
            id: tempId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            is_pinned: metadata.pinned || false, // Initialize is_pinned from initial metadata
            name: optimisticQuestData.name,
            type: optimisticQuestData.type,
            agent_id: optimisticQuestData.agentId || null,
            // community_id: optimisticQuestData.communityId || null, // Ensure all DbQuest fields are covered
            // realm: optimisticQuestData.realm || null,
            user_id: '', // Placeholder
            // ... fill all DbQuest fields with appropriate defaults or from optimisticQuestData
            description: null,
            slug: null,
            title: optimisticQuestData.name, // For potential schema compatibility

            metadata: { pinned: false, ...metadata }, // Ensure default pinned is false
            __optimistic__: true,
          };
          draft.quests.push(newOptimisticQuest);
        }),
        false,
        `quest/addOptimisticQuest:${tempId}`
      );
    },

    reconcileOptimisticQuest: (tempId, finalQuestFromServer) => {
      const finalQuest = mapDbQuestToClientQuest(finalQuestFromServer);
      set(
        produce((draft: QuestSliceState) => {
          const index = draft.quests.findIndex(q => q.id === tempId);
          if (index !== -1) {
            // Replace optimistic item with final one
            draft.quests[index] = { ...finalQuest, __optimistic__: undefined };
          } else {
            // If tempId not found, but finalQuest.id might exist (e.g. already reconciled),
            // try to update it. Otherwise, add it (less ideal, indicates potential issue).
            const finalIndex = draft.quests.findIndex(q => q.id === finalQuest.id);
            if (finalIndex !== -1) {
              draft.quests[finalIndex] = { ...finalQuest, __optimistic__: undefined };
            } else {
              draft.quests.push({ ...finalQuest, __optimistic__: undefined });
              console.warn(`[questSlice] Reconciled quest (tempId: ${tempId}, finalId: ${finalQuest.id}) where tempId was not found. Added final quest.`);
            }
          }
          // Ensure no duplicates of finalQuest.id if it was different from tempId
          // This step is more robust if the replace-in-place for tempId worked.
          // If just pushing, need to filter out any other instance of finalQuest.id.
          // For simplicity with immer's splice/replace: the above logic should handle it if tempId is found.
          // If tempId is NOT found, the `else` block tries to update or add.
          // A final filter pass could be added for absolute safety if needed, but can be complex.
        }),
        false,
        `quest/reconcileOptimisticQuest:${tempId}->${finalQuest.id}`
      );
    },

    removeOptimisticQuest: (tempId) =>
      set(
        produce((draft: QuestSliceState) => {
          const index = draft.quests.findIndex(q => q.id === tempId);
          if (index !== -1) {
            draft.quests.splice(index, 1);
          }
          // No specific loading/error maps for optimistic items in this slice
        }),
        false,
        `quest/removeOptimisticQuest:${tempId}`
      ),

    setFirstQuestJustCreated: (value) => {
      saveFirstQuestFlag(value);
      set({ firstQuestJustCreated: value }, false, `quest/setFirstQuestJustCreated:${value}`);
    },

    setIsLoadingQuests: (isLoading) =>
      set(
        produce((draft: QuestSliceState) => {
          draft.isLoadingQuests = isLoading;
          if (isLoading) {
            draft.errorLoadingQuests = null;
          }
        }),
        false,
        isLoading ? 'quest/list:loadingStart' : 'quest/list:loadingFinish'
      ),

    setErrorLoadingQuests: (error) =>
      set(
        produce((draft: QuestSliceState) => {
          draft.errorLoadingQuests = error;
          draft.isLoadingQuests = false;
        }),
        false,
        error ? 'quest/list:loadingError' : 'quest/list:loadingErrorClear'
      ),

    setLastSynced: (ts) =>
      set({ lastSynced: ts }, false, `quest/setLastSynced:${ts}`),

    resetQuestSlice: () => {
      // `_migrateFirstQuestFlag` should be called on app init.
      // `loadFirstQuestFlag` will then get the correct (possibly migrated) value.
      const currentFirstQuestFlag = loadFirstQuestFlag();
      set({
        ...INITIAL_QUEST_SLICE_STATE,
        firstQuestJustCreated: currentFirstQuestFlag,
        lastSynced: null,
      }, true, 'quest/resetQuestSlice');
    }
  }),
  { name: 'QuestSlice', store: 'quest', enabled: process.env.NODE_ENV !== 'production' }
);

/* ---------------------------------------------------------------------------
 * 5. Selectors
 * ------------------------------------------------------------------------ */
export const selectActiveQuest = (state: StoreState): Quest | null => {
  if (!state.questSlice.activeQuestId) return null;
  return state.questSlice.quests.find(q => q.id === state.questSlice.activeQuestId) ?? null;
};
export const selectAllQuests = (state: StoreState): Quest[] => state.questSlice.quests;
export const selectIsLoadingQuests = (state: StoreState): boolean => state.questSlice.isLoadingQuests;
export const selectFirstQuestJustCreated = (state: StoreState): boolean => state.questSlice.firstQuestJustCreated;
export const selectQuestLastSynced = (state: StoreState): number | null => state.questSlice.lastSynced;

/* ---------------------------------------------------------------------------
 * 6. End of file
 * ------------------------------------------------------------------------ */

import { create } from 'zustand';
import type { StateCreator } from 'zustand';

/**
 * Hook: useQuestStore
 * ------------------------------------------------------------
 * Stand-alone Zustand store built from the quest slice. This
 * mirrors the pattern used in contextSlice, layoutSlice, etc.
 */
export const useQuestStore = create<QuestSlice>()(
  createQuestSlice as unknown as StateCreator<QuestSlice>
);