// ──────────────────────────────────────────────────────────────
//  Client-side example  ⬇️  (Put this anywhere in your frontend)
/*
await supabase.functions.invoke('list-quests', { method: 'GET' });
*/
// ──────────────────────────────────────────────────────────────

/* ------------------------------------------------------------------
 *  list-quests – Supabase Edge Function (Deno Deploy, supabase-js v2)
 *  • Ensures “First-Flame” quest exists & caller is a participant
 *  • Returns every quest visible via RLS, wrapped in { data, serverTimestamp }
 *  • Unified CORS / Sentry helpers live in ../_shared
 * 2025-07-24 – accepts BOTH GET & POST via withCors()
 * ------------------------------------------------------------------*/

// deno-lint-ignore-file
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { withCors }              from '../_shared/withCors.ts';
import { corsHeaders            } from '../_shared/cors.ts';
import { log                    } from '../_shared/logger.ts';
import { maskAuthorizationHeader } from '../_shared/jwt.ts';
import { initializeSentryOnce, captureError, flushSentryEvents }
       from '../_shared/sentry.ts';
import { getOrCreateFirstFlame, type QuestRow as MinQuestRow }
       from '../_shared/db/firstFlame.ts';
import { toISO                  } from '../_shared/types/index.ts';

import { FIRST_FLAME_SLUG, type TimestampISO }
       from '../_shared/5dayquest/FirstFlame.ts';

initializeSentryOnce();

/* ─────────────── ENV ─────────────── */
const FN      = 'list-quests';
const SB_URL  = Deno.env.get('SUPABASE_URL')!;
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SB_SVC  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DEBUG   = Deno.env.get(`DEBUG_${FN.toUpperCase().replace(/-/g, '_')}`) === 'true';

/* ─────────────── Types ────────────── */
interface QuestRow {
  id: string; slug: string; title: string; type: string;
  realm: string | null; is_pinned: boolean | null; created_at: string;
  agent_id: string | null; last_message_preview: string | null;
  unread_count: number | null; community_id: string | null;
}
interface QuestPayload {
  id: string; slug: string; name: string; type: string;
  timestamp: TimestampISO; createdAt: TimestampISO;
  lastMessagePreview: string; unreadCount: number;
  agentId: string | null; realm?: string | null;
  isPinned: boolean; communityId?: string | null;
  isFirstFlameRitual: boolean;
}
const mapRow = (r: QuestRow): QuestPayload => ({
  id: r.id,
  slug: r.slug,
  name: r.title,
  type: r.type,
  timestamp: toISO(r.created_at),
  createdAt: toISO(r.created_at),
  lastMessagePreview:
    r.last_message_preview ??
    (r.slug === FIRST_FLAME_SLUG ? 'Begin your inner journey…' : 'No messages yet'),
  unreadCount: r.unread_count ?? 0,
  agentId: r.agent_id,
  realm: r.realm ?? undefined,
  isPinned: r.is_pinned ?? (r.slug === FIRST_FLAME_SLUG),
  communityId: r.community_id ?? undefined,
  isFirstFlameRitual: r.slug === FIRST_FLAME_SLUG,
});
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Cache-Control': 'no-store' },
  });

/* ─────────────── Handler ───────────── */
Deno.serve(withCors(async (req) => {
  const t0 = performance.now();
  const method = req.method.toUpperCase();          // GET | POST (OPTIONS handled by withCors)

  if (method !== 'GET' && method !== 'POST')
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const authHdr = req.headers.get('Authorization') ?? '';
  const masked  = maskAuthorizationHeader(authHdr);

  try {
    if (!authHdr.startsWith('Bearer '))
      return json({ error: 'AUTH' }, 401);

    /* Supabase clients */
    const sbUser = createClient(SB_URL, SB_ANON, {
      global: { headers: { Authorization: authHdr } },
      auth  : { persistSession: false },
      db    : { schema: 'ritual' },
    });
    const sbAdmin = createClient(SB_URL, SB_SVC, {
      auth: { persistSession: false },
      db  : { schema: 'ritual' },
    });

    const { data: { user } } = await sbUser.auth.getUser();
    if (!user?.id) return json({ error: 'AUTH' }, 401);

    /* 1️⃣ Ensure First-Flame exists + caller is participant */
    const ff: MinQuestRow = await getOrCreateFirstFlame(sbAdmin, {
      title: 'First Flame Ritual',
      type : 'ritual',
      realm: 'first_flame',
      is_pinned: true,
    });
    await sbAdmin.from('quest_participants').upsert(
      { quest_id: ff.id, user_id: user.id, role: 'participant' },
      { onConflict: 'quest_id,user_id', ignoreDuplicates: true },
    );

    /* 2️⃣ Fetch quests visible via RLS */
    const { data, error } = await sbUser
      .from('quests')
      .select(`
        id, slug, title, type, realm, is_pinned, created_at,
        agent_id, last_message_preview, unread_count, community_id
      `);
    if (error) throw error;

    /* 3️⃣ Transform + deterministic sort */
    const payload = (data as QuestRow[])
      .map(mapRow)
      .sort((a, b) => {
        if (a.isFirstFlameRitual !== b.isFirstFlameRitual)
          return a.isFirstFlameRitual ? -1 : 1;
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    /* 4️⃣ Return wrapper React-Query expects */
    return json({
      data: payload,
      serverTimestamp: new Date().toISOString() as TimestampISO,
    });

  } catch (err: unknown) {
    const e  = err instanceof Error ? err : new Error(String(err));
    const sc = (e as any).status && (e as any).status >= 400 && (e as any).status < 600
             ? (e as any).status : 500;
    captureError(e, { context: FN, maskedAuth: masked });
    log('ERROR', e.message, { stack: e.stack }, FN, true);
    return json({ error: (e as any).code ?? 'SERVER_ERROR' }, sc);
  } finally {
    await flushSentryEvents(500);
    if (DEBUG)
      log('DEBUG', `done in ${(performance.now() - t0).toFixed(1)} ms`, null, FN, true);
  }
}));
