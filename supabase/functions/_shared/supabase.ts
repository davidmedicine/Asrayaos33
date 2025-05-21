import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL  = Deno.env.get('SUPABASE_URL')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SB_SVC  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export function getSupabaseUser(req: Request): SupabaseClient {
  const auth = req.headers.get('Authorization') ?? '';
  return createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: auth } },
    auth  : { persistSession: false },
    db    : { schema: 'ritual' },
  });
}

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(SB_URL, SB_SVC, {
    auth: { persistSession: false },
    db  : { schema: 'ritual' },
  });
}
