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
*    - Zod validation for key API responses
*    - Specific error types for better control flow (e.g., ProcessingError)
*  Last Modified: 2024-07-17 (Incorporated diff and ultra-hard review)
* ------------------------------------------------------------------------ */

import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import type { QueryClient, UseQueryOptions } from "@tanstack/react-query";
import type { Message as VercelMessage } from "ai/react"; // From original file structure
import { z } from 'zod';

import { supabase } from "@/lib/supabase_client/client";
import type {
  FlameImprintServer,
  FlameProgressDayServer,
  FlameStatusPayload, // This is the type when data IS available (processing: false)
  SubmitImprintArgs as FirstFlameSubmitImprintArgs,
} from "@/types/flame";

// --- Zod Schemas for API Response Validation ---
// (These would ideally be co-located with their respective type definitions or in a dedicated zod schema file)

// Basic ISO8601 DateTime string schema
const zTimestampISO = z.string().datetime({ offset: true }).brand<'ISO8601DateTime'>();

const zFlameProgressDayServer = z.object({
  day: z.number().int().min(1),
  completed: z.boolean(),
  timestamp: zTimestampISO.optional().nullable(), // Assuming timestamp can be null or undefined
  // Example additional fields:
  // reflection: z.string().optional().nullable(),
  // imprintsCount: z.number().int().optional(),
}).passthrough(); // Use passthrough if FlameProgressDayServer has more fields not strictly validated here

const zFlameImprintServer = z.object({
  id: z.string().uuid(),
  day: z.number().int().min(1),
  type: z.enum(['text', 'image', 'audio', 'video', 'reflection']), // Example enum, adjust as needed
  payloadText: z.string().optional().nullable(),
  payloadBlobRef: z.string().optional().nullable(),
  timestamp: zTimestampISO,
  clientGeneratedId: z.string().uuid().optional(),
  // Example additional fields:
  // uploadedAt: zTimestampISO.optional().nullable(),
  // processedAt: zTimestampISO.optional().nullable(),
}).passthrough(); // Use passthrough if FlameImprintServer has more fields

/**
 * Zod schema for parsing the raw response from 'get-flame-status' Edge Function.
 * This type represents what the server sends, which might indicate processing.
 */
export const zFlameStatusServerResponse = z.object({
  processing: z.boolean(),
  dataVersion: z.number().int().optional(),        // Required if processing is false
  currentDay: z.number().int().min(0).optional(),  // Required if processing is false
  totalDays: z.number().int().min(1).optional(),   // Required if processing is false
  ritualStartDate: zTimestampISO.nullable().optional(), // Required if processing is false (can be null)
  progress: z.array(zFlameProgressDayServer).optional(), // Required if processing is false
  imprints: z.array(zFlameImprintServer).optional(),   // Required if processing is false
  // Add any other known properties from FlameStatusPayload, marking as optional
  // For example:
  // ritualCompleted: z.boolean().optional(),
  // nextDayUnlockTime: zTimestampISO.nullable().optional(),
}).passthrough();
export type FlameStatusServerResponse = z.infer<typeof zFlameStatusServerResponse>;


/* -------------------------------------------------------------------------- */
/* 1. Constants & Types                                                     */
/* -------------------------------------------------------------------------- */

export const FIRST_FLAME_SLUG = "first-flame-ritual";
const BG_SYNC_SUBMIT_IMPRINT_TAG_PREFIX = "submit-flame-imprint-sync:";

/** Edge Function error codes shared across clients, returned in response body. */
export enum EdgeErrorCode {
  AUTH = 'AUTH_ERROR',
  DB = 'DB_ERROR',
  STORAGE = 'STORAGE_ERROR',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  // Add more specific error codes as needed
}

/**
 * Custom error class for network issues encountered before a response from Supabase Functions.
 * e.g., if `fetch` itself fails due to DNS, CORS, or offline status.
 */
export class NetworkError extends Error {
  public readonly type = "NetworkError";
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Custom error class to indicate that the Flame status is still processing.
 * Used with React Query's retry mechanism.
 */
export class ProcessingError extends Error {
  public readonly processing = true;
  constructor(message = "Data is currently processing. Please try again shortly.") {
    super(message);
    this.name = "ProcessingError";
    Object.setPrototypeOf(this, ProcessingError.prototype);
  }
}


export interface QuestPayloadFromServer {
  id: string;
  slug: string;
  name: string;
  type: string; // e.g., 'chat', 'ritual'
  timestamp: string; // last activity timestamp, ISO8601
  createdAt?: string; // ISO8601
  lastMessagePreview: string;
  unreadCount: number;
  agentId: string | null | undefined;
  realm: string | null | undefined;
  isPinned: boolean;
  communityId?: string | null | undefined;
  isFirstFlameRitual?: boolean; // Added client-side
}

export const zQuestPayloadFromServer = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  type: z.string(), // Consider z.enum(['chat', 'ritual', ...]) if types are fixed
  timestamp: zTimestampISO,
  createdAt: zTimestampISO.optional(),
  lastMessagePreview: z.string(),
  unreadCount: z.number().int().nonnegative(),
  agentId: z.string().uuid().nullable().optional(), // Assuming agentId is a UUID
  realm: z.string().nullable().optional(),
  isPinned: z.boolean(),
  communityId: z.string().uuid().nullable().optional(), // Assuming communityId is a UUID
  isFirstFlameRitual: z.boolean().optional(), // Will be set client-side
}).passthrough();

export interface ListQuestsResponse {
  data: QuestPayloadFromServer[];
  serverTimestamp: string; // ISO8601
  error?: EdgeErrorCode; // Server can indicate an error in the response body
}

export const zListQuestsResponse = z.object({
  data: z.array(zQuestPayloadFromServer),
  serverTimestamp: zTimestampISO,
  error: z.nativeEnum(EdgeErrorCode).optional(),
});


/**
 * Represents the successful response from the `submit-flame-imprint` Edge Function.
 * It must include a dataVersion for optimistic update reconciliation.
 */
export interface SubmitImprintSuccessResponse {
  imprint: FlameImprintServer;
  progress: FlameProgressDayServer;
  dataVersion: number;
}

// Zod schema for SubmitImprintSuccessResponse (optional, but good for consistency)
export const zSubmitImprintSuccessResponse = z.object({
  imprint: zFlameImprintServer,
  progress: zFlameProgressDayServer,
  dataVersion: z.number().int(),
});


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
  if (!("serviceWorker" in navigator && "SyncManager" in window)) {
    const errorMsg = "Background Sync API not available.";
    console.warn(`[BgSync] ${errorMsg}`);
    throw new Error(errorMsg); // Make it clear to caller that queuing failed
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    // TODO: Persist payload to IndexedDB here.
    // Example: await idbStore.setItem(`queuedImprint:${payload.clientGeneratedId}`, payload);
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[BgSync] TODO: Persist imprint ${payload.clientGeneratedId} to IndexedDB.`,
      );
    }

    const syncTag = `${BG_SYNC_SUBMIT_IMPRINT_TAG_PREFIX}${payload.clientGeneratedId}`;
    await registration.sync.register(syncTag);
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[BgSync] Task ${syncTag} registered for client ID: ${payload.clientGeneratedId}.`,
      );
    }
  } catch (error) {
    console.error(
      `[BgSync] Failed to register sync task for imprint ${payload.clientGeneratedId}:`,
      error,
    );
    throw new Error(
      `Background sync registration failed for imprint ${payload.clientGeneratedId}. Original cause: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 3. Internal invoke helper & Utilities                                      */
/* -------------------------------------------------------------------------- */

type InvokeOptions = Omit<
  NonNullable<Parameters<typeof supabase.functions.invoke>[1]>,
  "signal" // `signal` is handled explicitly if needed
> & {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  signal?: AbortSignal; // Make AbortSignal explicitly optional
};


/**
 * DRY wrapper around supabase.functions.invoke with improved error handling,
 * logging, and method specification.
 * @template TData The expected data type from a successful function invocation (after JSON parsing).
 * @param functionName The name of the Supabase Edge Function to invoke.
 * @param options Configuration for the function invocation.
 * @returns A promise that resolves with the data from the function.
 * @throws {FunctionsHttpError | FunctionsRelayError | FunctionsFetchError | NetworkError | Error}
 *         Propagates Supabase-specific errors, wraps fetch issues in NetworkError,
 *         or throws a generic Error for other issues.
 */
async function invoke<TData>(
  functionName: string,
  options: InvokeOptions = {},
): Promise<TData> {
  const resolvedMethod = options.method ?? (options.body ? "POST" : "GET");

  if (resolvedMethod === 'GET' && options.body) {
    const msg = `[EdgeInvoke] FATAL: GET request to '${functionName}' must not include a body. Supabase JS client might convert this to POST, leading to unexpected behavior.`;
    console.error(msg, { options });
    // Throw an error because this is a programming mistake.
    throw new TypeError(msg.replace('[EdgeInvoke] FATAL: ', ''));
  }

  if (process.env.NODE_ENV !== "production") {
    const bodySummary = options.body
      ? typeof options.body === 'string'
        ? `string[${options.body.length}]`
        : options.body instanceof FormData
        ? 'FormData'
        : typeof options.body === 'object'
        ? 'object' // Could log keys if safe: Object.keys(options.body).join(', ')
        : 'other'
      : 'empty';

    const maskedHeaders = options.headers ? { ...options.headers } : {};
    if (
      maskedHeaders.Authorization &&
      typeof maskedHeaders.Authorization === "string" &&
      maskedHeaders.Authorization.startsWith("Bearer ")
    ) {
      const tokenParts = maskedHeaders.Authorization.substring(7).split(".");
      if (tokenParts.length === 3) { // Basic JWT structure (header.payload.signature)
        maskedHeaders.Authorization = `Bearer ${tokenParts[0].substring(0, Math.min(2, tokenParts[0].length))}...[REDACTED_JWT_PAYLOAD]...${tokenParts[2].substring(tokenParts[2].length - Math.min(2, tokenParts[2].length))}`;
      } else {
        maskedHeaders.Authorization = `Bearer [REDACTED_TOKEN]`;
      }
    }
    console.info(`[EdgeInvoke] -> ${functionName} (${resolvedMethod})`, {
      body: bodySummary,
      headers: maskedHeaders,
      // queryParams: options.query, // If using query params with Supabase invoke
    });
  }

  try {
    // supabase.functions.invoke<TData> implies TData is the type of `data` after potential JSON parsing by the client.
    const { data, error } = await supabase.functions.invoke<TData>( // TData is now used here as a hint
      functionName,
      {
        ...options,
        method: resolvedMethod,
        headers: {
          // Set Content-Type to application/json only if body is a plain object
          // and not FormData, URLSearchParams, Blob, or ReadableStream which have their own Content-Types.
          ...(options.body &&
            typeof options.body === 'object' &&
            !(options.body instanceof FormData) &&
            !(options.body instanceof URLSearchParams) &&
            !(options.body instanceof Blob) && // Blob often implies a specific content type
            !(options.body instanceof ArrayBuffer) &&
            !(options.body instanceof ReadableStream) &&
            { "Content-Type": "application/json" }),
          ...options.headers,
        },
      },
    );

    if (error) {
      // Supabase client errors (FunctionsHttpError, FunctionsRelayError, FunctionsFetchError)
      // These errors often contain valuable context like HTTP status codes.
      throw error;
    }

    // `data` is already parsed by supabase-js client if response is JSON with correct header.
    // If the function returns non-JSON (e.g., plain text, blob), `data` will be that raw type.
    // The type TData should accurately reflect what the Edge Function returns and what supabase-js provides.
    // For our specific use case in fetchQuestList, we will handle string parsing manually if needed.
    return data as TData; // The caller will handle type assertions or checks if TData is `unknown` or `any`.

  } catch (err: unknown) {
    const errorContext = {
      functionName,
      method: resolvedMethod,
      originalError: err,
    };

    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[EdgeInvoke] <- ${functionName} (${resolvedMethod}) Error:`,
        err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        errorContext, // Log the full error object for more context in dev
      );
    }

    if (
      err instanceof FunctionsHttpError ||
      err instanceof FunctionsRelayError ||
      err instanceof FunctionsFetchError
    ) {
      // These are Supabase-specific errors, rethrow them directly.
      throw err;
    }
    // Handle cases where `fetch` itself fails (e.g., network offline, CORS issues not caught by FunctionsFetchError)
    if (
      err instanceof TypeError && // `fetch` failures often manifest as TypeErrors
      (err.message.toLowerCase().includes("failed to fetch") ||
        err.message.toLowerCase().includes("networkerror") || // Broader check
        err.message.toLowerCase().includes("cors"))
    ) {
      throw new NetworkError(
        `Network request failed for ${functionName}: ${err.message}`,
        err, // `cause`
      );
    }
    if (err instanceof Error) { // Rethrow other standard JavaScript errors
      throw err;
    }
    // Fallback for unknown error types
    throw new Error(`Unknown error invoking ${functionName}: ${String(err)}`);
  }
}

/**
 * Decodes a storage object (Blob or Uint8Array) into a string.
 * Useful if Edge Functions return raw file content from Supabase Storage.
 * @param data The storage object (Blob, Uint8Array, or ArrayBuffer).
 * @returns A promise resolving to the decoded string.
 * @throws If the input type is unsupported.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function decodeStorageObject(data: unknown): Promise<string> {
  if (data instanceof Uint8Array) {
    return new TextDecoder().decode(data);
  }
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }
  if (data instanceof Blob) {
    return data.text();
  }
  throw new TypeError('Unsupported type for decodeStorageObject. Expected Blob, Uint8Array, or ArrayBuffer.');
}


/* -------------------------------------------------------------------------- */
/* 4. Quests API                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetches the list of all quests for the user.
 * @returns A promise resolving to the full `ListQuestsResponse` containing the
 * quest payloads and the server timestamp.
 * @throws {Error} if the server response indicates an error or parsing fails.
 */
export async function fetchQuestList(): Promise<ListQuestsResponse> {
  // Invoke with `any` because the response might be a string (if no JSON header) or an already parsed object.
  const rawResponse = await invoke<any>("list-quests", {
    method: "GET",
  });

  let dataToParse: unknown = rawResponse;

  // TODO: remove fallback once Edge function sends JSON header
  if (typeof rawResponse === 'string') {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[API] fetchQuestList: Received string response, attempting JSON.parse. This is a temporary fallback.",
        { responsePreview: rawResponse.substring(0, 100) + (rawResponse.length > 100 ? '...' : '') }
      );
    }
    try {
      dataToParse = JSON.parse(rawResponse);
    } catch (e) {
      const parseErrorMessage = `Failed to parse quest list response: Invalid JSON string received.`;
      console.error(`[API] fetchQuestList: ${parseErrorMessage}`, {
        originalError: e instanceof Error ? e.message : String(e),
        // Avoid logging potentially large rawResponse in production for errors.
        rawResponsePreview: process.env.NODE_ENV !== "production" ? (rawResponse.substring(0, 500) + (rawResponse.length > 500 ? '...' : '')) : "Omitted in prod",
      });
      // Throw an error to prevent further processing with malformed data.
      throw new Error(`${parseErrorMessage}${e instanceof Error ? ` Details: ${e.message}` : ''}`);
    }
  }

  const parsedResult = zListQuestsResponse.safeParse(dataToParse);

  if (!parsedResult.success) {
    console.error("[API] fetchQuestList: Failed to validate response with Zod:", parsedResult.error.flatten());
    // Log the data that failed parsing only in dev/staging to avoid exposing sensitive data in prod logs
    if (process.env.NODE_ENV !== "production") {
        console.error("[API] fetchQuestList: Data that failed Zod validation:", dataToParse);
    }
    throw new Error(`Failed to parse quest list response. Issues: ${parsedResult.error.message}`);
  }

  const responseData = parsedResult.data;

  if (responseData.error) {
    // Handle server-side error codes reported in the response body
    console.error(`[API] fetchQuestList: Server returned error code: ${responseData.error}`);
    throw new Error(`Error from list-quests: ${responseData.error}`);
  }

  const mappedQuests = responseData.data.map((q) => ({
    ...q,
    isFirstFlameRitual: q.slug === FIRST_FLAME_SLUG,
  }));

  return {
    data: mappedQuests,
    serverTimestamp: responseData.serverTimestamp,
  };
}


/**
 * Creates a new quest.
 * If the quest is the First Flame ritual, it invalidates and prefetches flame status queries.
 * @param queryClient The React Query QueryClient instance.
 * @param name The name for the new quest.
 * @param slug Optional slug, e.g., for creating specific ritual quests.
 * @param uid The user ID, required for prefetching user-specific flame status if applicable.
 * @returns A promise resolving to the created quest payload.
 * @throws {Error} if the API call fails or returns unexpected data.
 */
export async function createQuest(
  queryClient: QueryClient,
  name: string,
  slug?: string,
  uid?: string | null, // Added uid for prefetching user-specific flame status
): Promise<QuestPayloadFromServer> {
  // Expect QuestPayloadFromServer or a structure that can be parsed into it.
  // Assuming create-quest sends correct JSON headers, so supabase-js handles parsing.
  const rawNewQuest = await invoke<unknown>("create-quest", {
    body: { name, slug }, // method defaults to POST
  });

  // Note: If 'create-quest' might also return a string due to missing headers,
  // the same string parsing logic from fetchQuestList would be needed here.
  const parsedNewQuest = zQuestPayloadFromServer.safeParse(rawNewQuest);
  if (!parsedNewQuest.success) {
    console.error("[API] createQuest: Failed to parse response:", parsedNewQuest.error.flatten());
    if (process.env.NODE_ENV !== "production") {
        console.error("[API] createQuest: Data that failed Zod validation:", rawNewQuest);
    }
    throw new Error(`Failed to parse create-quest response. Issues: ${parsedNewQuest.error.message}`);
  }
  const newQuest = parsedNewQuest.data;


  if (newQuest.slug === FIRST_FLAME_SLUG) {
    await invalidateFlameStatusQueries(queryClient);
    await prefetchFlameStatus(queryClient, uid);
  }
  return newQuest;
}

/**
 * Placeholder for fetching messages for a quest.
 * @param _questId The ID of the quest.
 * @returns A promise resolving to an array of Vercel messages (currently empty).
 */
export async function fetchMessages(
  _questId: string, // Parameter is unused as this is a placeholder
): Promise<VercelMessage[]> {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[API] fetchMessages is a placeholder and not implemented.");
  }
  // In a real implementation, this would call an Edge Function:
  // const messages = await invoke<VercelMessage[]>(`get-quest-messages/${_questId}`, { method: 'GET' });
  // return messages || [];
  return Promise.resolve([]);
}

/* -------------------------------------------------------------------------- */
/* 5. First-Flame Ritual API                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Fetches the current status of the First Flame ritual.
 * Parses the Edge Function response. If the backend indicates data is still
 * preparing (processing: true), it throws a `ProcessingError` to enable
 * React Query retries. Otherwise, it validates and returns the full status.
 * @returns A promise resolving to the `FlameStatusPayload` (data-rich type).
 * @throws {ProcessingError} If the status is still processing.
 * @throws {Error} If the response is invalid (e.g., missing dataVersion when not processing or parsing fails).
 */
export async function fetchFlameStatus(): Promise<FlameStatusPayload> {
  // Assuming get-flame-status sends correct JSON headers.
  const rawServerData = await invoke<unknown>("get-flame-status", {
    method: "GET",
  });

  // Note: If 'get-flame-status' might also return a string due to missing headers,
  // the same string parsing logic from fetchQuestList would be needed here.
  const parsedResult = zFlameStatusServerResponse.safeParse(rawServerData);

  if (!parsedResult.success) {
    console.error("[API] fetchFlameStatus: Failed to parse response:", parsedResult.error.flatten());
    if (process.env.NODE_ENV !== "production") {
        console.error("[API] fetchFlameStatus: Data that failed Zod validation:", rawServerData);
    }
    throw new Error(`Failed to parse flame status response. Issues: ${parsedResult.error.message}`);
  }
  const serverResponse = parsedResult.data;


  if (serverResponse.processing) {
    throw new ProcessingError('Flame status is still processing on the server.');
  }

  if (
    typeof serverResponse.dataVersion !== 'number' ||
    typeof serverResponse.currentDay !== 'number' ||
    typeof serverResponse.totalDays !== 'number' ||
    serverResponse.ritualStartDate === undefined ||
    !serverResponse.progress ||
    !serverResponse.imprints
  ) {
    const errorMsg = '[API] fetchFlameStatus: Response is invalid - missing required fields when not processing.';
    if (process.env.NODE_ENV !== 'production') {
      // serverResponse here is the Zod-parsed (but still partial/invalid for FlameStatusPayload) data
      console.error(errorMsg, { serverResponse });
    }
    throw new Error(errorMsg.replace('[API] fetchFlameStatus: ', ''));
  }

  return serverResponse as FlameStatusPayload;
}


/**
 * Submits an imprint for a First Flame quest day.
 * Handles online submission and attempts to queue for background sync on network failure.
 * @param questId ID of the First Flame quest instance.
 * @param userId Needed by the Edge Function for operations.
 * @param imprintArgs The arguments for the imprint submission.
 * @returns A promise resolving to a SubmitImprintResult.
 * @throws {Error} or Supabase errors if submission fails and cannot be queued.
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
    // Assuming submit-flame-imprint sends correct JSON headers.
    const rawResult = await invoke<unknown>(
      "submit-flame-imprint",
      {
        body: payload, // Default method will be POST due to body
      },
    );

    // Note: If 'submit-flame-imprint' might also return a string due to missing headers,
    // the same string parsing logic from fetchQuestList would be needed here.
    const parsedResult = zSubmitImprintSuccessResponse.safeParse(rawResult);
    if (!parsedResult.success) {
      console.error("[API] submitImprint: Failed to parse response:", parsedResult.error.flatten());
      if (process.env.NODE_ENV !== "production") {
        console.error("[API] submitImprint: Data that failed Zod validation:", rawResult);
      }
      throw new Error(`Failed to parse submit-flame-imprint response. Issues: ${parsedResult.error.message}`);
    }
    const result = parsedResult.data;

    return { ...result, queued: false };

  } catch (error: unknown) {
    if (error instanceof NetworkError || error instanceof FunctionsFetchError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[API] Network error during submitImprint for ${imprintArgs.clientGeneratedId}. Attempting background sync.`,
          error,
        );
      }
      try {
        await queueImprintForSync(payload);
        return { queued: true };
      } catch (queueError) {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            `[API] Failed to queue imprint ${imprintArgs.clientGeneratedId} for background sync after network error. Original error will be re-thrown.`,
            queueError,
          );
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

/** Base query key for flame status. Append user ID for user-specific status. */
export const FLAME_STATUS_BASE_QUERY_KEY = ["flame-status"] as const;
/**
 * Alias used by hooks expecting a plain FLAME_STATUS_QUERY_KEY constant.
 * Keeps backward compatibility with prior exports.
 */
export const FLAME_STATUS_QUERY_KEY = FLAME_STATUS_BASE_QUERY_KEY;

/**
 * Type for flame status query keys. Can be global or user-specific.
 * Examples: ['flame-status'] or ['flame-status', 'user123']
 */
type FlameStatusQueryKey = Readonly<(typeof FLAME_STATUS_BASE_QUERY_KEY[0] | string)[]>;


/** Query key for the user's quest list. */
export const QUESTS_QUERY_KEY = ['list-quests'] as const;

/**
 * Default options for `useQuery` hook when fetching flame status *without a specific user ID*.
 * This might be for a global status or if user context is implicitly handled by `fetchFlameStatus`.
 * For user-specific status with retry logic for processing, use `buildFlameStatusQueryOpts(uid)`.
 * Explicitly typed for React Query v5 strict mode compatibility.
 */
export const defaultFlameStatusQueryOptions: UseQueryOptions<
  FlameStatusPayload, // Data type on success
  | FunctionsHttpError // Supabase HTTP error
  | FunctionsRelayError  // Supabase Relay error
  | FunctionsFetchError  // Supabase Fetch error (network layer before HTTP)
  | NetworkError         // Custom network error (e.g., client offline)
  | Error                // Generic JS errors (includes Zod parsing errors from wrappers)
  | ProcessingError,     // Custom error for server-side processing
  FlameStatusPayload, // Select data type (typically same as successful data)
  Readonly<[typeof FLAME_STATUS_BASE_QUERY_KEY[0]]> // Query key type for non-user-specific
> = {
  queryKey: FLAME_STATUS_BASE_QUERY_KEY, // Non-user-specific key
  queryFn: fetchFlameStatus,
  staleTime: 1000 * 60 * 5, // 5 minutes; adjust based on expected data volatility
};

/**
 * Builds React Query options for fetching flame status, typically keyed by user ID.
 * Includes retry logic for `ProcessingError` (when server indicates data is still processing).
 * @param uid User ID for keying the query. If null/undefined, uses default non-user-specific options.
 */
export function buildFlameStatusQueryOpts(
  uid?: string | null,
): UseQueryOptions<
  FlameStatusPayload,
  | FunctionsHttpError
  | FunctionsRelayError
  | FunctionsFetchError
  | NetworkError
  | Error
  | ProcessingError,
  FlameStatusPayload,
  FlameStatusQueryKey
> {
  const queryKey = uid ? [...FLAME_STATUS_BASE_QUERY_KEY, uid] as const : FLAME_STATUS_BASE_QUERY_KEY;

  return {
    queryKey: queryKey,
    queryFn: fetchFlameStatus,
    staleTime: 0, 
    retry: (failureCount, error) => {
      if (error instanceof ProcessingError) {
        return failureCount < 3; // Max 3 retries
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  } as const;
}


/**
 * Invalidates all queries related to First Flame status (both global and user-specific)
 * using the provided QueryClient.
 * @param queryClient The React Query QueryClient instance.
 */
export async function invalidateFlameStatusQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: FLAME_STATUS_BASE_QUERY_KEY });
}

/**
 * Wrapper for `invalidateFlameStatusQueries` to match a common call signature
 * (e.g., if used in a context where a questId might be passed but is irrelevant here).
 * @param queryClient The React Query QueryClient instance.
 * @param _questId Optional quest ID, ignored in this implementation.
 */
export async function invalidateFlameStatus(
  queryClient: QueryClient,
  _questId?: string,
): Promise<void> {
  return invalidateFlameStatusQueries(queryClient);
}

/**
 * Prefetches the First Flame status using the provided QueryClient.
 * @param queryClient The React Query QueryClient instance.
 * @param uid Optional user ID. If provided, prefetches user-specific status with retry logic.
 *            If omitted or null, prefetches using `defaultFlameStatusQueryOptions`.
 */
export async function prefetchFlameStatus(
  queryClient: QueryClient,
  uid?: string | null,
): Promise<void> {
  if (uid) {
    await queryClient.prefetchQuery(buildFlameStatusQueryOpts(uid));
  } else {
    await queryClient.prefetchQuery(defaultFlameStatusQueryOptions);
  }
}