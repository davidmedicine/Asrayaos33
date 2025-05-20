// supabase/functions/get-flame-status/index.ts      ← adjust name/path as needed
// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────── shared helpers ───────────────────
import { corsHeaders } from '../_shared/cors.ts';
import { withCors }   from '../_shared/withCors.ts';

/* ──────────────── ENV ──────────────── */
const SB_URL  = Deno.env.get('SUPABASE_URL')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SB_SVC  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/* ─────────────── CONFIG ────────────── */
const STALE_MS      = 60_000;                    // 1-min freshness window
const DAYDEF_BUCKET = 'asrayaospublicbucket';    // ← keep in sync with modal worker
const DAYDEF_PREFIX = '5-day/';                  // ← NEW
const DAY_1_PATH    = `${DAYDEF_PREFIX}day-1.json`;

/* ─────────────── HELPERS ───────────── */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      'Content-Type' : 'application/json',
    },
  });

/** Supabase storage occasionally returns Uint8Array in Edge Functions */
const decodeStorage = async (blob: unknown): Promise<string> =>
  typeof (blob as Uint8Array)?.byteLength === 'number'
    ? new TextDecoder().decode(blob as Uint8Array)
    : await (blob as Blob).text();

/* ─────────────── MAIN ──────────────── */
Deno.serve(
  withCors(async (req) => {
    try {
      /* Method guard (OPTIONS handled by withCors) */
      if (req.method !== 'GET' && req.method !== 'POST')
        return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

      if (req.method === 'POST') {
        try {
          await req.json();
        } catch (err) {
          console.error('[get-flame-status] failed to parse body', err);
        }
      }

      /* Auth guard */
      const jwt = req.headers.get('Authorization') ?? '';
      if (!jwt.startsWith('Bearer ')) return json({ error: 'AUTH' }, 401);

      /* Supabase clients */
      const sbUser = createClient(SB_URL, SB_ANON, {
        global: { headers: { Authorization: jwt } },
        auth  : { persistSession: false },
        db    : { schema: 'ritual' },
      });

      const sbAdmin = createClient(SB_URL, SB_SVC, {
        auth: { persistSession: false },
        db  : { schema: 'ritual' },
      });

    /* 1️⃣  Get progress row (cheap) */
    const {
      data: progress,
      error: pe,
    } = await sbUser
      .from('flame_progress')
      .select('quest_id, current_day_target, updated_at')
      .maybeSingle();

    if (pe) {
      console.error('[get-flame-status] flame_progress select error', pe);
      return json({ error: 'DB' }, 500);
    }

    const isFresh =
      progress &&
      Date.now() - new Date(progress.updated_at).getTime() <= STALE_MS;

    /* ───── FRESH PATH ───── */
    if (isFresh) {
      const [
        { data: imprints, error: ie },
        { data: dayBlob,  error: se },
      ] = await Promise.all([
        sbUser
          .from('flame_imprints')
          .select('day, payload_text, created_at')
          .order('day'),
        sbUser.storage.from(DAYDEF_BUCKET).download(DAY_1_PATH),
      ]);

      if (ie) {
        console.error('[get-flame-status] flame_imprints error', ie);
        return json({ error: 'DB' }, 500);
      }
      if (se || !dayBlob) {
        console.error('[get-flame-status] download day-1 error', se);
        return json({ error: 'STORAGE' }, 500);
      }

      const dayJson = JSON.parse(await decodeStorage(dayBlob));

      return json({
        processing  : false,
        dataVersion : Date.now(),
        progress,
        imprints,
        dayDefinition: dayJson,
      }, 200);
    }

    /* ───── STALE PATH ───── */
    const { data: { user }, error: userErr } = await sbUser.auth.getUser();
    if (userErr) console.error('[get-flame-status] auth.getUser error', userErr);

    try {
      const { error: invokeErr } =
        await sbAdmin.functions.invoke('realtime-broadcast', {
          body: {
            channel: 'flame_status',
            event  : 'missing',
            payload: { user_id: user?.id },
          },
        });
      if (invokeErr)
        console.error('[get-flame-status] realtime-broadcast error', invokeErr);
    } catch (err) {
      console.error('[get-flame-status] realtime-broadcast invoke failed', err);
    }

      return json({ processing: true }, 202);
    } catch (err) {
      console.error('[get-flame-status] unhandled error', err);
      return json({ error: 'SERVER_ERROR' }, 500);
    }
  }),
);
