/* ────────────────────────────────────────────────
 * supabase/functions/_shared/5dayquest/FirstFlame.ts
 * Single source of truth for "First Flame" related types and core identifiers.
 * Explicitly re-exports constants from './ritual.constants.ts' for a unified API.
 * ────────────────────────────────────────────────*/

import type { ReadonlyDeep } from 'type-fest';

// Explicit re-exports to avoid namespace collisions and aid auto-imports.
// These imports are relative as ritual.constants.ts is in the same directory.
export {
  STAGE_SPARK, STAGE_SYMBOL, STAGE_MIRROR, STAGE_RHYTHM, STAGE_SIGNATURE,
  RITUAL_STAGES_LOOKUP, DAY_TO_RITUAL_STAGE_MAP, LOG_STAGES
  // RITUAL_STAGE_VALUES is available from './ritual.constants' but not re-exported here
  // to match the provided structure of this file.
} from './ritual.constants.ts';
export type { RitualStage, RitualDayNumber, LogStage } from './ritual.constants.ts';

// Import locally used types that were re-exported.
import type { RitualStage as LocalRitualStage, RitualDayNumber as LocalRitualDayNumber } from './ritual.constants.ts';


/** 🚩 1. Core Identifiers & Configuration */
export const FIRST_FLAME_SLUG = 'first-flame-ritual' as const;
export const FIRST_FLAME_QUEST_ID = FIRST_FLAME_SLUG;
export const FIRST_FLAME_TOTAL_DAYS = 5 as const;

/** 🚩 2. ISO-Timestamp Helpers (Branded Type) */
declare const isoTimestampBrand: unique symbol;
export type TimestampISO = string & { [isoTimestampBrand]: true };

/**
 * Converts a Date, string, or number to a branded ISO timestamp string.
 * @returns TimestampISO string or `null` if the input date is invalid or parsing fails.
 */
export const toTimestampISO = (date: Date | string | number): TimestampISO | null => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      // console.warn('[FirstFlame] Invalid date value provided to toTimestampISO:', date);
      return null;
    }
    return d.toISOString() as TimestampISO;
  } catch (e) {
    // console.error('[FirstFlame] Error constructing Date in toTimestampISO:', date, e);
    return null;
  }
};

/**
 * Asserts that a timestamp is not null. Throws an error if it is.
 * Useful at call-sites where a valid timestamp is strictly expected.
 * @param timestamp The timestamp to check.
 * @param context Optional context string for the error message.
 * @returns The non-null TimestampISO.
 * @throws Error if the timestamp is null.
 */
export function assertTimestamp(timestamp: TimestampISO | null, context?: string): TimestampISO {
  if (timestamp === null) {
    throw new Error(`Assertion Failed: Expected a valid TimestampISO, but received null. Context: ${context || 'Timestamp assertion failed'}`);
  }
  return timestamp;
}

export const toMilliseconds = (iso?: TimestampISO | string | null): number | null => {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  return isNaN(time) ? null : time;
};

export const toDate = (iso?: TimestampISO | string | null): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
};


/** 🚩 3. Data Structure Definitions (Strictly Typed with ReadonlyDeep) */

export type OracleGuidance = ReadonlyDeep<{
  interactionPrompt: string;
  oraclePromptPreview: string;
}>;

export type StaticReflectionJourneyStep = ReadonlyDeep<{
  id: string;
  title: string;
  description: string;
}>;

export type FlameDayDefinition = ReadonlyDeep<{
  ritualDay: LocalRitualDayNumber;
  ritualStage: LocalRitualStage;
  theme: string;
  title: string;
  subtitle: string;
  accentColor?: string;
  iconName?: string;
  intention: string;
  narrativeOpening: string[];
  oracleGuidance: OracleGuidance;
  reflectionJourney: StaticReflectionJourneyStep[];
  contemplationPrompts: string[];
  symbolism: string[];
  affirmation: string;
  narrativeClosing: string[];
}>;

export type ImprintData = ReadonlyDeep<{
  day: LocalRitualDayNumber;
  content: string;
  created_at: TimestampISO;
  metadata: Readonly<Record<string, unknown>> | null;
}>;

export type FlameProgressData = ReadonlyDeep<{
  current_day_target: number;
  is_quest_complete: boolean;
  last_imprint_at: TimestampISO | null;
  updated_at: TimestampISO;
}>;

/** 🚩 4. FlameStatus Object (for Network Payload & Zustand Store state) */
export type FlameStatusPayload = ReadonlyDeep<{
  overallProgress: FlameProgressData | null;
  imprints: ImprintData[];
  dayDefinition: FlameDayDefinition | null;
  warnings?: string[];
}>;

export type FlameStatusInStore = {
  readonly kind: 'flameStatus';
  payload: FlameStatusPayload | null;
  lastFetchedTimestamp?: number;
  error?: string | null;
};

/** 🚩 5. UI-Layer Types (Client-side dynamic state) */
export type UIReflectionJourneyStep = StaticReflectionJourneyStep & {
  readonly isCompleted: boolean;
};