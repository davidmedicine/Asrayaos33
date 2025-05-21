import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'

const SB_URL  = Deno.env.get('SUPABASE_URL')!
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SB_SVC  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const safeJson = async (r: Request) => {
  try {
    const text = await r.text()
    if (!text) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: corsHeaders })

  const authHdr = req.headers.get('Authorization') ?? ''
  if (!authHdr.startsWith('Bearer ')) return json({ error: 'AUTH' }, 401)

  const reqJson   = req.method === 'POST' ? await safeJson(req) : null
  const urlParams = new URL(req.url).searchParams
  const questId   = reqJson?.quest_id   ?? urlParams.get('quest_id')
  const userId    = reqJson?.user_id    ?? urlParams.get('user_id')
  const dayNumber = reqJson?.day_number ?? urlParams.get('day_number')

  if (!questId || !userId || dayNumber == null)
    return new Response('quest_id, user_id, day_number required', {
      status: 400,
      headers: corsHeaders,
    })

  const sbUser = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: authHdr } },
    auth  : { persistSession: false },
    db    : { schema: 'ritual' },
  })
  const sbAdmin = createClient(SB_URL, SB_SVC, {
    auth: { persistSession: false },
    db  : { schema: 'ritual' },
  })

  const { data: { user }, error: userErr } = await sbUser.auth.getUser()
  if (userErr || !user?.id) return json({ error: 'AUTH' }, 401)

  const { data: row, error: rowErr } = await sbUser
    .from('v_flame_state_legacy')
    .select('status, progress, payload')
    .match({ quest_id: questId, user_id: userId, day_number: Number(dayNumber) })
    .single()

  if (rowErr) {
    console.error('[get-flame-status] select error', rowErr)
    return json({ error: 'DB' }, 500)
  }

  if (!row) {
    try {
      await sbAdmin.functions.invoke('realtime-broadcast', {
        body: { channel: 'flame_status', event: 'missing', payload: { user_id: userId, quest_id: questId, day_number: Number(dayNumber) } },
      })
    } catch (err) {
      console.error('[get-flame-status] broadcast error', err)
      return new Response((err as Error).message, {
        status: 500,
        headers: corsHeaders,
      })
    }
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (row.status === 'pending') {
    try {
      await sbAdmin.functions.invoke('realtime-broadcast', {
        body: { channel: 'flame_status', event: 'processing', payload: { user_id: userId, quest_id: questId, day_number: Number(dayNumber) } },
      })
    } catch (err) {
      console.error('[get-flame-status] broadcast error', err)
      return new Response((err as Error).message, {
        status: 500,
        headers: corsHeaders,
      })
    }
    return json({ processing: true }, 202)
  }

  return json(row, 200)
})
