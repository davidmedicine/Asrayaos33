// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/*────────────────────────  Shared utils  ───────────────────────*/
import { createStandardHeaders, createHttpSuccessResponse, createHttpErrorResponse } from '../_shared/http.ts';
import { log }                from '../_shared/logger.ts';
import { maskAuthorizationHeader } from '../_shared/jwt.ts';
import { flushSentryEvents }   from '../_shared/sentry.ts';
import { LOG_STAGES }         from '../_shared/5dayquest/ritual.constants.ts';

/*────────────────────────  Config / ENV  ───────────────────────*/
const FN       = 'get-flame-status';
const SB_URL   = Deno.env.get('SUPABASE_URL');
const SB_ANON  = Deno.env.get('SUPABASE_ANON_KEY');
const SB_SVC   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SB_URL || !SB_ANON || !SB_SVC) {
  console.error(`[${FN}] FATAL – missing Supabase env vars`);
  throw new Error('Server mis‑configuration');
}

const DEBUG = Deno.env.get(`DEBUG_${FN.toUpperCase().replace(/-/g, '_')}`) === 'true';

const STALE_MS      = 60_000;                 // 1‑min freshness
const DAYDEF_BUCKET = 'asrayaospublicbucket'; // matches Modal worker
const DAYDEF_PREFIX = '5-day/';               // keep in sync
const DAY_1_PATH    = `${DAYDEF_PREFIX}day-1.json`;

/*────────────────────────  Helpers  ────────────────────────────*/
const decodeStorage = async (blob: unknown): Promise<string> =>
  (blob && typeof (blob as Uint8Array).byteLength === 'number')
    ? new TextDecoder().decode(blob as Uint8Array)
    : await (blob as Blob).text();

/*────────────────────────  Handler  ────────────────────────────*/
Deno.serve(async (req) => {
  const t0 = performance.now();
  const origin = req.headers.get('Origin');
  const stdHeaders = createStandardHeaders(origin, { credentials: true });

  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: stdHeaders });

  if (req.method !== 'GET')
    return createHttpErrorResponse(FN, 'METHOD_NOT_ALLOWED', 405, stdHeaders);

  const authHdr = req.headers.get('Authorization') ?? '';
  const authLog = maskAuthorizationHeader(authHdr);

  if (!authHdr.startsWith('Bearer '))
    return createHttpErrorResponse(FN, 'AUTH', 401, stdHeaders);

  try {
    /*── Supabase clients ───────────────────────────────────────*/
    const sbUser = createClient(SB_URL, SB_ANON, {
      global: { headers: { Authorization: authHdr } },
      auth  : { persistSession: false },
      db    : { schema: 'ritual' },
    });

    const sbAdmin = createClient(SB_URL, SB_SVC, {
      auth: { persistSession: false },
      db  : { schema: 'ritual' },
    });

    /*── Caller identity ───────────────────────────────────────*/
    const { data: { user }, error: authErr } = await sbUser.auth.getUser();
    if (authErr || !user?.id) throw Object.assign(authErr ?? new Error('AUTH'), { status: 401 });

    /*── Progress (cheap) ──────────────────────────────────────*/
    const { data: progress, error: pe } = await sbUser
      .from('flame_progress')
      .select('quest_id, current_day_target, updated_at')
      .maybeSingle();

    if (pe) throw Object.assign(pe, { status: 500 });

    const isFresh =
      progress && Date.now() - new Date(progress.updated_at).getTime() <= STALE_MS;

    /*────────────────────  FRESH PATH  ───────────────────────*/
    if (isFresh) {
      const [ { data: imprints, error: ie }, { data: blob, error: se } ] = await Promise.all([
        sbUser
          .from('flame_imprints')
          .select('day, payload_text, created_at')
          .order('day'),
        sbUser.storage.from(DAYDEF_BUCKET).download(DAY_1_PATH),
      ]);

      if (ie) throw Object.assign(ie, { status: 500 });
      if (se || !blob) throw Object.assign(se ?? new Error('STORAGE'), { status: 500 });

      const dayJson = JSON.parse(await decodeStorage(blob));

      log('DEBUG', LOG_STAGES.EF_GET_FLAME_STATUS_CACHE_HIT, null, FN, DEBUG);
      return createHttpSuccessResponse({
        processing   : false,
        dataVersion  : Date.now(),
        progress,
        imprints,
        dayDefinition: dayJson,
      }, 200, stdHeaders);
    }

    /*────────────────────  STALE PATH  ───────────────────────*/
    await sbAdmin.functions.invoke('realtime-broadcast', {
      body: {
        channel: 'flame_status',
        event  : 'missing',
        payload: { user_id: user.id },
      },
    });

    log('DEBUG', LOG_STAGES.EF_GET_FLAME_STATUS_CACHE_MISS, null, FN, DEBUG);
    return createHttpSuccessResponse({ processing: true }, 202, stdHeaders);

  } catch (err: unknown) {
    const e   = err instanceof Error ? err : new Error(String(err));
    const sc  = (e as any).status && (e as any).status >= 400 && (e as any).status < 600
                ? (e as any).status
                : 500;
    log('ERROR', e.message, { stack: e.stack }, FN, true);
    const resp = await createHttpErrorResponse(FN, (e as any).code ?? 'SERVER_ERROR', sc, stdHeaders, { maskedAuth: authLog }, e);
    return resp;
  } finally {
    await flushSentryEvents(500);
    if (DEBUG) log('DEBUG', `done in ${(performance.now() - t0).toFixed(1)} ms`, null, FN, true);
  }
});
