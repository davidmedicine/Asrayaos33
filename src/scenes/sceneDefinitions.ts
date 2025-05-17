// ============================================================================
// File: src/lib/scenes/sceneDefinitions.ts
// ----------------------------------------------------------------------------
// One authoritative registry that maps every logical “scene key” in the
// product to a lazy dynamic-import.  The object is exported **twice**:
//
//   • named  →  `export const sceneDefinitions …`   (preferred by new code)
//   • default→  `export default sceneDefinitions`   (legacy compatibility)
//
// This lets both of these lines compile:
//
//   import { sceneDefinitions } from '@/lib/scenes/sceneDefinitions'; // ✅
//   import  sceneDefinitions   from '@/lib/scenes/sceneDefinitions'; // ✅
//
// If you add or rename scenes, change only this file (and optionally
// `sceneAdjacency.ts` for pre-fetch hints); the rest of the routing layer
// updates itself automatically.
// ============================================================================

import type { ComponentType } from 'react';

/** Signature shared by every lazy scene loader (`React.lazy`-compatible). */
export type SceneLoader = () => Promise<{ default: ComponentType<any> }>;

/* ------------------------------------------------------------------------- */
/* Registry                                                                  */
/* ------------------------------------------------------------------------- */

export const sceneDefinitions: Record<string, SceneLoader> = {
  /** Main “lobby” or “hub” scene (formerly “center”). */
  hub: () =>
    import(
      /* webpackChunkName: "scene-hub"   */
      /* webpackPrefetch: true           */
      '@/scenes/HubScene'
    ),

  north: () =>
    import(
      /* webpackChunkName: "scene-north" */
      /* webpackPrefetch: true           */
      '@/scenes/NorthScene'
    ),

  south: () =>
    import(
      /* webpackChunkName: "scene-south" */
      /* webpackPrefetch: true           */
      '@/scenes/SouthScene'
    ),

  east: () =>
    import(
      /* webpackChunkName: "scene-east"  */
      /* webpackPrefetch: true           */
      '@/scenes/EastScene'
    ),

  west: () =>
    import(
      /* webpackChunkName: "scene-west"  */
      /* webpackPrefetch: true           */
      '@/scenes/WestScene'
    ),

  // -----------------------------------------------------------------------
  // 🚀 FUTURE EXPANSION EXAMPLE
  // -----------------------------------------------------------------------
  // underground: () =>
  //   import(
  //     /* webpackChunkName: "scene-underground" */
  //     /* webpackPrefetch: true                */
  //     '@/scenes/UndergroundScene'
  //   ),
};

export default sceneDefinitions;
