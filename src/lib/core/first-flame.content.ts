// src/lib/core/first-flame.content.ts
import type { RitualStage } from '../../../supabase/functions/_shared/5dayquest/FirstFlame'; // Assuming type is in FirstFlame.ts
import day1 from './data/first-flame/day-1.json'; // Relative path within src/lib/core
import day2 from './data/first-flame/day-2.json'; // Relative path within src/lib/core
import day3 from './data/first-flame/day-3.json'; // Relative path within src/lib/core
import day4 from './data/first-flame/day-4.json'; // Relative path within src/lib/core
import day5 from './data/first-flame/day-5.json'; // Relative path within src/lib/core
// ... import day2, day3, day4, day5 JSON files ...

// Define the type matching the JSON structure + ritualStage
export interface RitualDayContentData {
  ritualDay: number;
  theme: string;
  title: string;
  narrativeOpening: string[];
  oraclePromptPreview: string;
  reflectionGuide: string[];
  accentColor: string;
  ritualStage: RitualStage; // Added this for consistency if needed
}

// Validate and structure the imported JSON data
// (Build-time validation happens elsewhere, here we just cast/structure)
export const firstFlameRitualContent: Readonly<Record<number, RitualDayContentData>> = {
  1: { ...(day1 as any), ritualStage: 'spark' }, // Add stage if not in JSON
  // 2: { ...(day2 as any), ritualStage: 'symbol' },
  // ... days 3, 4, 5
};

// You might also define the type directly in FirstFlame.ts and import it here
// export type { RitualDayContentData } from './FirstFlame'; // If type defined there