// src/workflows/seedFirstFlame.ts
import * as wf from '@temporalio/workflow';
import type * as act from '../activities';         // adjust the path if your activities live elsewhere

/** -------- Types -------- */
export interface SeedFirstFlameInput {
  userId: string;
}

/** -------- Optional signal (remove if not needed yet) -------- */
export const seedFirstFlameSignal = wf.defineSignal<[SeedFirstFlameInput]>(
  'seedFirstFlame',
);

/** -------- Activity proxies --------
 *  • `ensureFlameState`    – creates / validates DB rows in Supabase
 *  • `insertDayOneMessages` – seeds Day‑1 prompt messages
 *  • `broadcastReady`      – sends realtime ready event
 *  Edit the timeout / retry settings per Activity as you refine them.
 */
const { ensureFlameState, insertDayOneMessages, broadcastReady } = wf.proxyActivities<
  typeof act
>({
  startToCloseTimeout: '1 minute',
  retry: { maximumAttempts: 5 },
});

/** -------- Workflow implementation -------- */
export async function seedFirstFlame(
  input: SeedFirstFlameInput,
): Promise<void> {
  // 1) Guarantee quest-state exists
  await ensureFlameState(input.userId);

  // 2) Insert Day‑1 system + prompt messages
  await insertDayOneMessages(input.userId);

  // 3) Tell the front-end it can refetch
  await broadcastReady(input.userId);
}
