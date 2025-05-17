// === File: src/lib/state/slices/stageSlice.ts ===
// Description: Zustand slice that tracks which Three-JS / R3F “scene” is
// currently active and exposes an invalidate() callback so any component can
// trigger a manual render when <Canvas frameloop="demand" /> is used.

/* eslint-disable @typescript-eslint/consistent-type-imports */
import { create } from 'zustand';

/* ----------------------------------------------------------------------------
 * 1 ▸ Shared model types
 * ------------------------------------------------------------------------- */

export type SceneKey = 'center' | 'north' | 'south' | 'east' | 'west';

/**
 * Minimal public contract for anything that wants to *read* slice state.
 * Add more fields here (loading flags, error states, etc.) as the pipeline
 * grows in the future.
 */
export interface StageState {
  /** `null` = no scene mounted. */
  activeSceneKey: SceneKey | null;
  /** Unix epoch (ms) at which the scene last changed. */
  lastChanged: number | null;
}

/** Public actions the rest of the app can dispatch. */
export interface StageActions {
  /** Change the active scene (validated upstream in useStageRouter). */
  setActiveSceneKey: (key: SceneKey | null) => void;
  /**
   * <Canvas frameloop="demand"> gives you an `invalidate` function from
   * `useThree()`. Register it once so *any* slice consumer can force a redraw.
   */
  setInvalidate: (fn: () => void) => void;
  /** Consumers call this to redraw once. Defaults to a no-op until registered. */
  invalidate: () => void;
}

/* ----------------------------------------------------------------------------
 * 2 ▸ Slice implementation
 * ------------------------------------------------------------------------- */

type StageSlice = StageState & StageActions;

/**
 * Zustand’s “slice-pattern” – keep a factory function that receives `set`
 * so it can be composed into a larger root-store later.  :contentReference[oaicite:0]{index=0}
 */
export const createStageSlice = (set: (fn: (s: StageSlice) => StageSlice | Partial<StageSlice>) => void): StageSlice => ({
  /* ----------  state  ---------- */
  activeSceneKey: null,
  lastChanged:    null,

  /* ----------  actions  ---------- */
  setActiveSceneKey: key =>
    set(prev => ({
      ...prev,
      activeSceneKey: key,
      lastChanged: Date.now(),
    })),

  // will be replaced once <Canvas> runs
  invalidate: () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[stageSlice] invalidate() called before it was registered');
    }
  },

  setInvalidate: fn =>
    set(prev => ({
      ...prev,
      invalidate: fn,
    })),
});

/* ----------------------------------------------------------------------------
 * 3 ▸ Stand-alone store  (small projects) ▼
 *     – OR – compose this slice into a root store (large apps) ▲
 * ------------------------------------------------------------------------- */

/**
 * For smaller projects you can export a complete store *right here*:
 *
 *     export const useStageStore = create<StageSlice>()(createStageSlice);
 *
 * For larger apps prefer composing multiple slices:
 *
 *     export const useAppStore = create<AppState>()((set, get) => ({
 *       ...createStageSlice(set, get),
 *       ...createOtherSlice(set, get),
 *     }));
 *
 * See: https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md
 */
export const useStageStore = create<StageSlice>()(createStageSlice);
