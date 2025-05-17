// -----------------------------------------------------------------------------
// File: src/lib/scenes/sceneAdjacency.ts
// Description:
//   Describes which scenes should be considered “adjacent” to each other
//   in the current world-layout.  The graph is used by `useStageRouter`
//   to decide which scene bundles to pre-fetch whenever the active scene
//   changes.
//
//   ┌──── north ────┐
//   │               │
//   west —— center —— east
//   │               │
//   └──── south ────┘
//
//   ── Why adjacency? ─────────────────────────────────────────────────────────
//   • **UX** – Predictive pre-fetching hides network latency when the player
//     moves from one zone to its immediate neighbours.
//   • **Performance** – We avoid “shot-gun” loading *all* scenes; only the
//     likely next hops are fetched. Modern bundlers hoist the `import()` that
//     has already been executed, ensuring each scene’s JS & assets are fetched
//     once and cached thereafter.&#8203;:contentReference[oaicite:0]{index=0}
//
//   If you ever change the world-layout (e.g. add NE / SW quadrants, portals,
//   etc.), update the map below accordingly.
//
// -----------------------------------------------------------------------------

import type { SceneKey } from './sceneDefinitions';

/**
 * A partial adjacency list:
 *   key   → the scene currently active
 *   value → array of scene keys that are immediate neighbours and are worth
 *            pre-fetching when the key scene becomes active.
 *
 * NB: `Partial<…>` lets you omit keys that have no neighbours or should not
 *     trigger any pre-fetch (e.g. an “isolated” bonus level).
 */
export const sceneAdjacency: Partial<Record<SceneKey, SceneKey[]>> = {
  center: ['north', 'south', 'east', 'west'],

  north : ['center', 'east', 'west'],
  south : ['center', 'east', 'west'],

  east  : ['center', 'north', 'south'],
  west  : ['center', 'north', 'south'],
};

export default sceneAdjacency;
