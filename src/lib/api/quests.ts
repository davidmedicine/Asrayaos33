/* --------------------------------------------------------------------------
 *  src/lib/api/quests.ts
 *
 *  Thin, fully-typed wrappers around Supabase Edge Functions that power the
 *  Quest UI and the “First-Flame Ritual” flow.
 *
 *  Key improvements
 *    – explicit GET/POST so the Edge runtime sees the right verb
 *    – single generic invoke<T>() helper with robust error bubbling
 *    – richer console context for debugging
 *    – no silent “undefined” returns: every wrapper either throws or returns
 *    - dataVersion handling for GET requests to support slice hydration guards
 *    - React-Query helpers with pre-invalidation and prefetching
 *  Last Modified: 2024-07-15
 * ------------------------------------------------------------------------ */

import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import type { QueryClient, UseQueryOptions } from '@tanstack/react-query';
import type { Message as VercelMessage } from 'ai/react'; // From original file structure

import { supabase } from '@/lib/supabase_client/client';
import type {
  FlameImprintServer,
  FlameProgressDayServer,
  FlameStatusPayload, // Expected to include `dataVersion: number`
  SubmitImprintArgs as FirstFlameSubmitImprintArgs,
} from '@/types/flame';

/* -------------------------------------------------------------------------- */
/* 1. Constants & Types                                                     */
/* -------------------------------------------------------------------------- */

export const FIRST_FLAME_SLUG = 'first-flame-ritual';
const BG_SYNC_SUBMIT_IMPRINT_TAG_PREFIX = 'submit-flame-imprint-sync:';

/**
 * Custom error class for network issues encountered before a response from Supabase Functions.
 * e.g., if `fetch` itself fails due to DNS, CORS, or offline status.
 */
export class NetworkError extends Error {
  public readonly type = 'NetworkError';
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export interface QuestPayloadFromServer {
  id: string;
  slug: string;
  name: string;
  type: string; // e.g., 'chat', 'ritual'
  timestamp: string; // last activity timestamp
  createdAt?: string;
  lastMessagePreview: string;
  unreadCount: number;
  agentId: string | null | undefined;
  realm: string | null | undefined;
  isPinned: boolean;
  communityId?: string | null | undefined;
  isFirstFlameRitual?: boolean; // Added client-side
}

/**
 * Represents the successful response from the `submit-flame-imprint` Edge Function.
 * It must include a dataVersion for optimistic update reconciliation.
 */
export interface SubmitImprintSuccessResponse {
  imprint: FlameImprintServer;
  progress: FlameProgressDayServer;
  dataVersion: number;
}

/**
 * Represents the possible outcomes of `api.submitImprint`.
 */
export type SubmitImprintResult =
  | (SubmitImprintSuccessResponse & { queued?: false })
  | { queued: true };

/* -------------------------------------------------------------------------- */
/* 2. Background Sync Helper (Conceptual)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Queues an imprint submission for background sync.
 * @param payload - The data to be synced.
 */
async function queueImprintForSync(
  payload: FirstFlameSubmitImprintArgs & { questId: string; userId: string },
): Promise<void> {
  if (!('serviceWorker' in navigator && 'SyncManager' in window)) {
    const errorMsg = 'Background Sync API not available.';
    console.warn(`[BgSync] ${errorMsg}`);
    throw new Error(errorMsg); // Make it clear to caller that queuing failed
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    // TODO: Persist payload to IndexedDB here.
    // Example: await idbStore.setItem(`queuedImprint:${payload.clientGeneratedId}`, payload);
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[BgSync] TODO: Persist imprint ${payload.clientGeneratedId} to IndexedDB.`);
    }

    const syncTag = `${BG_SYNC_SUBMIT_IMPRINT_TAG_PREFIX}${payload.clientGeneratedId}`;
    await registration.sync.register(syncTag);
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[BgSync] Task ${syncTag} registered for client ID: ${payload.clientGeneratedId}.`);
    }
  } catch (error) {
    console.error(`[BgSync] Failed to register sync task for imprint ${payload.clientGeneratedId}:`, error);
    throw new Error(`Background sync registration failed for imprint ${payload.clientGeneratedId}.`);
  }
}

/* -------------------------------------------------------------------------- */
/* 3. Internal invoke helper                                                  */
/* -------------------------------------------------------------------------- */

type InvokeOptions = Omit<NonNullable<Parameters<typeof supabase.functions.invoke>[1]>, 'signal'> & {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  signal?: AbortSignal; // Make AbortSignal optional
};


/**
 * DRY wrapper around supabase.functions.invoke with improved error handling,
 * logging, and method specification.
 * @template TData The expected data type from a successful function invocation.
 * @param functionName The name of the Supabase Edge Function to invoke.
 * @param options Configuration for the function invocation.
 * @returns A promise that resolves with the data from the function.
 * @throws {FunctionsHttpError | FunctionsRelayError | FunctionsFetchError | NetworkError | Error}
 *         Propagates Supabase-specific errors, wraps fetch issues in NetworkError,
 *         or throws a generic Error for other issues.
 *         Note: This function relies on specific API wrappers to handle cases where `data`
 *         might be `null` but `TData` is non-nullable, by performing checks in those wrappers.
 */
async function invoke<TData>(
  functionName: string,
  options: InvokeOptions = {},
): Promise<TData> {
  // Infer method: GET if no body and no explicit method, else POST.
  const resolvedMethod = options.method ?? (options.body ? 'POST' : 'GET');

  if (process.env.NODE_ENV !== 'production') {
    const bodySummary = options.body ? 'present' : 'empty';
    // Avoid logging potentially sensitive full body content.
    // Mask tokens like "Bearer <token>" if they appear in headers
    const maskedHeaders = options.headers ? { ...options.headers } : undefined;
    if (maskedHeaders?.Authorization && typeof maskedHeaders.Authorization === 'string' && maskedHeaders.Authorization.startsWith('Bearer ')) {
        const parts = maskedHeaders.Authorization.split('.');
        if (parts.length === 3) { // Basic JWT structure check
             maskedHeaders.Authorization = `Bearer ${parts[0].substring(0,2)}.${parts[1].substring(0,2)}...[REDACTED]`;
        } else {
             maskedHeaders.Authorization = `Bearer [REDACTED_MALFORMED_TOKEN]`;
        }
    }
    console.info(`[Edge] -> ${functionName} (${resolvedMethod})`, { body: bodySummary, headers: maskedHeaders });
  }

  try {
    const { data, error } = await supabase.functions.invoke<TData>(functionName, {
      ...options,
      method: resolvedMethod,
      headers: {
        ...(options.body && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    });

    if (error) {
      throw error; // Supabase client errors (FunctionsHttpError, etc.)
    }

    return data as TData;

  } catch (err: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Edge] <- ${functionName} (${resolvedMethod}) Error:`, err instanceof Error ? err.message : String(err));
    }

    if (
      err instanceof FunctionsHttpError ||
      err instanceof FunctionsRelayError ||
      err instanceof FunctionsFetchError
    ) {
      throw err;
    }
    if (err instanceof TypeError && (err.message.includes('Failed to fetch') || err.message.toLowerCase().includes('networkerror'))) {
      throw new NetworkError(`Network request failed for ${functionName}: ${err.message}`, err);
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Unknown error invoking ${functionName}: ${String(err)}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 4. Quests API                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetches the list of all quests for the user.
 * @returns A promise resolving to an array of quest payloads.
 */
export async function fetchQuestList(): Promise<QuestPayloadFromServer[]> {
  const quests = await invoke<QuestPayloadFromServer[]>('list-quests', {
    method: 'GET',
  });
  if (!quests) {
    throw new Error('list-quests returned null data when an array was expected.');
  }
  return quests.map(q => ({
    ...q,
    isFirstFlameRitual: q.slug === FIRST_FLAME_SLUG,
  }));
}

/**
 * Creates a new quest.
 * If the quest is the First Flame ritual, it invalidates and prefetches flame status.
 * @param queryClient The React Query QueryClient instance.
 * @param name The name for the new quest.
 * @param slug Optional slug, e.g., for creating specific ritual quests.
 * @returns A promise resolving to the created quest payload.
 */
export async function createQuest(
  queryClient: QueryClient,
  name: string,
  slug?: string,
): Promise<QuestPayloadFromServer> {
  const newQuest = await invoke<QuestPayloadFromServer>('create-quest', {
    body: { name, slug },
  });

  if (!newQuest) {
    throw new Error('create-quest returned null data when a quest object was expected.');
  }

  if (newQuest.slug === FIRST_FLAME_SLUG) {
    await invalidateFlameStatusQueries(queryClient);
    await prefetchFlameStatus(queryClient);
  }
  return newQuest;
}

/**
 * Placeholder for fetching messages for a quest.
 * @param _questId The ID of the quest.
 * @returns A promise resolving to an array of Vercel messages (currently empty).
 */
export async function fetchMessages(_questId: string): Promise<VercelMessage[]> {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[API] fetchMessages is a placeholder and not implemented.');
  }
  return Promise.resolve([]);
}

/* -------------------------------------------------------------------------- */
/* 5. First-Flame Ritual API                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Fetches the current status of the First Flame ritual.
 * The response payload (FlameStatusPayload) is expected to include `dataVersion`.
 * @returns A promise resolving to the flame status payload.
 * @throws If the response is null or `dataVersion` is missing.
 */
export async function fetchFlameStatus(): Promise<FlameStatusPayload> {
  const result = await invoke<FlameStatusPayload>('get-flame-status', {
    method: 'GET',
  });

  if (!result || typeof result.dataVersion !== 'number') {
    throw new Error('get-flame-status response is invalid: null or missing dataVersion.');
  }
  return result;
}

/**
 * Submits an imprint for a First Flame quest day.
 * Handles online submission and attempts to queue for background sync on network failure.
 * @param questId ID of the First Flame quest instance.
 * @param userId Needed by the Edge Function for operations.
 * @param imprintArgs The arguments for the imprint submission.
 * @returns A promise resolving to a SubmitImprintResult.
 */
export async function submitImprint(
  questId: string,
  userId: string,
  imprintArgs: FirstFlameSubmitImprintArgs,
): Promise<SubmitImprintResult> {
  const payload = {
    questId,
    userId,
    day: imprintArgs.day,
    clientGeneratedId: imprintArgs.clientGeneratedId,
    payloadType: imprintArgs.payloadType,
    payloadText: imprintArgs.payloadText,
    payloadBlobRef: imprintArgs.payloadBlobRef,
  };

  try {
    const result = await invoke<SubmitImprintSuccessResponse>('submit-flame-imprint', {
      body: payload,
    });

    if (!result || typeof result.dataVersion !== 'number') {
      throw new Error('submit-flame-imprint response is invalid: null or missing dataVersion.');
    }
    return { ...result, queued: false };

  } catch (error: unknown) {
    if (error instanceof NetworkError || error instanceof FunctionsFetchError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[API] Network error during submitImprint for ${imprintArgs.clientGeneratedId}. Attempting background sync.`, error);
      }
      try {
        await queueImprintForSync(payload);
        return { queued: true };
      } catch (queueError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[API] Failed to queue imprint ${imprintArgs.clientGeneratedId} for background sync after network error. Original error will be thrown.`, queueError);
        }
        throw error;
      }
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* 6. React-Query Utilities                                                   */
/* -------------------------------------------------------------------------- */

/** Query key for fetching flame status. */
export const FLAME_STATUS_QUERY_KEY = ['flame-status'] as const;
/** Query key for the user's quest list. */
export const QUESTS_QUERY_KEY = ['list-quests'] as const;

/**
 * Default options for `useQuery` hook when fetching flame status.
 * Explicitly typed for React Query v5 strict mode compatibility.
 */
export const defaultFlameStatusQueryOptions: UseQueryOptions<
  FlameStatusPayload,
  FunctionsHttpError | FunctionsRelayError | FunctionsFetchError | NetworkError | Error,
  FlameStatusPayload,
  readonly ['flame-status']
> = {
  queryKey: FLAME_STATUS_QUERY_KEY,
  queryFn: fetchFlameStatus,
  staleTime: 0,
};

/**
 * Invalidates queries related to the First Flame status using the provided QueryClient.
 * @param queryClient The React Query QueryClient instance.
 */
export async function invalidateFlameStatusQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: FLAME_STATUS_QUERY_KEY });
}

/**
 * Wrapper for `invalidateFlameStatusQueries` to match a common call signature.
 * Invalidates queries related to the First Flame status.
 * @param queryClient The React Query QueryClient instance.
 * @param _questId Optional quest ID, ignored in this implementation.
 */
export async function invalidateFlameStatus(
  queryClient: QueryClient,
  _questId?: string, // 2nd arg is ignored but keeps the call-site signature happy
): Promise<void> {
  return invalidateFlameStatusQueries(queryClient);
}

/**
 * Prefetches the First Flame status using the provided QueryClient.
 * @param queryClient The React Query QueryClient instance.
 */
export async function prefetchFlameStatus(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery(defaultFlameStatusQueryOptions);
}