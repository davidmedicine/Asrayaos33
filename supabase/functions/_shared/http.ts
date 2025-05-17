/* ──────────────────────────────────────────────────────────────
 * functions/_shared/http.ts
 * Shared utilities for HTTP responses in Supabase Edge Functions.
 * ──────────────────────────────────────────────────────────────*/

import { captureError, flushSentryEvents } from './sentry.ts';

/** Pretty-print JSON bodies & console logs when set at deploy-time. */
const DEBUG_HTTP_RESPONSES = Deno.env.get('DEBUG_HTTP_RESPONSES') === 'true';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface StandardHeadersOptions {
  /** Adds `Access-Control-Allow-Credentials: true` when `true` (default `false`). */
  credentials?: boolean;
  /**
   * When `true` (default) marks the response as *private* so it **is not**
   * edge-cached. When `false`, we allow a short public cache-window.
   */
  isUserSpecificContent?: boolean;
  /** Comma-separated list of allowed HTTP methods (default `'GET, POST, OPTIONS'`). */
  allowMethods?: string;
  /** Comma-separated list of allowed request headers. */
  allowHeaders?: string;
}

/* ------------------------------------------------------------------ */
/* Header factory                                                     */
/* ------------------------------------------------------------------ */

export function createStandardHeaders(
  origin: string | null,
  opts: StandardHeadersOptions = {},
): HeadersInit {
  const {
    credentials = false,
    isUserSpecificContent = true,
    allowMethods = 'GET, POST, OPTIONS',
    allowHeaders =
      'Authorization, apikey, x-client-info, content-type, sentry-trace, baggage',
  } = opts;

  const cacheControl = isUserSpecificContent
    ? 'private, max-age=60, must-revalidate'
    : 'public, s-maxage=60, max-age=60, stale-while-revalidate=300';

  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin ?? '*', // preserve empty-string origins
    'Access-Control-Allow-Methods': allowMethods,
    'Access-Control-Allow-Headers': allowHeaders,
    ...(credentials ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    'Cache-Control': cacheControl,
    Vary: 'Origin, Accept-Encoding',
  } as const;
}

/* ------------------------------------------------------------------ */
/* Response helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Convenience helper for **2xx** JSON responses.
 * Automatically pretty-prints when `DEBUG_HTTP_RESPONSES` is enabled.
 */
export function createHttpSuccessResponse<T = unknown>(
  payload: T,
  httpStatus: number = 200,
  headers: HeadersInit,
): Response {
  const body = DEBUG_HTTP_RESPONSES
    ? JSON.stringify(payload, null, 2)
    : JSON.stringify(payload);
  return new Response(body, { status: httpStatus, headers });
}

/**
 * Convenience helper for structured JSON error responses **plus**
 * automatic Sentry capture / flush.
 */
export async function createHttpErrorResponse(
  functionName: string,
  userMessage: string,
  httpStatus: number,
  headers: HeadersInit,
  errorContext: Record<string, unknown> = {},
  originalError?: unknown,
): Promise<Response> {
  if (DEBUG_HTTP_RESPONSES) {
    console.error(`[${functionName}] ${userMessage}`, {
      ...errorContext,
      originalError,
    });
  }

  /* --- Sentry instrumentation – best-effort, never blocks the response. --- */
  try {
    await captureError(functionName, userMessage, errorContext, originalError);
  } catch (sentryErr) {
    console.error('[http.ts] Failed to capture Sentry error', sentryErr);
  } finally {
    try {
      await flushSentryEvents(500); // flush within ½ second
    } catch {
      /* swallow */
    }
  }

  const responseBody = DEBUG_HTTP_RESPONSES
    ? JSON.stringify({ error: userMessage, ...errorContext }, null, 2)
    : JSON.stringify({ error: userMessage, ...errorContext });

  return new Response(responseBody, { status: httpStatus, headers });
}
