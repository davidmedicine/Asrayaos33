/* ────────────────────────────────────────────────
 * supabase/functions/_shared/sentry.ts
 * Sentry helper for Edge Functions (Deno 1.40 +)
 * – single initialisation per isolate
 * – safe defaults (no PII)
 * – helper exports used by every function
 * ────────────────────────────────────────────────*/

import * as Sentry from "npm:@sentry/deno@9.17.0"; // latest stable SDK for Deno

declare global {
  // deno-lint-ignore no-var
  var __sentry_init: boolean | undefined;
}

/* ── initialise Sentry once ───────────────────── */
const DSN = Deno.env.get("SENTRY_DSN") ?? "";
if (DSN && !globalThis.__sentry_init) {
  Sentry.init({
    dsn: DSN,
    // pull sample‑rates from env (fallbacks shown)
    tracesSampleRate  : Number(Deno.env.get("SENTRY_TRACES_SAMPLE_RATE")   ?? 0.05),
    profilesSampleRate: Number(Deno.env.get("SENTRY_PROFILES_SAMPLE_RATE") ?? 0),
    sendDefaultPii    : false,                  // GDPR‑safe
    maxBreadcrumbs    : 50,
    release     : Deno.env.get("APP_VERSION") ?? Deno.env.get("DENO_DEPLOYMENT_ID"),
    environment : Deno.env.get("APP_ENVIRONMENT") ?? "production",
    beforeSend(event) {
      // strip sensitive headers
      for (const h of ["authorization","cookie","x-api-key","apikey","x-supabase-auth"]) {
        delete event.request?.headers?.[h];
      }
      return event;
    },
  });

  globalThis.__sentry_init = true;
}

/* ── helper: explicit initialiser for callers that expect it ───────── */
export function initializeSentryOnce(): boolean {
  // returns true if Sentry is ready (already initialised or DSN missing)
  return globalThis.__sentry_init ?? false;
}

/* ── helper: capture an error with optional extras & tags ──────────── */
export function captureError(
  err: unknown,
  extras: Record<string, unknown> = {},
  tags : Record<string, string>   = {},
) {
  if (!globalThis.__sentry_init) return;
  Sentry.withScope(scope => {
    scope.setExtras(extras);
    scope.setTags(tags);
    Sentry.captureException(err);
  });
}

/* ── helper: flush pending events before the function exits ────────── */
export function flushSentryEvents(timeout = 2_000): Promise<boolean> {
  return globalThis.__sentry_init ? Sentry.flush(timeout) : Promise.resolve(true);
}
