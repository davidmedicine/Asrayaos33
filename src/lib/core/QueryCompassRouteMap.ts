// -----------------------------------------------------------------------------
// queryCompassRouteMap.ts · v1.0
// -----------------------------------------------------------------------------
// Thin wrapper around the compassRouteMap / routeContextMap exports provided
// by layoutRegistry.ts.  Exists so other modules can import a *single* helper
// instead of reaching into layoutRegistry directly.
// -----------------------------------------------------------------------------

import {
    compassRouteMap,
    routeContextMap,
    resolveContextKey,
    CompassKey,
  } from './layoutRegistry';
  
  /* -------------------------------------------------------------------------- */
  /*                              PUBLIC API                                    */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Return the canonical route (pathname prefix) for a given CompassKey.
   *
   * ```ts
   * getRouteForKey('oracle-hub');   // → "/center"
   * ```
   */
  export function getRouteForKey(key: CompassKey): string {
    return compassRouteMap[key];
  }
  
  /**
   * Resolve a pathname (can include sub-routes) back to a CompassKey.
   *
   * ```ts
   * getKeyForPath("/east/chat/123"); // → "guild-commons"
   * getKeyForPath("/foo");           // → null
   * ```
   */
  export function getKeyForPath(path: string | null | undefined): CompassKey | null {
    return resolveContextKey(path);
  }
  
  /**
   * Convenience boolean guard — *is this* path under a Compass domain?
   */
  export function isCompassPath(path: string | null | undefined): boolean {
    return getKeyForPath(path) !== null;
  }
  
  /**
   * List every (route, key) pair — handy for generating <Link>s or sitemap XML.
   */
  export function getAllCompassRoutes(): ReadonlyArray<[string, CompassKey]> {
    return routeContextMap;
  }
  
  /* -------------------------------------------------------------------------- */
  /*                               TYPE RE-EXPORTS                              */
  /* -------------------------------------------------------------------------- */
  
  export type { CompassKey } from './layoutRegistry';
  