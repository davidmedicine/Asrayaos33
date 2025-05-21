// src/activities/modal.ts
// ────────────────────────────────────────────────────────────
// Activities used by the `seedFirstFlame` Workflow.
// 1️⃣ ensureFlameState  – kicks the Modal worker to create / validate
//                        First-Flame DB rows.
// 2️⃣ broadcastReady    – calls a Supabase Edge Function that emits a
//                        realtime  `flame_status:ready`  broadcast.
// ────────────────────────────────────────────────────────────
import axios, { AxiosError } from 'axios';

/*────────────────────  Helper to assert env-vars  ────────────────────*/
function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`[activities] Missing required env-var ${key}`);
  return v;
}

/*────────────────────  Mandatory configuration  ─────────────────────*/
const MODAL_KICK_URL   = requireEnv('MODAL_KICK_URL');              // string
const SUPABASE_RPC_URL = requireEnv('SUPABASE_RPC_BROADCAST_URL');  // string
const SUPABASE_INSERT_DAY1_URL = requireEnv('SUPABASE_RPC_INSERT_DAY1_URL');

/*────────────────────  Shared Axios client  ─────────────────────────*/
const http = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 5_000, // 5 s so Activities fail fast
});

/*────────────────────  Activities  ─────────────────────────────────*/

/**
 * ensureFlameState
 * --------------------------------
 * Idempotently seeds / refreshes First-Flame rows for the given user.
 */
export async function ensureFlameState(userId: string): Promise<void> {
  try {
    await http.post(MODAL_KICK_URL, { user_id: userId });
  } catch (err) {
    const e = err as AxiosError;
    throw new Error(
      `[ensureFlameState] Modal request failed – ${e.message} ` +
        `(status ${e.response?.status ?? 'n/a'})`,
    );
  }
}

/**
 * insertDayOneMessages
 * --------------------------------
 * Inserts canned Day-1 system & prompt messages for the user.
 */
export async function insertDayOneMessages(userId: string): Promise<void> {
  try {
    await http.post(SUPABASE_INSERT_DAY1_URL, { user_id: userId });
  } catch (err) {
    const e = err as AxiosError;
    throw new Error(
      `[insertDayOneMessages] Supabase Edge Function failed – ${e.message} ` +
        `(status ${e.response?.status ?? 'n/a'})`,
    );
  }
}

/**
 * broadcastReady
 * --------------------------------
 * Emits `flame_status:ready` so the UI knows to refetch ritual data.
 */
export async function broadcastReady(userId: string): Promise<void> {
  try {
    await http.post(SUPABASE_RPC_URL, {
      channel: 'flame_status',
      event  : 'ready',
      payload: { user_id: userId },
    });
  } catch (err) {
    const e = err as AxiosError;
    throw new Error(
      `[broadcastReady] Supabase Edge Function failed – ${e.message} ` +
        `(status ${e.response?.status ?? 'n/a'})`,
    );
  }
}
