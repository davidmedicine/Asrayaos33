// temporal-worker/src/activities/modal.ts
// ────────────────────────────────────────────────────────────
// Activities used by the `seedFirstFlame` workflow
// ────────────────────────────────────────────────────────────
import axios, { AxiosError } from 'axios';
import { Context } from '@temporalio/activity';

/*────────────────────────  Env helpers  ───────────────────────*/
function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`[activities] Missing required env-var ${key}`);
  return v;
}

/*───────────────────────  Config constants  ───────────────────*/
// Default localhost URLs so the worker “just works” during local dev.
const MODAL_KICK_URL =
  process.env.MODAL_KICK_URL ||
  'http://localhost:54321/functions/v1/modal_app/ensure_flame_state';

const SUPABASE_RPC_URL =
  process.env.SUPABASE_RPC_BROADCAST_URL ||
  'http://localhost:54321/functions/v1/realtime-broadcast';

const SUPABASE_INSERT_DAY1_URL =
  process.env.SUPABASE_RPC_INSERT_DAY1_URL ||
  'http://localhost:54321/functions/v1/insert-day1';

// **Service-role key** is mandatory (Edge Functions need it to bypass RLS)
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

/*────────────────────────  Shared HTTP client  ────────────────*/
// Every request carries the service‑role JWT in both `apikey` *and* `Authorization`
// so Kong/Gotrue never rejects us.
const http = axios.create({
  headers: {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  },
  timeout: 10_000, // fail fast – 5 s
});

/*──────────────────────────  Types  ───────────────────────────*/
interface InsertDay1Response {
  ok?: boolean;
  note?: 'DUPLICATE' | 'INSERTED';
  rows?: number;
  error?: string;
}

export interface FlameActivityParams {
  userId: string;
  questId: string;
}

/*────────────────────────  Activities  ────────────────────────*/
export async function ensureFlameState(
  { userId, questId }: FlameActivityParams,
): Promise<void> {
  const hb = setInterval(() => Context.current().heartbeat(), 20_000);
  try {
    await http.post(MODAL_KICK_URL, { user_id: userId, quest_id: questId });
  } catch (err) {
    const e = err as AxiosError;
    throw new Error(
      `[ensureFlameState] Modal request failed – ${e.message} (status ${
        e.response?.status ?? 'n/a'})`,
    );
  } finally {
    clearInterval(hb);
  }
}

export async function insertDayOneMessages(
  { userId, questId }: FlameActivityParams,
): Promise<void> {
  const hb = setInterval(() => Context.current().heartbeat(), 20_000);
  try {
    const res = await http.post<InsertDay1Response>(SUPABASE_INSERT_DAY1_URL, {
      user_id: userId,
      quest_id: questId,
    });

    console.log(`[insertDayOneMessages] Response: ${JSON.stringify(res.data)}`);

    if (res.data?.note === 'DUPLICATE') {
      console.log(`[insertDayOneMessages] Messages already present for ${userId}`);
    }
  } catch (err) {
    const e = err as AxiosError<InsertDay1Response>;

    // Accept Edge‑Function “pseudo errors” that actually signal success
    if (
      e.response?.data &&
      ['DUPLICATE', 'INSERTED'].includes(e.response.data.note ?? '')
    ) {
      console.log('[insertDayOneMessages] Duplicate/inserted – continuing');
      return;
    }

    throw new Error(
      `[insertDayOneMessages] Edge Function failed – ${e.message} (status ${
        e.response?.status ?? 'n/a'}). Data: ${JSON.stringify(e.response?.data)}`,
    );
  } finally {
    clearInterval(hb);
  }
}

export async function broadcastReady(
  { userId, questId }: FlameActivityParams,
): Promise<void> {
  const hb = setInterval(() => Context.current().heartbeat(), 20_000);
  try {
    await http.post(SUPABASE_RPC_URL, {
      channel: 'flame_status',
      event: 'ready',
      payload: { user_id: userId, quest_id: questId },
    });
  } catch (err) {
    const e = err as AxiosError;
    throw new Error(
      `[broadcastReady] Broadcast failed – ${e.message} (status ${
        e.response?.status ?? 'n/a'})`,
    );
  } finally {
    clearInterval(hb);
  }
}
