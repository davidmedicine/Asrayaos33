/* ────────────────────────────────────────────────────────────────
 * _shared/withCors.ts  –  Minimal, reusable CORS wrapper
 * ----------------------------------------------------------------
 *  • Handles browser pre-flight requests (`OPTIONS`) automatically.
 *  • Merges your shared `corsHeaders` into every non-OPTIONS response.
 *  • Keeps each Edge Function lean: just write `export const handler =
 *    withCors(async (req) => { … })`.
 * ----------------------------------------------------------------
 *  Usage example in an Edge Function:
 *
 *    import { withCors }   from '../_shared/withCors.ts';
 *
 *    export const handler = withCors(async (req) => {
 *      const data = { hello: 'world' };
 *      return new Response(JSON.stringify(data), { status: 200 });
 *    });
 * ────────────────────────────────────────────────────────────────*/

import { corsHeaders } from './cors.ts';

/**
 * Wrap an Edge-Function handler so every response (and pre-flight)
 * includes the correct CORS headers.
 */
export function withCors(
  handler: (req: Request) => Promise<Response>,
) {
  return async (req: Request): Promise<Response> => {
    // 1️⃣  Instant reply for CORS pre-flight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: { ...corsHeaders } });
    }

    // 2️⃣  Execute the actual business logic
    try {
      const res = await handler(req);

      // 3️⃣  Add (or overwrite) CORS headers on the way out
      for (const [key, value] of Object.entries(corsHeaders)) {
        res.headers.set(key, value as string);
      }

      return res;
    } catch (err) {
      console.error('[withCors] uncaught error', err);
      const res = new Response(
        JSON.stringify({ error: 'SERVER_ERROR' }),
        { status: 500 },
      );
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.headers.set(k, v as string);
      }
      return res;
    }
  };
}
