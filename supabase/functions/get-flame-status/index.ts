// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/*────────────────────────  ENV  ───────────────────────*/
const SB_URL  = Deno.env.get('SUPABASE_URL')!
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SB_SVC  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/*────────────────────────  CONFIG  ────────────────────*/
const STALE_MS      = 60_000                // 1 min freshness
const DAYDEF_BUCKET = 'asrayaospublicbucket'/* ← matches Modal worker */
const DAY_1_PATH    = 'day-1.json'          // can parameterise later

/*────────────────────────  CORS  ──────────────────────*/
const cors = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control'               : 'no-store',
} as const

/*────────────────────────  MAIN  ──────────────────────*/
Deno.serve(async (req) => {
  /* pre-flight */
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if (req.method !== 'GET')
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }),
                        { status: 405, headers: cors })

  /*── Auth guard ──────────────────────────────────────*/
  const jwt = req.headers.get('Authorization') ?? ''
  if (!jwt.startsWith('Bearer '))
    return new Response(JSON.stringify({ error: 'AUTH' }),
                        { status: 401, headers: cors })

  /*── Supabase clients ────────────────────────────────*/
  const sbUser  = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: jwt } },
    auth  : { persistSession: false },
    db    : { schema: 'ritual' },
  })
  const sbAdmin = createClient(SB_URL, SB_SVC, {
    auth: { persistSession: false },
    db  : { schema: 'ritual' },
  })

  /*── Fast-path read ─────────────────────────────────*/
  const { data: progress, error: pe } = await sbUser
    .from('flame_progress')
    .select('quest_id, current_day_target, updated_at')
    .maybeSingle()

  if (pe) {
    console.error(pe)
    return new Response(JSON.stringify({ error: 'DB' }),
                        { status: 500, headers: cors })
  }

  const isFresh =
    progress &&
    Date.now() - new Date(progress.updated_at).getTime() <= STALE_MS

  if (isFresh) {
    /* also fetch imprints + Day-1 JSON (cheap) */
    const [{ data: imprints }, day1Blob] = await Promise.all([
      sbUser
        .from('flame_imprints')
        .select('day, payload_text, created_at')
        .order('day'),
      sbUser.storage.from(DAYDEF_BUCKET).download(DAY_1_PATH),
    ])

    /** Supabase Storage returns bytes (Uint8Array | Blob) → decode first */
    const day1Json = JSON.parse(
      (day1Blob as Uint8Array).length !== undefined
        ? new TextDecoder().decode(day1Blob as Uint8Array)
        : await (day1Blob as Blob).text(),
    ) as Record<string, unknown>

    return new Response(
      JSON.stringify({
        processing: false,
        progress,
        imprints,
        dayDefinition: day1Json,
      }),
      { headers: cors },
    )
  }

  /*── Not fresh → signal Modal worker & return 202 ──*/
  const { data: userData } = await sbUser.auth.getUser()
  await sbAdmin.functions.invoke('realtime-broadcast', {
    body: {
      channel: 'flame_status',
      event: 'missing',
      payload: { user_id: userData.user?.id },
    },
  })

  return new Response(JSON.stringify({ processing: true }),
                      { status: 202, headers: cors })
})
