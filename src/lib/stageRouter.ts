/**
 * src/lib/stageRouter.ts
 * ---------------------------------------------------------------------------
 * Hook & helpers for managing the active scene state (Zustand) based on an
 * external key (e.g., from UI state or URL) and pre-fetching related scenes.
 *
 * Ensures synchronization between the provided `zoneKey` and the global
 * `activeSceneKey` in the Zustand store. Handles pre-fetching of adjacent
 * scene code chunks for smoother navigation.
 *
 * - Validates input keys against `sceneDefinitions`.
 * - Updates Zustand state directly via `setActiveSceneKey`.
 * - Pre-fetches neighbours defined in `sceneAdjacency`.
 * - Includes dev-time checks for store setup correctness.
 * - Fully SSR-safe: avoids browser-specific APIs on the server.
 *
 * ```tsx
 * import { useStageRouter, type SceneKey } from '@/lib/stageRouter';
 * import { useAppStore } from '@/lib/state/store';
 *
 * function MyComponent() {
 *   // Example: Get zone from another part of the state or props
 *   const currentZone = useAppStore(state => state.currentZone) as SceneKey | null;
 *   const is3DEnabled = useAppStore(state => state.is3DEnabled);
 *
 *   useStageRouter(currentZone, { enabled: is3DEnabled });
 *
 *   // ... render based on activeSceneKey from useAppStore(selectSceneState)
 * }
 * ```
 * ---------------------------------------------------------------------------
 */

import { useEffect } from 'react';
import { shallow } from 'zustand/shallow'; // Correct named import

// State management imports
import { useAppStore, selectSceneState } from '@/lib/state/store';

// Scene definition and adjacency imports (adjust paths as needed)
import { sceneDefinitions } from '@/scenes/sceneDefinitions';
import { sceneAdjacency }   from '@/scenes/sceneAdjacency';

////////////////////////////////////////////////////////////////////////////////
// Types ----------------------------------------------------------------------

/**
 * Literal union of all valid scene keys, derived from `sceneDefinitions`.
 * This ensures type safety for keys used throughout the staging system.
 */
export type SceneKey = keyof typeof sceneDefinitions;

/** Optional configuration for the `useStageRouter` hook. */
interface StageRouterOptions {
  /**
   * If `false`, the hook becomes completely inert, performing no actions.
   * Useful for disabling 3D effects based on settings or `prefers-reduced-motion`.
   * Defaults to `true`.
   */
  enabled?: boolean;
}

////////////////////////////////////////////////////////////////////////////////
// Internal Cache (Unchanged) -------------------------------------------------

/**
 * De-duplicates `import()` requests for scene components.
 * Must return the same Promise identity for React.lazy compatibility.
 */
const loaderPromiseCache = new Map<SceneKey, Promise<unknown>>();

////////////////////////////////////////////////////////////////////////////////
// Development Helper ---------------------------------------------------------

/**
 * Throws an error in development if the condition is false. No-op in production.
 * @param condition The condition to check.
 * @param message The error message if the condition fails.
 */
function invariant_dev(condition: unknown, message: string): asserts condition {
  if (process.env.NODE_ENV !== 'production') {
    if (!condition) {
      throw new Error(`Invariant failed: ${message}`);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Hook Implementation --------------------------------------------------------

/**
 * React hook to synchronize an external zone key with the global active scene
 * state and handle pre-fetching of adjacent scenes.
 *
 * @param zoneKey The desired scene key based on external factors (e.g., UI state, URL).
 *        Pass `null` to indicate no scene should be active. Must be a valid `SceneKey` or `null`.
 * @param opts Optional configuration object.
 * @param opts.enabled Controls whether the hook is active. Defaults to `true`.
 */
export function useStageRouter(
  zoneKey: SceneKey | null, // Strict typing for input key
  opts: StageRouterOptions = {},
): void {
  const { enabled = true } = opts;

  // Select the necessary state and actions from the store
  const { activeSceneKey, setActiveSceneKey } = useAppStore(
    selectSceneState,
    shallow, // Use shallow comparison for performance
  );

  // --- Development Check ---
  // Ensure the store is correctly configured and the selector returns the setter.
  invariant_dev(
    typeof setActiveSceneKey === 'function',
    '[useStageRouter] setActiveSceneKey is not a function. Check SceneSlice in store.ts and selectSceneState selector.'
  );

  /* ------------------------------------------------------------------ */
  /* 1. Validate external key & Sync to global store                    */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    // Skip effect if disabled or on the server
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    let nextKey: SceneKey | null = null;

    // Validate the provided zoneKey against known definitions
    if (zoneKey != null && zoneKey in sceneDefinitions) {
      nextKey = zoneKey; // Key is valid
    } else if (zoneKey != null && process.env.NODE_ENV !== 'production') {
      // Warn in development about invalid keys being passed
      console.warn(
        `[useStageRouter] Received zoneKey "${String(zoneKey)}" which is not a recognised SceneKey. Falling back to null.`
      );
    }
    // If zoneKey is null, nextKey remains null, which is valid.

    // Only update state if the desired key differs from the current key
    if (nextKey !== activeSceneKey) {
       // Directly use the setter obtained from the store. The invariant check
       // guarantees it's a function in dev, and we assume it is in prod.
      setActiveSceneKey(nextKey);
    }

  }, [zoneKey, enabled, activeSceneKey, setActiveSceneKey]); // ESLint-react-hooks compliant deps


  /* ------------------------------------------------------------------ */
  /* 2. Pre-fetch neighbours when the active scene changes              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    // --- Guards (SSR, disabled, background tab) ---
    if (!enabled || typeof window === 'undefined' || document.visibilityState === 'hidden') {
      return;
    }
    // No active scene, nothing to prefetch around
    if (!activeSceneKey) {
      return;
    }

    // --- Pre-fetch Logic (Identical to previous version) ---
    const neighbours = sceneAdjacency[activeSceneKey] ?? [];

    neighbours.forEach((key) => {
      // Basic validation: ensure neighbour key is actually in definitions
      if (!(key in sceneDefinitions)) {
         if (process.env.NODE_ENV !== 'production') {
            console.warn(`[StageRouter] Neighbour "${key}" for scene "${activeSceneKey}" is not a valid SceneKey.`);
         }
         return;
      }

      // Skip if already loading or loaded
      if (loaderPromiseCache.has(key)) return;

      const loader = sceneDefinitions[key]; // Already checked key exists
      // Redundant check, kept for absolute safety, should theoretically never fail here
      if (!loader) return;

      const promise = loader();
      loaderPromiseCache.set(key, promise);

      // Catch prefetch errors silently (log in dev) and allow retry
      promise.catch((err) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[StageRouter] Prefetch for scene "${key}" failed:`, err);
        }
        loaderPromiseCache.delete(key); // Remove from cache to allow retry
      });
    });

  }, [activeSceneKey, enabled]); // ESLint-react-hooks compliant deps
}

////////////////////////////////////////////////////////////////////////////////
// Exported Helpers (Unchanged Logic) -----------------------------------------

/**
 * Manually triggers the pre-fetching of a specific scene's code chunk.
 * Useful for initiating downloads based on user interactions like hover,
 * before the main `useStageRouter` hook reacts to a state change.
 * Shares the same internal cache (`loaderPromiseCache`) as the hook.
 *
 * @param key The `SceneKey` of the scene to pre-fetch. Must be a valid key
 *            present in `sceneDefinitions`. Invalid keys are ignored (with a dev warning).
 */
export function prefetchScene(key: SceneKey): void {
  // Ignore if already cached/loading
  if (loaderPromiseCache.has(key)) return;

  const loader = sceneDefinitions[key];
  // Validate key before attempting load
  if (!loader) {
     if (process.env.NODE_ENV !== 'production') {
        console.warn(`[prefetchScene] Invalid scene key provided: "${key}"`);
     }
     return;
  }

  // Initiate fetch and cache promise
  const promise = loader();
  loaderPromiseCache.set(key, promise);

  // Handle errors: Log in dev, remove from cache to allow retry
  promise.catch((err) => {
     if (process.env.NODE_ENV !== 'production') {
       console.warn(`[prefetchScene] Prefetch failed for scene "${key}":`, err);
     }
     loaderPromiseCache.delete(key);
  });
}

/**
 * Exposes the internal scene loader promise cache.
 * **Intended for debugging and testing only.**
 * Do not modify this cache from application code, as it can interfere
 * with React's lazy loading and the router's pre-fetching logic.
 */
export const _internalLoaderCache = loaderPromiseCache;