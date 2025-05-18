// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DAYDEF_BUCKET, DAYDEF_PREFIX } from '../_shared/5dayquest/ritual.constants.ts';

/* ──────────────── ENV ──────────────── */
const SB_URL  = Deno.env.get('SUPABASE_URL')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SB_SVC  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/* ─────────────── CONFIG ────────────── */
const STALE_MS = 60_000; // 1-min freshness window
const DAY_1_PATH = `${DAYDEF_PREFIX}day-1.json`;

/* ─────────────── CORS ──────────────── */
const cors = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control'               : 'no-store',
} as const;

/* ─────────────── HELPERS ───────────── */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

/** Supabase Storage occasionally returns Uint8Array in Edge Functions */
const decodeStorage = async (blob: unknown): Promise<string> =>
  (blob && typeof (blob as Uint8Array).byteLength === 'number')
    ? new TextDecoder().decode(blob as Uint8Array)
    : await (blob as Blob).text();

/* ─────────────── MAIN ──────────────── */
Deno.serve(async (req) => {
  /* CORS / method guards */
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET')      return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  /* Auth guard */
  const jwt = req.headers.get('Authorization') ?? '';
  if (!jwt.startsWith('Bearer ')) return json({ error: 'AUTH' }, 401);

  /* Supabase clients */
  const sbUser  = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: jwt } },
    auth  : { persistSession: false },
    db    : { schema: 'ritual' },
  });

  const sbAdmin = createClient(SB_URL, SB_SVC, {
    auth: { persistSession: false },
    db  : { schema: 'ritual' },
  });

  /* Pull progress first (cheap) */
  const { data: progress, error: pe } = await sbUser
    .from('flame_progress')
    .select('quest_id, current_day_target, updated_at')
    .maybeSingle();

  if (pe) return json({ error: 'DB' }, 500);

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

    if (ie)             return json({ error: 'DB'      }, 500);
    if (se || !dayBlob) return json({ error: 'STORAGE' }, 500);

    const dayJson = JSON.parse(await decodeStorage(dayBlob));

    return json({
      processing    : false,
      dataVersion   : Date.now(),
      progress,
      imprints,
      dayDefinition : dayJson,
    });
  }

  /* ───── STALE PATH ───── */
  const { data: { user } } = await sbUser.auth.getUser();

  await sbAdmin.functions.invoke('realtime-broadcast', {
    body: {
      channel: 'flame_status',
      event  : 'missing',
      payload: { user_id: user?.id },
    },
  });

  return json({ processing: true }, 202);
});
