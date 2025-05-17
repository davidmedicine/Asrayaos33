/**
 * contextSlice.ts – Manages contextual data for quests with LRU cache.
 * ---------------------------------------------------------------------------------
 * • Stores context data (Flame Ritual progress/definitions, generic quest info) per quest ID.
 * • Implements a simple LRU cache for context data to manage memory.
 * • Manages loading and error states on a per-quest basis.
 * • Designed for integration with React Query (which owns server state).
 * • SSR-safe and type-safe.
 * • Provides explicit action names for developer tools.
 *
 * This slice acts as a client-side cache/view of context data, primarily updated
 * via React Query hooks interacting with API endpoints (e.g., 'get-flame-status').
 *
 * Patch v2.0.0 – YYYY-MM-DD (Based on "ultra-hard" feedback round 2)
 * • Added LRU cache mechanism for `contextsByQuestId`, `isLoadingContext`, `contextError`.
 * • Ensured all `set()` calls have explicit, descriptive action labels for Redux DevTools.
 * • Refined action logic to ensure consistent updates across related state maps.
 * • Reaffirmed use of `Date.now()` for `lastFetched`.
 * • Highlighted best practices for calling reset/loading states from React Query.
 * ---------------------------------------------------------------------------------
 */

import { StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { StoreState } from '@/lib/state/store';
import type {
  FlameProgressData,
  FlameDayDefinition,
} from '@ritual/FirstFlame';        // ← UPDATED ALIAS

/* ---------------------------------------------------------------------------
 * 1. Constants & Configuration
 * ------------------------------------------------------------------------ */
const MAX_CACHED_CONTEXTS = 30; // Tune based on expected usage and memory constraints

/* ---------------------------------------------------------------------------
 * 2. Interface Definitions
 * ------------------------------------------------------------------------ */
export interface QuestContext {
  overallProgress: FlameProgressData | null;
  dayDefinition: FlameDayDefinition | null;
  genericTitle?: string;
  genericSummary?: string;
  lastFetched: number; // Using Date.now() for simplicity and consistency
}

export interface ContextSliceState {
  contextsByQuestId: Record<string, QuestContext | null>;
  isLoadingContext: Record<string, boolean>;
  contextError: Record<string, string | null>;
  // Order of keys for LRU, not strictly needed if sorting entries each time,
  // but can be an optimization if maintained carefully. For simplicity, we'll sort on eviction.
}

export interface ContextSliceActions {
  setQuestContext: (questId: string, context: Omit<QuestContext, 'lastFetched'>) => void;
  setLoadingQuestContext: (questId: string, isLoading: boolean) => void;
  setErrorQuestContext: (questId: string, error: string | null) => void;
  clearQuestContext: (questId: string) => void;
  resetContextSlice: () => void;
  // Internal helper for LRU eviction, not typically exposed externally
  _evictOldestContextIfNecessary: () => void;
}

export type ContextSlice = ContextSliceState & ContextSliceActions;

/* ---------------------------------------------------------------------------
 * 3. Initial State
 * ------------------------------------------------------------------------ */
export const INITIAL_CONTEXT_SLICE_STATE: ContextSliceState = {
  contextsByQuestId: {},
  isLoadingContext: {},
  contextError: {},
};

/* ---------------------------------------------------------------------------
 * 4. Slice Creator
 * ------------------------------------------------------------------------ */
export const createContextSlice: StateCreator<
  StoreState,
  [['zustand/devtools', never]],
  [],
  ContextSlice
> = devtools(
  (set, get) => ({
    ...INITIAL_CONTEXT_SLICE_STATE,

    _evictOldestContextIfNecessary: () => {
      const currentContexts = get().contextsByQuestId;
      const numContexts = Object.keys(currentContexts).length;

      if (numContexts > MAX_CACHED_CONTEXTS) {
        const contextsToRemove = numContexts - MAX_CACHED_CONTEXTS;
        const sortedContexts = Object.entries(currentContexts)
          .filter(([, ctx]) => ctx !== null)
          .sort(([, a], [, b]) => (a!.lastFetched ?? 0) - (b!.lastFetched ?? 0)); // Oldest first

        const oldestQuestIds = sortedContexts
          .slice(0, contextsToRemove)
          .map(([id]) => id);

        if (oldestQuestIds.length) {
          set(
            (state) => {
              const newContexts = { ...state.contextsByQuestId };
              const newIsLoading = { ...state.isLoadingContext };
              const newErrors = { ...state.contextError };
              oldestQuestIds.forEach((id) => {
                delete newContexts[id];
                delete newIsLoading[id];
                delete newErrors[id];
              });
              return {
                contextsByQuestId: newContexts,
                isLoadingContext: newIsLoading,
                contextError: newErrors,
              };
            },
            false,
            'context/_evictOldestContexts'
          );
        }
      }
    },

    setQuestContext: (questId, ctx) => {
      if (!questId) return;
      const fullContext: QuestContext = { ...ctx, lastFetched: Date.now() };

      set(
        (state) => ({
          contextsByQuestId: { ...state.contextsByQuestId, [questId]: fullContext },
          isLoadingContext: { ...state.isLoadingContext, [questId]: false },
          contextError: { ...state.contextError, [questId]: null },
        }),
        false,
        `context/setQuestContext:${questId}`
      );
      get()._evictOldestContextIfNecessary();
    },

    setLoadingQuestContext: (questId, isLoading) => {
      if (!questId) return;
      set(
        (state) => ({
          isLoadingContext: { ...state.isLoadingContext, [questId]: isLoading },
          ...(isLoading && { contextError: { ...state.contextError, [questId]: null } }),
        }),
        false,
        isLoading ? `context/startLoading:${questId}` : `context/finishLoading:${questId}`
      );
    },

    setErrorQuestContext: (questId, error) => {
      if (!questId) return;
      set(
        (state) => ({
          contextError: { ...state.contextError, [questId]: error },
          isLoadingContext: { ...state.isLoadingContext, [questId]: false },
        }),
        false,
        error ? `context/setError:${questId}` : `context/clearError:${questId}`
      );
    },

    clearQuestContext: (questId) => {
      if (!questId) return;
      set(
        (state) => {
          const { [questId]: _c, ...remainingCtx } = state.contextsByQuestId;
          const { [questId]: _l, ...remainingLoad } = state.isLoadingContext;
          const { [questId]: _e, ...remainingErr } = state.contextError;
          return {
            contextsByQuestId: remainingCtx,
            isLoadingContext: remainingLoad,
            contextError: remainingErr,
          };
        },
        false,
        `context/clearQuestContext:${questId}`
      );
    },

    resetContextSlice: () => {
      set(INITIAL_CONTEXT_SLICE_STATE, true, 'context/resetContextSlice');
    },
  }),
  { name: 'ContextSlice', store: 'context', enabled: process.env.NODE_ENV !== 'production' }
);

/* ---------------------------------------------------------------------------
 * 5. Selectors
 * ------------------------------------------------------------------------ */
export const selectQuestContextByQuestId =
  (questId: string | null | undefined) =>
  (st: StoreState): QuestContext | null =>
    questId ? st.contextSlice?.contextsByQuestId[questId] ?? null : null;

export const selectIsLoadingContextByQuestId =
  (questId: string | null | undefined) =>
  (st: StoreState): boolean =>
    questId ? st.contextSlice?.isLoadingContext[questId] ?? false : false;

export const selectContextErrorByQuestId =
  (questId: string | null | undefined) =>
  (st: StoreState): string | null =>
    questId ? st.contextSlice?.contextError[questId] ?? null : null;

/* ---------------------------------------------------------------------------
 * 6. Stand-alone hook export (for components that only need this slice)
 * ------------------------------------------------------------------------ */
import { create } from 'zustand';

export const useContextStore = create<ContextSlice>()(
  createContextSlice as unknown as StateCreator<ContextSlice>
);
