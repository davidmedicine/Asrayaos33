// === File: src/lib/sceneRouter.ts =========================================
// Responsible for:
//   • validating an incoming zone-key (“center”, “north”…)
//   • writing it into the stage slice (Zustand)
//   • pre-fetching adjacent scene bundles
//   • **never** re-issuing the same dynamic-import network request twice
//   • staying SSR / RSC safe (no window access on the server).

import { useEffect, lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { useStageSlice } from '@lib/state/slices/stageSlice';  asrayaos8.4/src/lib/state/slices/rendererSlice.ts              // <——  your slice
import type { SceneKey } from 'state/stageSlice';              // literal union
import sceneDefinitions from '@/scenes/sceneDefinitions';        // map of key → () => import()
import adjacencyMap     from '@/scenes/sceneAdjacency';       // optional graph

// ---------- 1. --- Promise-level cache (dedupe network) -------------------
const importPromiseCache = new Map<SceneKey, Promise<{ default: ComponentType<any> }>>();

// ---------- 2. --- Public helper: resolve active scene as Lazy component --
export const useActiveScene = (): LazyExoticComponent<ComponentType<any>> | null => {
  const key = useStageSlice(s => s.activeSceneKey);

  if (!key) return null;

  // get or create the (cached) promise
  let promise = importPromiseCache.get(key);
  if (!promise) {
    const loader = sceneDefinitions[key];
    promise = loader();
    importPromiseCache.set(key, promise);
  }

  // React.lazy wants a *function* that returns the promise
  // giving lazy() a stable promise keeps component identity stable.
  /* eslint-disable react-hooks/rules-of-hooks */
  return lazy(() => promise!);
};

// ---------- 3. --- Router hook: validate + write slice + prefetch ----------
// Call this once, e.g. in PanelGroup after you know the current zone.
export const useSceneRouter = (zoneKey: SceneKey | string | null | undefined) => {
  const { activeSceneKey, setActiveSceneKey } = useStageSlice(s => ({
    activeSceneKey:  s.activeSceneKey,
    setActiveSceneKey: s.setActiveSceneKey
  }));

  /* 3.1 — validate + write slice (runs every zoneKey change) */
  useEffect(() => {
    if (typeof window === 'undefined') return;        // SSR / RSC guard

    let nextKey: SceneKey | null = null;
    if (zoneKey && zoneKey in sceneDefinitions) {
      nextKey = zoneKey as SceneKey;
    } else if (process.env.NODE_ENV !== 'production' && zoneKey != null) {
      console.warn(`[sceneRouter] unknown zoneKey "${zoneKey}" – ignoring.`);
    }

    if (nextKey !== activeSceneKey) setActiveSceneKey(nextKey);
  }, [zoneKey, activeSceneKey, setActiveSceneKey]);

  /* 3.2 — prefetch neighbours when scene really changes */
  useEffect(() => {
    if (typeof window === 'undefined') return;                // SSR guard
    if (document.visibilityState === 'hidden') return;        // skip if tab bg

    if (!activeSceneKey) return;
    const neighbours = adjacencyMap[activeSceneKey] || [];

    neighbours.forEach(nKey => {
      if (importPromiseCache.has(nKey)) return;               // already queued
      const loader = sceneDefinitions[nKey];
      if (!loader) return;

      const prom = loader();                                  // trigger fetch
      importPromiseCache.set(nKey, prom);
      prom.catch(err => {
        if (process.env.NODE_ENV !== 'production')
          console.warn(`[sceneRouter] prefetch failed for "${nKey}"`, err);
        importPromiseCache.delete(nKey);                      // allow retry
      });
    });
  }, [activeSceneKey]);
};

// ---------------- 4.   Types export for consumers --------------------------
export type { SceneKey };
