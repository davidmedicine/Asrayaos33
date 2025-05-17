/**
 * src/lib/routing/registry.ts · v4.0
 * ---------------------------------------------------------------------
 * Canonical mapping from a CompassDir (world direction) to its route
 * metadata.  Import this anywhere you need to resolve a direction
 * into a Next.js App-Router pathname or show human-readable labels.
 */

import type { CompassDir, RouteRegistry } from '@/types/compass';

/** Ordered exactly like your Compass model so modulo logic still works. */
export const routeRegistry: RouteRegistry = {
  north:  {
    path: '/world/north',          // Mandala canvas + coherence meter
    name: 'World Wheel',
    description: 'Navigate the biome mandala and monitor global coherence',
    iconId: 'ArrowUp',             // Matches Lucide import; purely optional
  },
  east:   {
    path: '/guild',                // Guild Commons, conversations, context
    name: 'Guild Commons',
    description: 'Group chat threads and shared context panels',
    iconId: 'ArrowRight',
  },
  south:  {
    path: '/sanctum',              // Inner Sanctum, ritual workspace
    name: 'Inner Sanctum',
    description: 'Quest rituals, step list and private practice tools',
    iconId: 'ArrowDown',
  },
  west:   {
    path: '/library',              // ARK Library, lore & artifacts
    name: 'ARK Library',
    description: 'Browse lore, artifacts and archival records',
    iconId: 'ArrowLeft',
  },
  center: {
    path: '/',                     // Oracle Hub = app landing
    name: 'Oracle Hub',
    description: 'Chat with the Oracle, quick actions and prophecy log',
    iconId: 'Home',
  },
} as const satisfies RouteRegistry;
