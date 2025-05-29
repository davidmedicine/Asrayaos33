/* ────────────────────────────────────────────────────────────────
 * supabase/functions/_shared/5dayquest/flame-data-loader.ts
 * Loads, validates & LRU-caches First-Flame day-definition JSON.
 * ────────────────────────────────────────────────────────────────*/

import { FlameDayDefinitionZ } from '../zod/flameDayDefinition.ts';
import type {
  RitualDayNumber,
  FlameDayDefinition,
} from './FirstFlame.ts';

/*────────────────────────  Config  ────────────────────────*/
const MAX_CACHE_ENTRIES = 7;      // 5 ritual days + 2 spare
const DAYDEF_PREFIX     = './';   // Load from the same directory as this file

/*───────────────────────  State  ──────────────────────────*/
const dataCache   = new Map<RitualDayNumber, Readonly<FlameDayDefinition>>();
const promisePool = new Map<RitualDayNumber, Promise<Readonly<FlameDayDefinition>>>();

const DEBUG = Deno.env.get('DEBUG_FLAME_LOADER') === 'true';

/*──────────────────────  Logger  ─────────────────────────*/
function log(
  lvl: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR',
  msg: string,
  extra?: unknown,
): void {
  if (
    lvl === 'ERROR' || lvl === 'WARN' ||
    (DEBUG && (lvl === 'INFO' || lvl === 'DEBUG'))
  ) {
    (console as any)[lvl.toLowerCase()]?.(
      `[flame-loader] [${lvl}] ${msg}`,
      extra ?? '',
    );
  }
}

/*──────────────────  LRU helpers  ───────────────────────*/
function touch(day: RitualDayNumber, def?: Readonly<FlameDayDefinition>) {
  if (dataCache.has(day)) {
    /* move-to-back = most-recent */
    const value = dataCache.get(day)!;
    dataCache.delete(day);
    dataCache.set(day, value);
  } else if (def) {
    dataCache.set(day, def);
  }

  /* evict least-recently used */
  if (dataCache.size > MAX_CACHE_ENTRIES) {
    const [lru] = dataCache.keys();
    dataCache.delete(lru);
    promisePool.delete(lru);
    log('DEBUG', `evicted Day ${lru} from LRU cache`);
  }
}

/*──────────────────  Core loader  ───────────────────────*/
async function fetchAndValidate(
  day: RitualDayNumber,
): Promise<Readonly<FlameDayDefinition>> {
  // Try multiple possible locations for the day definition files
  const possiblePaths = [
    `./day-${day}.json`,                   // Root directory of 5dayquest (most common)
    `./${DAYDEF_PREFIX}day-${day}.json`,   // Current configured prefix
    `../5dayquest/day-${day}.json`,        // Relative from _shared directory
    `./5-day/day-${day}.json`              // 5-day subdirectory (old path)
  ];
  
  let lastError: Error | null = null;
  
  // Try each path in sequence
  for (const path of possiblePaths) {
    try {
      /* Build an absolute URL that works locally & on Deno Deploy */
      const jsonUrl = new URL(path, import.meta.url).href;
      
      /* Deno 1.42+ JSON import with runtime type-safety */
      const mod = await import(jsonUrl, { assert: { type: 'json' } });
      const validated = FlameDayDefinitionZ.parse(mod.default) as Readonly<FlameDayDefinition>;
      
      log('INFO', `loaded & validated ritual Day ${day} from ${path}`);
      return validated;
    } catch (err) {
      lastError = err as Error;
      log('DEBUG', `Failed to load day definition from ${path}`, err);
      // Continue to next path
    }
  }
  
  // If we've tried all paths and still failed, throw the last error
  log('ERROR', `Failed to load day definition for day ${day} from all possible paths`, lastError);
  throw lastError;
}

/*──────────────────  Public API  ───────────────────────*/

/**
 * Loads & caches a day-definition JSON (LRU, promise de-dup).
 * @param day  Ritual day (1 – 5)
 */
export async function loadValidateAndCacheDayDef(
  day: RitualDayNumber,
): Promise<Readonly<FlameDayDefinition>> {
  if (dataCache.has(day)) {
    log('DEBUG', `cache hit Day ${day}`);
    touch(day);
    return dataCache.get(day)!;
  }

  if (promisePool.has(day)) {
    log('DEBUG', `awaiting in-flight load Day ${day}`);
    return promisePool.get(day)!;
  }

  const p = fetchAndValidate(day)
    .then((def) => {
      touch(day, def);
      promisePool.delete(day);
      return def;
    })
    .catch((err) => {
      promisePool.delete(day);
      throw err;
    });

  promisePool.set(day, p);
  return p;
}

/*────────────────────  Misc helpers  ────────────────────*/

/** ⚡ Test helper – evict a specific day from both caches. */
export function bustCacheForDay(day: RitualDayNumber) {
  dataCache.delete(day);
  promisePool.delete(day);
  log('INFO', `manual cache bust Day ${day}`);
}

/** Expose the Zod schema for integration tests. */
export { FlameDayDefinitionZ as TestOnly_FlameDayDefinitionZSchema };
