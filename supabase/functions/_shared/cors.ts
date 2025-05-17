// supabase/_shared/cors.ts

/**
 * Shared CORS header set for Edge Functions.
 * Import once, spread on every Response.
 */
export const corsHeaders: HeadersInit = {
    // Allow any front-end origin in dev; tighten in prod with ENV
    'Access-Control-Allow-Origin': '*',
    // Use wildcard for allowed headers, supported by >97% of browsers.
    // Simplifies maintenance as SDKs evolve.
    'Access-Control-Allow-Headers': '*',
    // Keep this general for shared utility; individual functions can choose not to implement all methods.
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    // Recommended for JSON APIs (browsers won’t complain if missing,
    // but tools like curl/Postman will, and it's required for JSON bodies)
    'Content-Type': 'application/json',
  };