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
    headers: { ...corsHeaders, 'Cache-Control': 'no-store' },
  });

/** Supabase storage occasionally returns Uint8Array in Edge Functions */
const decodeStorage = async (blob: unknown): Promise<string> =>
  typeof (blob as Uint8Array)?.byteLength === 'number'
    ? new TextDecoder().decode(blob as Uint8Array)
    : await (blob as Blob).text();

/* ─────────────── MAIN ──────────────── */
Deno.serve(
  withCors(async (req) => {
    /* Method guard (OPTIONS handled by withCors) */
    if (req.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

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
      console.error('flame_progress error', pe);
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
        console.error('flame_imprints error', ie);
        return json({ error: 'DB' }, 500);
      }
      if (se || !dayBlob) {
        console.error('storage download error', se);
        return json({ error: 'STORAGE' }, 500);
      }

      const dayJson = JSON.parse(await decodeStorage(dayBlob));

      return json({
        processing  : false,
        dataVersion : Date.now(),
        progress,
        imprints,
        dayDefinition: dayJson,
      });
    }

    /* ───── STALE PATH ───── */
    const { data: { user } } = await sbUser.auth.getUser();

    try {
      await sbAdmin.functions.invoke('realtime-broadcast', {
        body: {
          channel: 'flame_status',
          event  : 'missing',
          payload: { user_id: user?.id },
        },
      });
    } catch (be) {
      console.error('broadcast invoke error', be);
    }

    return json({ processing: true }, 202);
  }),
);
