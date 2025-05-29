// =============================================================================
//  src/lib/supabase/client.ts
//  Typed **browser-side** Supabase singleton for AsrayaOS
//  v2.1  2025-05-24 – minor clean-ups, explicit `persistSession: true`
// =============================================================================

import { createBrowserClient } from '@supabase/ssr';      // Supabase v2 helper
import type { Database }        from '@/types/supabase';

/* ───────────────────────────── 1.  ENV sanity check ──────────────────────── */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.info('[Supabase] Initialising browser client');
}

/* ───────────────────────────── 2.  Singleton client ──────────────────────── */
export const supabase = createBrowserClient<Database>(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      /* Keep the user logged-in across reloads – required for SSR + CSR mix */
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

export type SupabaseClient = typeof supabase;

/* ───────────────────────────── 3.  Legacy factory ────────────────────────── */
/** @deprecated  Import the `supabase` singleton instead. */
export function createClient(): SupabaseClient {
  return supabase;
}

/* ───────────────────────────── 4.  Tiny helpers ──────────────────────────── */
export const getConversationChannelName = (conversationId: string) =>
  `conversation:${conversationId}`;
