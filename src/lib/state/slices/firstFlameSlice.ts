/**
* @file src/lib/state/slices/firstFlame/firstFlameSlice.ts
* @description Zustand slice for managing the First Flame quest state.
* This slice handles imprints, progress, and interactions with the server for the First Flame quest.
* It is designed to be lean, type-safe, predictable, SSR-safe, and offline-capable.
*
* For SSR and hydration, this slice uses a versioning mechanism. Data fetched (e.g., by a React Query hook)
* should be passed to the `_hydrateFromServer` action along with a `dataVersion` timestamp.
* The slice will only update if the incoming `dataVersion` is newer than its current `version`.
* This prevents redundant updates and aligns with best practices for data hydration.
* @see {@link https://tkdodo.eu/blog/placeholder-and-initial-data-in-react-query | TkDodo on Placeholder vs. Initial Data}
* @see {@link https://supabase.com/docs/guides/auth/row-level-security | Supabase RLS Guide} (for RLS error context)
*/
import { StateCreator } from 'zustand';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

// Assuming AppState is defined in your main store setup and imported
import type { AppState } from '@/lib/state/store'; // Actual import
// --- Centralized Types (Imported from @/types/flame.ts or defined if not yet moved) ---
// For this example, keeping them here for self-containment but ideally they are imported.
import type {
  FlameImprintServer,
  FlameProgressDayServer,
  FlameStatusPayload,
} from '@/types/flame'; // Actual import

import {
  FIRST_FLAME_TOTAL_DAYS,
  toMilliseconds,
} from 'supabase/functions/_shared/5dayquest/FirstFlame';
import type { StartFirstFlameResponsePayload } from '@/lib/core/FirstFlame.zod';

// --- API Abstraction (Imported from @/lib/api/quests.ts) ---
// This is a conceptual import. The actual implementation of these API functions
// would reside in `@/lib/api/quests.ts`.
import * as flameApi from '@/lib/api/quests'; // Actual import

// --- Client-Side Types (used within the slice state) ---
export interface FlameImprintClient {
  user_id: string;
  day: 1 | 2 | 3 | 4 | 5;
  payload_type: string;
  payload_text?: string | null;
  payload_blob_ref?: string | null;
  moderation_passed?: boolean | null;
  moderation_details?: Record<string, unknown> | null;
  client_generated_id: string;
  created_at_ms: number; // Stored as milliseconds
  isOptimistic?: boolean;
  syncStatus?: 'pending' | 'synced' | 'error' | 'queued';
}

export interface FlameProgressDayClient {
  user_id: string;
  day: 1 | 2 | 3 | 4 | 5;
  imprint_ref: string;
  day_completed_at_ms: number; // Stored as milliseconds
  is_quest_fully_completed: boolean;
  updated_at_ms: number; // Stored as milliseconds
}

export interface FirstFlameClientOverallProgress {
  currentDayTarget: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  isQuestComplete: boolean;
  daysSuccessfullyImprinted: (1 | 2 | 3 | 4 | 5)[];
  lastSuccessfulImprintAtMs?: number | null;
}

export interface SubmitImprintArgs {
  day: 1 | 2 | 3 | 4 | 5;
  clientGeneratedId: string;
  payloadType: string;
  payloadText?: string;
  payloadBlobRef?: string;
}
// --- End Client-Side Types ---

// --- Slice Error Type ---
export type SliceErrorType = 'supabase' | 'validation' | 'network' | 'application' | 'unknown';
export interface SliceError {
  type: SliceErrorType;
  message: string;
  status?: number; // HTTP status for supabase/network errors
  code?: string; // Supabase error code or internal code
  isRLSError?: boolean;
  details?: unknown; // Zod issues, Supabase error context, etc.
}
const supabaseRLSDocsLink = "https://supabase.com/docs/guides/auth/row-level-security";

// --- Zustand Slice Definition ---
export interface FirstFlameState {
  version: number;
  imprints: FlameImprintClient[];
  progressDays: FlameProgressDayClient[];
  clientOverallProgress: FirstFlameClientOverallProgress | null;
  latestInitiationData: StartFirstFlameResponsePayload | null;
  initiationStatus: 'idle' | 'loading' | 'success' | 'error';
  submitStatus: 'idle' | 'submitting' | 'success' | 'error' | 'queued';
  lastError: SliceError | null;
  hasBootstrapped: boolean;
}

export interface FirstFlameOptimisticActions {
  /** Adds an imprint optimistically. Called internally by submitImprint. */
  _addImprint: (imprintData: Omit<FlameImprintClient, 'created_at_ms' | 'user_id' | 'isOptimistic' | 'syncStatus'> & { userId: string }) => FlameImprintClient;
  /**
   * Updates the status of an optimistic imprint.
   * Can be called by the slice itself (for online success/failure)
   * or by external systems like a Service Worker (for successful background sync).
   * This method is a candidate for Immer optimization if complex state updates are frequent.
   */
  _updateImprintStatus: (
    clientGeneratedId: string,
    status: FlameImprintClient['syncStatus'],
    serverData?: { imprint: FlameImprintServer; progress: FlameProgressDayServer }
  ) => void;
  /** Reverts an optimistic imprint. Called internally if submission fails catastrophically before queuing. */
  _revertImprint: (clientGeneratedId: string) => void;
}

export interface FirstFlameActions {
  _deriveAndSetClientOverallProgress: () => void;
  _hydrateFromServer: (payload: FlameStatusPayload) => void;
  setError: (error: SliceError) => void;
  clearError: () => void;
  prepareToStartFirstFlame: () => Promise<StartFirstFlameResponsePayload | null>;
  submitImprint: (args: SubmitImprintArgs) => Promise<boolean>; // Returns true on successful handoff (synced or queued)
  ensureBootstrapped: () => Promise<void>;
  optimistic: FirstFlameOptimisticActions;
  resetFirstFlameSlice: () => void;
}

export type FirstFlameSlice = FirstFlameState & FirstFlameActions;

const initialFirstFlameState: FirstFlameState = {
  version: 0,
  imprints: [],
  progressDays: [],
  clientOverallProgress: null,
  latestInitiationData: null,
  initiationStatus: 'idle',
  submitStatus: 'idle',
  lastError: null,
  hasBootstrapped: false,
};

// --- Helper Functions ---
const deriveClientOverallProgress = (
  imprints: FlameImprintClient[] = [],
  progressDays: FlameProgressDayClient[] = []
): FirstFlameClientOverallProgress => {
  const daysSuccessfullyImprintedMap = new Map<number, number>();
  progressDays.forEach(pd => {
    const correspondingImprint = imprints.find(
      imp => imp.client_generated_id === pd.imprint_ref && imp.syncStatus === 'synced'
    );
    if (correspondingImprint) {
      daysSuccessfullyImprintedMap.set(pd.day, pd.day_completed_at_ms);
    }
  });

  const daysSuccessfullyImprinted = Array.from(
    daysSuccessfullyImprintedMap.keys()
  ).sort() as (1 | 2 | 3 | 4 | 5)[];

  let currentDayTarget: FirstFlameClientOverallProgress['currentDayTarget'] = 0;
  const syncedImprintsExist = imprints.some(i => i.syncStatus === 'synced');
  // A quest is considered started if there are any synced imprints or any progress days
  // (which imply at least one imprint was made, even if not currently in client state,
  // or the quest was initiated via prepareToStartFirstFlame).
  const questIsEffectivelyStarted = syncedImprintsExist || progressDays.length > 0;


  if (!questIsEffectivelyStarted) {
    currentDayTarget = 0;
  } else if (daysSuccessfullyImprinted.length === 0) {
    currentDayTarget = 1;
  } else {
    const maxCompletedDay = Math.max(0, ...daysSuccessfullyImprinted) as (0 | 1 | 2 | 3 | 4 | 5);
    currentDayTarget =
      maxCompletedDay === FIRST_FLAME_TOTAL_DAYS
        ? (FIRST_FLAME_TOTAL_DAYS + 1) as 6
        : ((maxCompletedDay + 1) as 1 | 2 | 3 | 4 | 5 | 6);
  }

  const isQuestComplete = progressDays.some(
    pd =>
      pd.day === FIRST_FLAME_TOTAL_DAYS &&
      pd.is_quest_fully_completed &&
      daysSuccessfullyImprintedMap.has(FIRST_FLAME_TOTAL_DAYS)
  );

  const lastSuccessfulImprintAtMs =
    daysSuccessfullyImprinted.length > 0
      ? daysSuccessfullyImprintedMap.get(daysSuccessfullyImprinted[daysSuccessfullyImprinted.length - 1])
      : null;

  return {
    currentDayTarget,
    isQuestComplete,
    daysSuccessfullyImprinted,
    lastSuccessfulImprintAtMs,
  };
};

const parseSupabaseError = (error: any, contextMessage: string): SliceError => {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status;
    const isRLS = status === 403 || status === 401;
    return {
      type: 'supabase',
      message: isRLS
        ? `Access Denied during ${contextMessage}. Please check Supabase Row Level Security. (Status: ${status}) See: ${supabaseRLSDocsLink}`
        : `Supabase HTTP error during ${contextMessage}: ${status} - ${error.message}`,
      status,
      code: String(error.context.code || status),
      isRLSError: isRLS,
      details: error.context,
    };
  }
  if (error instanceof FunctionsRelayError) {
    return { type: 'supabase', message: `Supabase relay error during ${contextMessage}: ${error.message}`, details: error };
  }
  if (error instanceof FunctionsFetchError) {
     return { type: 'network', message: `Network error during ${contextMessage}: ${error.message}`, details: error };
  }
  return { type: 'unknown', message: error?.message || `An unknown error occurred during ${contextMessage}.` , details: error };
};


// --- Slice Creator ---
export const createFirstFlameSlice: StateCreator<
  AppState,
  [["zustand/immer", never]], // Compatible with Immer if used at store level
  [],
  FirstFlameSlice
> = (set, get) => ({
  ...initialFirstFlameState,

  _deriveAndSetClientOverallProgress: () => {
    // This is a read + write, Immer can be beneficial if state is complex.
    // For now, simple set assuming Immer wraps it or careful manual update.
    set(state => ({
        ...state,
        clientOverallProgress: deriveClientOverallProgress(state.imprints, state.progressDays)
    }));
  },

  _hydrateFromServer: (payload) => {
    if ((get().version ?? 0) >= payload.dataVersion && get().version !== 0) {
      return; // Incoming data is not newer or same as initial, skip hydration
    }

    const newImprintsClient = payload.imprints.map((serverImp): FlameImprintClient => ({
      ...serverImp,
      created_at_ms: toMilliseconds(serverImp.created_at)!,
      syncStatus: 'synced',
      isOptimistic: false,
    }));

    const newProgressDaysClient = payload.progressDays.map((serverProg): FlameProgressDayClient => ({
      ...serverProg,
      day_completed_at_ms: toMilliseconds(serverProg.day_completed_at)!,
      updated_at_ms: toMilliseconds(serverProg.updated_at)!,
    }));

    set(state => {
      const imprintsMap = new Map(state.imprints.map(imp => [imp.client_generated_id, imp]));
      newImprintsClient.forEach(imp => imprintsMap.set(imp.client_generated_id, imp));
      const mergedImprints = Array.from(imprintsMap.values());

      const progressDaysMap = new Map(state.progressDays.map(pd => [pd.day, pd]));
      newProgressDaysClient.forEach(pd => progressDaysMap.set(pd.day, pd));
      const mergedProgressDays = Array.from(progressDaysMap.values()).sort((a,b) => a.day - b.day);

      return {
        ...state,
        imprints: mergedImprints,
        progressDays: mergedProgressDays,
        version: payload.dataVersion,
        lastError: null, // Clear previous errors on successful hydration
      };
    });
    get()._deriveAndSetClientOverallProgress();
  },

  setError: (error) => {
    set(state => ({ ...state, lastError: error }));
  },

  clearError: () => {
    set(state => ({ ...state, lastError: null }));
  },

  prepareToStartFirstFlame: async () => {
    set(state => ({ ...state, initiationStatus: 'loading', lastError: null }));
    try {
      const response = await flameApi.prepareToStartFirstFlame();

      if (!response.success || !response.overallProgress) {
        const appError: SliceError = {
            type: 'application',
            message: response.message || 'Ritual could not be initiated.',
            code: response.code,
            details: response
        };
        get().setError(appError);
        set(state => ({ ...state, initiationStatus: 'error', latestInitiationData: response }));
        return response;
      }

      const op = response.overallProgress;
      set(state => ({
        ...state,
        clientOverallProgress: {
          currentDayTarget: op.currentDayTarget,
          isQuestComplete: op.isQuestComplete,
          daysSuccessfullyImprinted: [],
          lastSuccessfulImprintAtMs: op.lastImprintAt ? toMilliseconds(op.lastImprintAt) : null,
        },
        latestInitiationData: response,
        initiationStatus: 'success',
      }));
      get()._deriveAndSetClientOverallProgress();
      return response;

    } catch (error: any) {
      const parsedError = parseSupabaseError(error, 'First Flame initiation');
      get().setError(parsedError);
      set(state => ({ ...state, initiationStatus: 'error' }));
      return null;
    }
  },

  ensureBootstrapped: async () => {
    if (get().hasBootstrapped) return;
    const delayFor = (attempt: number) =>
      Math.min(2 ** attempt * 1000 + Math.random() * 200, 30_000);

    let attempt = 0;
    let status: any = await flameApi.fetchFlameStatus();
    while (status?.processing && attempt < 3) {
      await new Promise(res => setTimeout(res, delayFor(attempt)));
      attempt += 1;
      status = await flameApi.fetchFlameStatus();
    }

    if (!status?.processing) {
      try {
        get()._hydrateFromServer(status);
      } catch (e) {
        /* ignore hydrate errors */
      }

      const def = status.dayDefinition;
      if (def) {
        const parts: string[] = [];
        if (Array.isArray(def.narrativeOpening) && def.narrativeOpening.length)
          parts.push(...def.narrativeOpening);
        if (def.oracleGuidance?.interactionPrompt)
          parts.push(def.oracleGuidance.interactionPrompt);
        const content = parts.join('\n\n').trim();
        if (content) {
          // Quest ID is determined dynamically; seed messages when available
        }
      }

      set(state => ({ ...state, hasBootstrapped: true }));
      if (get().setFirstQuestJustCreated) {
        get().setFirstQuestJustCreated(true);
      }
    }
  },

  optimistic: {
    _addImprint: (imprintData) => {
      const nowMs = Date.now();
      const optimisticImprint: FlameImprintClient = {
        ...imprintData,
        created_at_ms: nowMs,
        isOptimistic: true,
        syncStatus: 'pending',
        moderation_passed: null,
        moderation_details: null,
      };
      set(state => ({
        ...state,
        imprints: [
          ...state.imprints.filter(i => i.client_generated_id !== optimisticImprint.client_generated_id),
          optimisticImprint,
        ],
        // submitStatus will be set by the caller (submitImprint)
        lastError: null,
      }));
      return optimisticImprint;
    },
    // This method is a good candidate for Immer if updates become very complex or performance is an issue.
    // For now, using functional updates with spread.
    _updateImprintStatus: (clientGeneratedId, status, serverData) => {
      set(state => {
        const imprintIndex = state.imprints.findIndex(i => i.client_generated_id === clientGeneratedId);
        if (imprintIndex === -1) return state; // Imprint not found, do nothing

        let newImprints = [...state.imprints];
        let newProgressDays = [...state.progressDays];
        let newSubmitStatus = state.submitStatus; // Will be updated by caller usually

        const currentImprint = newImprints[imprintIndex];

        if (status === 'synced' && serverData?.imprint && serverData?.progress) {
          newImprints[imprintIndex] = {
            ...currentImprint,
            ...serverData.imprint,
            user_id: serverData.imprint.user_id,
            created_at_ms: toMilliseconds(serverData.imprint.created_at)!,
            isOptimistic: false,
            syncStatus: 'synced',
          };

          const syncedProgressDay: FlameProgressDayClient = {
            ...serverData.progress,
            day_completed_at_ms: toMilliseconds(serverData.progress.day_completed_at)!,
            updated_at_ms: toMilliseconds(serverData.progress.updated_at)!,
          };
          
          const progressDayIndex = newProgressDays.findIndex(pd => pd.day === syncedProgressDay.day);
          if (progressDayIndex !== -1) {
            newProgressDays[progressDayIndex] = syncedProgressDay;
          } else {
            newProgressDays.push(syncedProgressDay);
            newProgressDays.sort((a,b) => a.day - b.day);
          }
          // newSubmitStatus = 'success'; // Caller (submitImprint) sets this
        } else if (status === 'error') {
          newImprints[imprintIndex] = { ...currentImprint, syncStatus: 'error', isOptimistic: false };
          // newSubmitStatus = 'error'; // Caller (submitImprint) sets this
        } else if (status === 'queued') {
          newImprints[imprintIndex] = { ...currentImprint, syncStatus: 'queued', isOptimistic: true }; // Still optimistic while queued
          // newSubmitStatus = 'queued'; // Caller (submitImprint) sets this
        } else if (status === 'pending') {
           newImprints[imprintIndex] = { ...currentImprint, syncStatus: 'pending', isOptimistic: true };
        }
        return { ...state, imprints: newImprints, progressDays: newProgressDays, submitStatus: newSubmitStatus };
      });
      // Note: _deriveAndSetClientOverallProgress is typically called after the full submitImprint logic
    },
    _revertImprint: (clientGeneratedId) => {
      set(state => ({
        ...state,
        imprints: state.imprints.filter(i => i.client_generated_id !== clientGeneratedId),
      }));
    },
  },

  submitImprint: async (args) => {
    // User ID should ideally come from an auth slice: `const userId = get().authSlice.userId;`
    const userId = 'mock-user-id'; // Placeholder
    if (!userId) {
      const authError: SliceError = { type: 'application', message: "User not authenticated for submitting imprint.", code: 'AUTH_REQUIRED' };
      get().setError(authError);
      set(state => ({ ...state, submitStatus: 'error' }));
      return false;
    }

    set(state => ({ ...state, submitStatus: 'submitting', lastError: null }));
    get().optimistic._addImprint({ ...args, userId });

    try {
      const result = await flameApi.submitImprint({ ...args, userId });

      if (result.queued) {
        get().optimistic._updateImprintStatus(args.clientGeneratedId, 'queued');
        set(state => ({ ...state, submitStatus: 'queued' }));
        // Optionally set a message: get().setError({ type: 'info', message: 'Imprint queued...' });
      } else {
        get().optimistic._updateImprintStatus(args.clientGeneratedId, 'synced', {
          imprint: result.imprint,
          progress: result.progress,
        });
        set(state => ({ ...state, submitStatus: 'success' }));
      }
      get()._deriveAndSetClientOverallProgress();
      return true;

    } catch (error: any) {
      const parsedError = parseSupabaseError(error, `imprint submission for Day ${args.day}`);
      get().setError(parsedError);
      get().optimistic._updateImprintStatus(args.clientGeneratedId, 'error');
      set(state => ({ ...state, submitStatus: 'error' }));
      get()._deriveAndSetClientOverallProgress();
      return false;
    }
  },

  resetFirstFlameSlice: () => {
    set(initialFirstFlameState);
    // `deriveClientOverallProgress` will naturally result in initial progress if called.
    // It's okay to call it for consistency, or omit if initial state is always `null` progress.
    // get()._deriveAndSetClientOverallProgress();
  },
});

// --- Selectors ---
export const selectClientOverallProgress = (state: AppState): FirstFlameClientOverallProgress | null => state.firstFlame.clientOverallProgress;

export const makeSelectImprintsForDay = (day: 1 | 2 | 3 | 4 | 5) => (state: AppState): FlameImprintClient[] =>
  state.firstFlame.imprints.filter(imp => imp.day === day);

export const makeSelectImprintById = (clientGeneratedId: string) => (state: AppState): FlameImprintClient | undefined =>
  state.firstFlame.imprints.find(imp => imp.client_generated_id === clientGeneratedId);

export const selectAllImprints = (state: AppState): FlameImprintClient[] => state.firstFlame.imprints;
export const selectProgressDays = (state: AppState): FlameProgressDayClient[] => state.firstFlame.progressDays;
export const selectSubmitStatus = (state: AppState): FirstFlameState['submitStatus'] => state.firstFlame.submitStatus;
export const selectInitiationStatus = (state: AppState): FirstFlameState['initiationStatus'] => state.firstFlame.initiationStatus;
export const selectLastError = (state: AppState): SliceError | null => state.firstFlame.lastError;
export const selectLatestInitiationData = (state: AppState): StartFirstFlameResponsePayload | null => state.firstFlame.latestInitiationData;
export const selectDataVersion = (state: AppState): number => state.firstFlame.version;
export const selectHasBootstrapped = (state: AppState): boolean => state.firstFlame.hasBootstrapped;