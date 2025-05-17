// ============================================================================
// File: src/lib/supabase/client.ts                                           //
// Purpose: Typed **browser-side** Supabase singleton for AsrayaOS           //
// Version: 2.0 – adds singleton export `supabase` (2025-05-02)              //
// ============================================================================

import { createBrowserClient } from '@supabase/ssr';           // <— new SDK 2.x API
import type { Database }         from '@/types/supabase';

/* ------------------------------------------------------------------------- */
/* 1. Environment validation                                                 */
/* ------------------------------------------------------------------------- */
const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast – these must exist at **build-time** for static optimisation.
  throw new Error(
    '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Check your .env(.local) or Vercel project settings.',
  );
}

/* Dev-only diagnostics – stripped from prod bundles by tree-shaking */
if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.log('[Supabase] Env-vars OK, initialising browser client…');
}

/* ------------------------------------------------------------------------- */
/* 2. Eager singleton                                                        */
/* ------------------------------------------------------------------------- */
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
/* The instance is created once per browser tab; importing this module
   anywhere guarantees the same client & Realtime WebSocket connection.   */

export type SupabaseClient = typeof supabase;

/* ------------------------------------------------------------------------- */
/* 3. Legacy factory helper (optional)                                       */
/* ------------------------------------------------------------------------- */
/** @deprecated Prefer the `supabase` singleton export instead. */
export function createClient(): SupabaseClient {
  return supabase;
}

/* ------------------------------------------------------------------------- */
/* 4. Utility helpers                                                        */
/* ------------------------------------------------------------------------- */
/** Returns the Realtime channel name for a given conversation. */
export function getConversationChannelName(conversationId: string): string {
  return `conversation:${conversationId}`;
}
