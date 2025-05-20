// supabase/_shared/cors.ts
// -----------------------------------------------------------------------------
//  Centralised CORS headers for every Supabase Edge Function
// -----------------------------------------------------------------------------
//  Browsers still **require an explicit list** for `Access-Control-Allow-Headers` –
//  the wildcard "*" _does not_ satisfy Chrome/Edge/Safari/Firefox when a custom
//  header such as `apikey` or `authorization` is sent.  We therefore enumerate
//  every non‑simple header that the Supabase JS client adds by default.
//
//  In production, set the environment variable `ALLOWED_ORIGIN` (comma‑separated
//  list or single value) to restrict requests; during local development we fall
//  back to "*" so any `localhost:*` front‑end can talk to the functions.
// -----------------------------------------------------------------------------

/** Fallback origin for local development */
const DEV_ORIGIN_FALLBACK = '*';

// Detect local environment for functions that behave differently in dev
export const ENV_IS_LOCAL =
  Deno.env.get('SUPABASE_URL')?.includes('localhost') ?? false;

/**
 * Non‑simple headers automatically attached by the Supabase JS client (and
 * therefore present on every request from your front‑end).  **Every one of
 * these MUST be whitelisted** or the browser will abort the pre‑flight.
 */
const ALLOW_HEADERS = [
  'authorization',   // JWT bearer token
  'apikey',          // Project anon / service key
  'x-client-info',   // Supabase SDK metadata
  'content-type',    // Needed when the request has a JSON body
].join(', ');

export const corsHeaders: HeadersInit = {
  // Allow any origin in dev; tighten in prod via env var.
  'Access-Control-Allow-Origin':
    Deno.env.get('ALLOWED_ORIGIN') ?? DEV_ORIGIN_FALLBACK,

  // Enumerate headers – wildcard is NOT respected by most browsers.
  'Access-Control-Allow-Headers': ALLOW_HEADERS,

  // Only the HTTP verbs that our shared handlers support.
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',

  // Cache the pre‑flight response for 24 h (recommended upper bound).
  'Access-Control-Max-Age': '86400',
};
