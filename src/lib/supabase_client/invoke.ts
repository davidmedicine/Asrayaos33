/* --------------------------------------------------------------------------
 *  src/lib/supabase/invoke.ts
 *
 *  A single, opinionated gateway for calling Supabase Edge Functions.
 *  — Adds dev-mode “service-role bypass” headers when requested
 *  — Picks the verb automatically (GET if no body, otherwise POST) ­– can be
 *    overridden per-call
 *  — Normalises Content-Type + merges caller-supplied headers
 *  — Re-throws typed Supabase errors so upper layers can decide what to do
 * ------------------------------------------------------------------------*/

import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
  } from '@supabase/supabase-js';
  import { supabase } from '@/lib/supabase_client/client';
  
  /* ────────────────────────────────────────────────────────────────────────── */
  /* 1. Dev-mode header helper                                                 */
  /* ────────────────────────────────────────────────────────────────────────── */
  
  export const devHeaders: Record<string, string> =
    process.env.NEXT_PUBLIC_DEV_BYPASS_JWT === 'true'
      ? { 'x-service-role-key': process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE! }
      : {};
  
  /* ────────────────────────────────────────────────────────────────────────── */
  /* 2. Types                                                                   */
  /* ────────────────────────────────────────────────────────────────────────── */
  
  export type HttpVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  
  export interface InvokeOptions {
    /** Explicit HTTP verb – defaults to GET if no body, otherwise POST. */
    method?: HttpVerb;
    /** Any JSON-serialisable value – stringified automatically. */
    body?: unknown;
    /** Extra headers, merged *after* `devHeaders` so you can override them. */
    headers?: Record<string, string>;
    /** Optional AbortSignal for cancellation / React Suspense timeouts. */
    signal?: AbortSignal;
  }
  
  /* ────────────────────────────────────────────────────────────────────────── */
  /* 3. invoke<T>() – import this everywhere else                              */
  /* ────────────────────────────────────────────────────────────────────────── */
  
  export async function invoke<T>(
    functionName: string,
    opts: InvokeOptions = {},
  ): Promise<T> {
    const { method, body, headers, signal } = opts;
  
    /* ---------- decide verb ---------- */
    const httpMethod: HttpVerb =
      method ?? (body === undefined ? 'GET' : 'POST');
  
    /* ---------- call the Edge Function ---------- */
    try {
      const { data, error } = await supabase.functions.invoke<T>(functionName, {
        method: httpMethod,
        signal,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...devHeaders, // dev-bypass first → callers can still override
          ...headers,
        },
      });
  
      if (error) throw error;          // keeps Supabase error typing intact
      return data as T;
  
    /* ---------- standardised error bubbling ---------- */
    } catch (err: unknown) {
      if (
        err instanceof FunctionsHttpError ||
        err instanceof FunctionsRelayError ||
        err instanceof FunctionsFetchError
      ) {
        throw err;                     // caller decides how to handle status codes
      }
      if (err instanceof Error) throw err;
      throw new Error(String(err));    // wrap non-Error throwables
    }
  }
  