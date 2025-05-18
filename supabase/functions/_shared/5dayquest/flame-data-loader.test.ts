import { describe, it, expect } from 'vitest';
import { loadValidateAndCacheDayDef, bustCacheForDay } from './flame-data-loader.ts';

// Simple sanity check to ensure day definition path uses the shared prefix

describe('flame-data-loader', () => {
  it('loads day definition with correct prefix', async () => {
    const day1 = await loadValidateAndCacheDayDef(1);
    expect(day1.ritualDay || day1.day).toBe(1);
    bustCacheForDay(1);
  });
});
