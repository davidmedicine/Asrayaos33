// supabase/functions/_shared/types/index.ts

// Re-export QuestRow from the db helper file for easy import elsewhere.
// This QuestRow is the minimal version returned by the updated helper.
export type { QuestRow } from '../db/firstFlame.ts';

// Shared type utility for branded ISO timestamps.
import type { TimestampISO } from '../5dayquest/FirstFlame.ts';

/**
 * Utility to convert a date string or Date object to a branded TimestampISO string.
 * Relies on Postgres to provide valid ISO8601 strings for 'timestamp with time zone' columns.
 * This function primarily serves to "brand" the type.
 * @param dateInput - The ISO8601 date string from Postgres or a Date object.
 * @returns A TimestampISO string.
 * @throws If the dateInput is clearly invalid (e.g., empty string after Date parsing if that were done).
 */
export function toISO(dateInput: string | Date): TimestampISO {
  if (typeof dateInput === 'string') {
    // Basic check, Postgres should provide valid ISO strings.
    // If more robust validation were needed, a regex or library could be used here.
    // For now, we trust the input string format from Postgres.
    return dateInput as TimestampISO;
  }
  // If it's a Date object, convert it.
  if (isNaN(dateInput.getTime())) {
    throw new Error(`Invalid Date object input for toISO.`);
  }
  return dateInput.toISOString() as TimestampISO;
}