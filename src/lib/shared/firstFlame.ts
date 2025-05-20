import type { ReadonlyDeep } from 'type-fest';

/*--------------------------------------------------------------*
 | 1 · Public constants                                          |
 *--------------------------------------------------------------*/
export const FIRST_FLAME_SLUG       = 'first-flame-ritual' as const;
export const FIRST_FLAME_QUEST_ID   = FIRST_FLAME_SLUG;
export const FIRST_FLAME_TOTAL_DAYS = 5 as const;

/*--------------------------------------------------------------*
 | 2 · Ritual-stage enums re-exported for convenience            |
 *   (path alias “@ritual/…” is wired in tsconfig + webpack)     |
 *--------------------------------------------------------------*/
export {
  STAGE_SPARK,
  STAGE_SYMBOL,
  STAGE_MIRROR,
  STAGE_RHYTHM,
  STAGE_SIGNATURE,
  RITUAL_STAGES_LOOKUP,
  DAY_TO_RITUAL_STAGE_MAP,
}                             from '@ritual/ritual.constants';
export type {
  RitualStage,
  RitualDayNumber,
}                             from '@ritual/ritual.constants';

/*--------------------------------------------------------------*
 | 3 · Day-1 JSON (imported via `resolveJsonModule: true`)      |
 *   – This gives us full IntelliSense & keeps source-of-truth   |
 *     in the Supabase shared folder.                           |
 *--------------------------------------------------------------*/
import day1Json from '@ritual/day-1.json';          // <- alias in ts/webpack

export type FlameDayDefinition = ReadonlyDeep<typeof day1Json>;

/** Typed constant for run-time use */
export const DAY1_FLAME_DEFINITION: FlameDayDefinition = day1Json;

/*--------------------------------------------------------------*
 | 4 · Minimal client-side payload types                         |
 *--------------------------------------------------------------*/
export type FlameProgressData = ReadonlyDeep<{
  current_day_target: number;     // 1-5
  is_quest_complete:  boolean;
}>;

export type FlameStatusPayload = ReadonlyDeep<{
  overallProgress: FlameProgressData | null;
  dayDefinition:   FlameDayDefinition | null;
}>;

export type FlameStatusResponse =
  | { processing: true }
  | (ReadonlyDeep<{ processing: false; dataVersion: number }> &
      FlameStatusPayload);

/*--------------------------------------------------------------*
 | 5 · Default export                                            |
 *   Makes `import day1Flame from '@flame'` work out-of-the-box. |
 *--------------------------------------------------------------*/
export default DAY1_FLAME_DEFINITION;