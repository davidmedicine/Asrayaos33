// src/hooks/useRitualDayContent.ts
import { useMemo } from 'react';

// --- Corrected Import Path ---
// Adjusted to kebab-case and assuming it's directly in lib/core
import {
  firstFlameRitualContent,
  type RitualDayContentData, // Import the type correctly
} from '@/lib/core/first-flame.content'; // ADJUST THIS PATH TO YOUR ACTUAL FILE LOCATION

// Import constants for validation
import { FIRST_FLAME_TOTAL_DAYS } from 'supabase/functions/_shared/5dayquest/FirstFlame'; // Centralized constants


/**
 * Hook to retrieve the structured content for a specific day of the First Flame ritual.
 * Data is bundled and assumed to be validated at build-time.
 *
 * @param day - The ritual day number (1 to FIRST_FLAME_TOTAL_DAYS).
 *              Accepts undefined, null, or numbers outside the valid range.
 * @returns The content object (`RitualDayContentData`) for the valid day, or null otherwise.
 */
export const useRitualDayContent = (
  day: number | undefined | null
): RitualDayContentData | null => {

  const dayContent = useMemo(() => {
    // Strict validation against the total number of days
    if (
      typeof day !== 'number' ||
      !Number.isInteger(day) || // Ensure it's an integer
      day < 1 ||
      day > FIRST_FLAME_TOTAL_DAYS // Use constant for total days
    ) {
      return null; // Return null for invalid, out-of-range, or non-integer days
    }

    // Direct lookup from the pre-validated, bundled map
    const content = firstFlameRitualContent[day];

    // Content should exist if the day is valid due to build validation.
    // Return the content or null if (unexpectedly) missing.
    return content ?? null;

  }, [day]); // Dependency: Only recalculate if the day input changes

  return dayContent;
};