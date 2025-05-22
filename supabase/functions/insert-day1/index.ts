// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL  = Deno.env.get('SUPABASE_URL')!
const SB_SVC  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405 })

  const { user_id, quest_id } = await req.json()

  const sb = createClient(SB_URL, SB_SVC, {
    auth: { persistSession: false },
    db  : { schema: 'ritual' },
  })

  // ⚠️ Insert YOUR Day-1 rows here — sample insert follows
  const { error } = await sb
    .from('messages')
    .insert([
      {
        quest_id : quest_id,
        author_id: 'oracle-system',
        role     : 'system',
        content  : 'Welcome to Day 1. Describe a truth you have never spoken aloud.',
        user_id  : user_id,
      },
    ])

  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
