/* ------------------------------------------------------------------
 * src/lib/core/FirstFlame.zod.ts
 * Runtime validators for First-Flame payloads & client contracts.
 * ------------------------------------------------------------------*/

import { z } from 'zod';

/* ───────── 1 · Imports from the core source-of-truth ───────── */

import {
  /** literal tuple of the five stage strings – perfect for z.enum() */
  RITUAL_STAGE_VALUES,
} from '../../../supabase/functions/_shared/5dayquest/ritual.constants'; // Corrected path

import {
  toTimestampISO,
  type TimestampISO,               // ← type-only; stripped from JS output
} from '../../../supabase/functions/_shared/5dayquest/FirstFlame'; // Corrected path

/* ───────── 2 · Reusable helpers ───────── */

/** ISO-8601 timestamp → branded `TimestampISO`. */
export const zTimestampISO = z.string()
  .refine((val) => !Number.isNaN(new Date(val).getTime()), {
    message: 'Invalid ISO-8601 timestamp string',
  })
  .transform((val) => toTimestampISO(val) as TimestampISO);

/** Enum schema for the five ritual stages. */
export const zRitualStage = z.enum(RITUAL_STAGE_VALUES);

/* ───────── 3 · Contract schemas ───────── */

export const zFirstFlameOverallProgress = z.object({
  currentDayTarget: z.number().int().min(0).max(5),   // 0 = not started
  isQuestComplete : z.boolean(),
  lastImprintAt   : zTimestampISO.nullable(),
});

export const zStartFirstFlameResponse = z.object({
  success          : z.boolean(),
  questId          : z.literal('first-flame-ritual'),
  overallProgress  : zFirstFlameOverallProgress.nullable(),
  questDisplayName : z.string(),
  code             : z.string().optional(),  // e.g. 'already_started'
  message          : z.string().optional(),
});
export type StartFirstFlameResponsePayload = z.infer<typeof zStartFirstFlameResponse>;

export const zRitualDayContent = z.object({
  ritualDay          : z.number().int().min(1).max(5),
  theme              : z.string().min(1),
  title              : z.string().min(1),
  narrativeOpening   : z.array(z.string().min(1)).min(1),
  oraclePromptPreview: z.string().min(1),
  reflectionGuide    : z.array(z.string().min(1)).min(1),
  accentColor        : z.string().regex(
    /^var\(--palette-[a-z]+-\d{3}\)$/,
    { message: 'Accent colour must be var(--palette-xxx-nnn)' },
  ),
  ritualStage        : zRitualStage,
});
export type RitualDayContentData = z.infer<typeof zRitualDayContent>;