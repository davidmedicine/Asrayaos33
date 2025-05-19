/* --------------------------------------------------------------------------
 *  src/lib/temporal_client.ts
 *
 *  Thin client helpers that proxy UI requests to Temporal (or Modal) workers.
 *  Currently routed through Supabase Edge Functions so we avoid CORS / auth
 *  headaches. Replace the invoke() call with a direct Temporal gRPC/Web call
 *  when you wire that up.
 * ------------------------------------------------------------------------ */

import {
    FunctionsHttpError,
    FunctionsRelayError,
    FunctionsFetchError,
  } from '@supabase/supabase-js';
  
  import { supabase } from '@/lib/supabase_client/client';
  
  /* -------------------------------------------------------------------------- */
  /* Types                                                                      */
  /* -------------------------------------------------------------------------- */
  
  export interface SeedFirstFlameArgs {
    /** Supabase user ID (UUID) */
    userId: string;
  }
  
  export class TemporalClientError extends Error {
    public readonly type = 'TemporalClientError';
    constructor(message: string, public cause?: unknown) {
      super(message);
      this.name = 'TemporalClientError';
      Object.setPrototypeOf(this, TemporalClientError.prototype);
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /* Helpers                                                                    */
  /* -------------------------------------------------------------------------- */
  
  /** Generic error guard so UI code can `instanceof` check. */
  function wrapError(e: unknown, op: string): never {
    if (
      e instanceof FunctionsHttpError ||
      e instanceof FunctionsRelayError ||
      e instanceof FunctionsFetchError
    ) {
      throw e; // let callers handle Supabase-specific errors
    }
    if (e instanceof Error) {
      throw new TemporalClientError(`[Temporal] ${op} failed: ${e.message}`, e);
    }
    throw new TemporalClientError(`[Temporal] ${op} failed: ${String(e)}`);
  }
  
  /* -------------------------------------------------------------------------- */
  /* Public API                                                                 */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Seeds / refreshes First-Flame ritual state for `userId`.
   * Delegates to the Modal worker via Supabase Edge Function
   * (`ensure-flame-state`).  Resolves `void` on success.
   */
  export async function seedFirstFlame({ userId }: SeedFirstFlameArgs): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('ensure-flame-state', {
        body: { userId },
      });
      if (error) throw error;
    } catch (e) {
      wrapError(e, 'seedFirstFlame');
    }
  }
  