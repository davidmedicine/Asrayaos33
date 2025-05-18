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
const DAYDEF_PREFIX     = './5-day/';   // 👈 NEW – sub-folder for day defs

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
  /* Build an absolute URL that works locally & on Deno Deploy */
  const jsonUrl = new URL(`${DAYDEF_PREFIX}day-${day}.json`, import.meta.url).href;

  /* Deno 1.42+ JSON import with runtime type-safety */
  const mod = await import(jsonUrl, { assert: { type: 'json' } });
  const validated = FlameDayDefinitionZ.parse(mod.default) as Readonly<FlameDayDefinition>;

  log('INFO', `loaded & validated ritual Day ${day}`);
  return validated;
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
