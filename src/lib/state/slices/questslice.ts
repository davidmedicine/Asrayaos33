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
 * Patch v2.3.1 – YYYY-MM-DD (Incorporating feedback on patch v2.3.0)
 * • Corrected import order and removed redundant StateCreator import.
 * • Added null guard for `updatedAt` in `pruneQuestsWithPinning` sort, falling back to `createdAt`.
 * • (Optional) Added warning for excessive pinned quests in `pruneQuestsWithPinning`.
 * • Consolidated `create` import from `zustand` to the top.
 * ---------------------------------------------------------------------------------
 */

import { type StateCreator, create } from "zustand"; // MODIFIED: Added 'create' and 'type' for StateCreator
import { devtools } from "zustand/middleware";
import { produce } from "immer"; // For efficient immutable updates

import type { StoreState } from "@/lib/state/store";
import type { Quest as DbQuest } from "@/drizzle/schema";

/* ---------------------------------------------------------------------------
 * 1. Types, Constants & Configuration
 * ------------------------------------------------------------------------ */
const MAX_UNPINNED_QUESTS_IN_MEMORY = 40; // Max non-pinned quests. Pinned quests are always kept.
const MAX_PINNED_QUESTS_WARNING_THRESHOLD = 50; // Threshold for warning about many pinned quests.
const FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1 =
  "asraya_firstQuestJustCreated";
const FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V2 =
  "asraya_firstQuestJustCreated_v2";
const ACTIVE_QUEST_ID_LOCAL_STORAGE_KEY =
  "asraya_activeQuestId";

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
  updateQuestMetadata: (
    id: string,
    metadataUpdate: Partial<QuestMetadata>,
  ) => void;

  addOptimisticQuest: (optimisticQuestData: {
    tempId: string;
    name: string;
    type: string;
    agentId?: string | null;
    metadata?: QuestMetadata;
  }) => void;
  reconcileOptimisticQuest: (
    tempId: string,
    finalQuestFromServer: DbQuest,
  ) => void;
  removeOptimisticQuest: (tempId: string) => void;

  setFirstQuestJustCreated: (value: boolean) => void;
  setIsLoadingQuests: (isLoading: boolean) => void;
  setErrorLoadingQuests: (error: string | null) => void;
  setLastSynced: (ts: number) => void;
  resetQuestSlice: () => void;
  _migrateFirstQuestFlag: () => void;
}

export type QuestSlice = QuestSliceState & QuestSliceActions;

/* ---------------------------------------------------------------------------
 * 2. Helper Functions
 * ------------------------------------------------------------------------ */
const loadFirstQuestFlag = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const v2Flag = window.sessionStorage.getItem(
      FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V2,
    );
    if (v2Flag !== null) return v2Flag === "true";
    const v1Flag = window.sessionStorage.getItem(
      FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1,
    );
    return v1Flag === "true";
  } catch (error) {
    console.warn(
      "[questSlice] Error reading firstQuestFlag from sessionStorage:",
      error,
    );
    return false;
  }
};

const loadActiveQuestId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const storedId = window.localStorage.getItem(
      ACTIVE_QUEST_ID_LOCAL_STORAGE_KEY
    );
    return storedId;
  } catch (error) {
    console.warn(
      "[questSlice] Error reading activeQuestId from localStorage:",
      error
    );
    return null;
  }
};

const saveActiveQuestId = (id: string | null): void => {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_QUEST_ID_LOCAL_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_QUEST_ID_LOCAL_STORAGE_KEY);
    }
  } catch (error) {
    console.warn(
      "[questSlice] Error saving activeQuestId to localStorage:",
      error
    );
  }
};

const saveFirstQuestFlag = (value: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V2,
      String(value),
    );
    if (
      window.sessionStorage.getItem(
        FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1,
      ) !== null
    ) {
      window.sessionStorage.removeItem(
        FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1,
      );
    }
  } catch (error) {
    // Silently ignore
  }
};

const mapDbQuestToClientQuest = (dbQuest: DbQuest): Quest => ({
  ...dbQuest,
  metadata: { pinned: dbQuest.is_pinned || false },
});

function pruneQuestsWithPinning(quests: Quest[], maxUnpinned: number): Quest[] {
  const pinnedQuests = quests.filter((q) => q.metadata.pinned);
  const unpinnedQuests = quests.filter((q) => !q.metadata.pinned);

  // Optional: Warn if there are an unusually high number of pinned quests
  if (pinnedQuests.length > MAX_PINNED_QUESTS_WARNING_THRESHOLD) {
    console.warn(
      `[questSlice] High number of pinned quests (${pinnedQuests.length}). This may impact memory usage. Consider UI/UX implications for managing many pinned items.`,
    );
  }

  if (unpinnedQuests.length <= maxUnpinned) {
    return [...pinnedQuests, ...unpinnedQuests];
  }

  const prunedUnpinnedQuests = [...unpinnedQuests]
    .sort((a, b) => // MODIFIED: Added null guard for updatedAt, falling back to createdAt
      new Date(b.updatedAt ?? b.createdAt).getTime() -
      new Date(a.updatedAt ?? a.createdAt).getTime()
    )
    .slice(0, maxUnpinned);

  return [...pinnedQuests, ...prunedUnpinnedQuests];
}


/* ---------------------------------------------------------------------------
 * 3. Initial State
 * ------------------------------------------------------------------------ */
const INITIAL_QUEST_SLICE_STATE: QuestSliceState = {
  activeQuestId: typeof window !== "undefined" ? loadActiveQuestId() : null,
  quests: [],
  firstQuestJustCreated: false,
  isLoadingQuests: true,
  errorLoadingQuests: null,
  lastSynced: null,
};

/* ---------------------------------------------------------------------------
 * 4. Slice Creator
 * ------------------------------------------------------------------------ */
export const createQuestSlice: StateCreator<
  StoreState,
  [["zustand/devtools", never]],
  [],
  QuestSlice
> = devtools(
  (set, get) => ({
    ...INITIAL_QUEST_SLICE_STATE,
    firstQuestJustCreated: loadFirstQuestFlag(),

    _migrateFirstQuestFlag: () => {
      if (typeof window !== "undefined") {
        try {
          const v1Flag = window.sessionStorage.getItem(
            FIRST_QUEST_JUST_CREATED_SESSION_STORAGE_KEY_V1,
          );
          if (v1Flag !== null) {
            const v1Value = v1Flag === "true";
            saveFirstQuestFlag(v1Value);
            set(
              { firstQuestJustCreated: v1Value },
              false,
              "quest/migrateFirstQuestFlag",
            );
          }
        } catch (error) {
          console.warn(
            "[questSlice] Error during firstQuestFlag migration:",
            error,
          );
        }
      }
    },

    setActiveQuestId: (id) => {
      // Persist to localStorage for persistence across page reloads
      saveActiveQuestId(id);
      // Update state
      set(
        { activeQuestId: id },
        false,
        `quest/setActiveQuestId:${id ?? "null"}`,
      );
    },

    setQuests: (questsFromServer) => {
      const mappedQuests = questsFromServer.map(mapDbQuestToClientQuest);
      const finalQuests = pruneQuestsWithPinning(
        mappedQuests,
        MAX_UNPINNED_QUESTS_IN_MEMORY,
      );
      set(
        produce((draft: QuestSliceState) => {
          draft.quests = finalQuests;
          draft.isLoadingQuests = false;
          draft.errorLoadingQuests = null;
        }),
        false,
        "quest/setQuests",
      );
    },

    updateQuestMetadata: (id, metadataUpdate) => {
      if (!id) {
        console.warn("[questSlice] updateQuestMetadata called with no id.");
        return;
      }
      set(
        produce((draft: QuestSliceState) => {
          const questIndex = draft.quests.findIndex((q) => q.id === id);
          if (questIndex !== -1) {
            draft.quests[questIndex].metadata = {
              ...draft.quests[questIndex].metadata,
              ...metadataUpdate,
            };
          }
        }),
        false,
        `quest/updateQuestMetadata:${id}`,
      );
    },

    addOptimisticQuest: ({ tempId, metadata = {}, ...optimisticQuestData }) => {
      set(
        produce((draft: QuestSliceState) => {
          if (draft.quests.some((q) => q.id === tempId)) {
            console.warn(
              `[questSlice] Optimistic quest with tempId "${tempId}" already exists.`,
            );
            return;
          }
          const now = new Date().toISOString();
          const newOptimisticQuest: Quest = {
            id: tempId,
            createdAt: now, // Ensure createdAt is always set
            updatedAt: now, // Ensure updatedAt is always set
            is_pinned: metadata.pinned || false,
            name: optimisticQuestData.name,
            type: optimisticQuestData.type,
            agent_id: optimisticQuestData.agentId || null,
            user_id: "", // Placeholder, should be set by server or pre-filled if known
            description: null, // Default for other DbQuest fields
            slug: null,        // Default
            title: optimisticQuestData.name, // Default based on name

            metadata: { pinned: false, ...metadata },
            __optimistic__: true,
          };
          draft.quests.push(newOptimisticQuest);
        }),
        false,
        `quest/addOptimisticQuest:${tempId}`,
      );
    },

    reconcileOptimisticQuest: (tempId, finalQuestFromServer) => {
      const finalQuest = mapDbQuestToClientQuest(finalQuestFromServer);
      set(
        produce((draft: QuestSliceState) => {
          const index = draft.quests.findIndex((q) => q.id === tempId);
          if (index !== -1) {
            draft.quests[index] = { ...finalQuest, __optimistic__: undefined };
          } else {
            const finalIndex = draft.quests.findIndex(
              (q) => q.id === finalQuest.id,
            );
            if (finalIndex !== -1) {
              draft.quests[finalIndex] = {
                ...finalQuest,
                __optimistic__: undefined,
              };
            } else {
              draft.quests.push({ ...finalQuest, __optimistic__: undefined });
              console.warn(
                `[questSlice] Reconciled quest (tempId: ${tempId}, finalId: ${finalQuest.id}) where tempId was not found. Added final quest.`,
              );
            }
          }
        }),
        false,
        `quest/reconcileOptimisticQuest:${tempId}->${finalQuest.id}`,
      );
    },

    removeOptimisticQuest: (tempId) =>
      set(
        produce((draft: QuestSliceState) => {
          const index = draft.quests.findIndex((q) => q.id === tempId);
          if (index !== -1) {
            draft.quests.splice(index, 1);
          }
        }),
        false,
        `quest/removeOptimisticQuest:${tempId}`,
      ),

    setFirstQuestJustCreated: (value) => {
      saveFirstQuestFlag(value);
      set(
        { firstQuestJustCreated: value },
        false,
        `quest/setFirstQuestJustCreated:${value}`,
      );
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
        isLoading ? "quest/list:loadingStart" : "quest/list:loadingFinish",
      ),

    setErrorLoadingQuests: (error) =>
      set(
        produce((draft: QuestSliceState) => {
          draft.errorLoadingQuests = error;
          draft.isLoadingQuests = false;
        }),
        false,
        error ? "quest/list:loadingError" : "quest/list:loadingErrorClear",
      ),

    setLastSynced: (ts) =>
      set({ lastSynced: ts }, false, `quest/setLastSynced:${ts}`),

    resetQuestSlice: () => {
      const currentFirstQuestFlag = loadFirstQuestFlag();
      set({
        ...INITIAL_QUEST_SLICE_STATE,
        firstQuestJustCreated: currentFirstQuestFlag,
        lastSynced: null,
      }, true, 'quest/resetQuestSlice');
    },
  }),
  {
    name: "QuestSlice",
    store: "quest",
    enabled: process.env.NODE_ENV !== "production",
  },
);

/* ---------------------------------------------------------------------------
 * 5. Selectors
 * ------------------------------------------------------------------------ */
export const selectActiveQuest = (state: StoreState): Quest | null => {
  if (!state.questSlice.activeQuestId) return null;
  return (
    state.questSlice.quests.find(
      (q) => q.id === state.questSlice.activeQuestId,
    ) ?? null
  );
};
export const selectAllQuests = (state: StoreState): Quest[] =>
  state.questSlice.quests;
export const selectIsLoadingQuests = (state: StoreState): boolean =>
  state.questSlice.isLoadingQuests;
export const selectFirstQuestJustCreated = (state: StoreState): boolean =>
  state.questSlice.firstQuestJustCreated;
export const selectQuestLastSynced = (state: StoreState): number | null =>
  state.questSlice.lastSynced;

/* ---------------------------------------------------------------------------
 * 6. Hook for Stand-alone Store
 * ------------------------------------------------------------------------ */
// MODIFIED: Removed redundant 'import { create } from "zustand";' and commented out StateCreator import from here.
// 'create' and 'StateCreator' are now handled by the top-level imports.

/**
 * Hook: useQuestStore
 * ------------------------------------------------------------
 * Stand-alone Zustand store built from the quest slice. This
 * mirrors the pattern used in contextSlice, layoutSlice, etc.
 * It uses the `create` function imported at the top of the file.
 */
export const useQuestStore = create<QuestSlice>()(
  createQuestSlice as unknown as StateCreator<QuestSlice, [], []>, // Explicitly type if needed, or keep as unknown
);

export const useSafeSetActiveQuestId = (): QuestSliceActions["setActiveQuestId"] => {
  const action = useQuestStore((s) => (s as QuestSlice).setActiveQuestId);
  if (typeof action !== "function") {
    if (process.env.NODE_ENV === "test") {
      return () => {};
    }
    throw new Error("[questslice] setActiveQuestId action is missing");
  }
  return action;
};
