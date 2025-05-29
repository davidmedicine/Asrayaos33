// src/workflows/seedFirstFlame.ts
import * as wf from '@temporalio/workflow';
import type * as act from '../activities';         // adjust the path if your activities live elsewhere
import { FIRST_FLAME_SLUG } from '../../../src/lib/shared/firstFlame';

/** -------- Types -------- */
export interface SeedFirstFlameInput {
  userId: string;
}

/** -------- Optional signal (remove if not needed yet) -------- */
export const seedFirstFlameSignal = wf.defineSignal<[SeedFirstFlameInput]>(
  'seedFirstFlame',
);

function getFirstFlameQuestId(): string {
  // In this simplified worker environment the First‑Flame quest slug is
  // bundled at build time alongside the front-end constant.
  // The actual UUID will be looked up from the database.
  return FIRST_FLAME_SLUG;
}

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
  const questId = getFirstFlameQuestId();

  // 1) Guarantee quest-state exists
  await ensureFlameState({ userId: input.userId, questId });

  // 2) Insert Day‑1 system + prompt messages
  await insertDayOneMessages({ userId: input.userId, questId });

  // 3) Tell the front-end it can refetch
  await broadcastReady({ userId: input.userId, questId });
}
