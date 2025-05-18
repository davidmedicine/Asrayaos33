/* ────────────────────────────────────────────────
 * supabase/functions/_shared/5dayquest/ritual.constants.ts – single source-of-truth
 * ────────────────────────────────────────────────*/

export type RitualDayNumber = 1 | 2 | 3 | 4 | 5;

/** Storage folder prefix for ritual day-definition JSON files */
export const DAYDEF_PREFIX = '5-day/' as const;
/** Public Supabase bucket containing the day-definition files */
export const DAYDEF_BUCKET = 'asrayaospublicbucket' as const;

/* stages – individual exports for tree-shaking */
export const STAGE_SPARK     = 'spark'     as const;
export const STAGE_SYMBOL    = 'symbol'    as const;
export const STAGE_MIRROR    = 'mirror'    as const;
export const STAGE_RHYTHM    = 'rhythm'    as const;
export const STAGE_SIGNATURE = 'signature' as const;

export type RitualStage =
  | typeof STAGE_SPARK
  | typeof STAGE_SYMBOL
  | typeof STAGE_MIRROR
  | typeof STAGE_RHYTHM
  | typeof STAGE_SIGNATURE;

/* 👇 NEW – literal tuple exactly once, reusable everywhere */
export const RITUAL_STAGE_VALUES = [
  STAGE_SPARK,
  STAGE_SYMBOL,
  STAGE_MIRROR,
  STAGE_RHYTHM,
  STAGE_SIGNATURE,
] as const;

/* handy lookup objects */
export const RITUAL_STAGES_LOOKUP = Object.freeze({
  SPARK    : STAGE_SPARK,
  SYMBOL   : STAGE_SYMBOL,
  MIRROR   : STAGE_MIRROR,
  RHYTHM   : STAGE_RHYTHM,
  SIGNATURE: STAGE_SIGNATURE,
} satisfies Record<Uppercase<RitualStage>, RitualStage>);

export const DAY_TO_RITUAL_STAGE_MAP = {
  1: STAGE_SPARK,
  2: STAGE_SYMBOL,
  3: STAGE_MIRROR,
  4: STAGE_RHYTHM,
  5: STAGE_SIGNATURE,
} as const;

/** 🚩 Structured Log Stage Constants (for `first_flame_logs` table) */
// (Assuming LOG_STAGES from your original src/lib/core/ritual.constants.ts is desired here too)
export const LOG_STAGES = Object.freeze({
  INITIATION_ATTEMPT: 'ritual_initiation_attempt',
  INITIATION_SUCCESS: 'ritual_initiation_success',
  INITIATION_FAILURE_DB: 'ritual_initiation_failure_db',
  INITIATION_FAILURE_RATE_LIMIT: 'ritual_initiation_failure_rate_limit',
  INITIATION_FAILURE_ALREADY_STARTED: 'ritual_initiation_failure_already_active',
  IMPRINT_SUBMITTED: 'ritual_imprint_submitted',
  DAY_COMPLETED: 'ritual_day_completed',
  RITUAL_COMPLETED: 'ritual_ritual_completed',
  GET_FLAME_STATUS_NO_PROGRESS_CREATED:'get_flame_status_no_progress_created_new',
  SUBMIT_IMPRINT_SUCCESS:              'submit_flame_imprint_success',
  SUBMIT_IMPRINT_DAY_ADVANCED:         'submit_flame_imprint_day_advanced',
  SUBMIT_IMPRINT_RITUAL_COMPLETE:      'submit_flame_imprint_ritual_complete',
  SUBMIT_IMPRINT_FAILURE:              'submit_flame_imprint_failure',
  EF_LIST_QUESTS_START:                'ef_list_quests_start',
  EF_LIST_QUESTS_SUCCESS:              'ef_list_quests_success',
  EF_LIST_QUESTS_ERROR:                'ef_list_quests_error',
  EF_GET_FLAME_STATUS_START:           'ef_get_flame_status_start',
  EF_GET_FLAME_STATUS_SUCCESS:         'ef_get_flame_status_success',
  EF_GET_FLAME_STATUS_ERROR:           'ef_get_flame_status_error',
  EF_GET_FLAME_STATUS_CACHE_HIT:       'ef_get_flame_status_day_def_cache_hit',
  EF_GET_FLAME_STATUS_CACHE_MISS:      'ef_get_flame_status_day_def_cache_miss',
  EF_SUBMIT_IMPRINT_START:             'ef_submit_imprint_start',
  EF_SUBMIT_IMPRINT_ERROR:             'ef_submit_imprint_error',
} as const);
export type LogStage = typeof LOG_STAGES[keyof typeof LOG_STAGES];