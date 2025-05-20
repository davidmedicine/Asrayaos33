export const DAYDEF_BUCKET = 'asrayaospublicbucket';
export const DAYDEF_PREFIX = '5-day/';
export const DAY_1_PATH    = `${DAYDEF_PREFIX}day-1.json`;

export const FLAME_IMPRINT_STATUS = {
  PENDING   : 'PENDING',
  PROCESSING: 'PROCESSING',
  READY     : 'READY',
  ERROR     : 'ERROR',
} as const;

export type FlameImprintStatus =
  (typeof FLAME_IMPRINT_STATUS)[keyof typeof FLAME_IMPRINT_STATUS];
