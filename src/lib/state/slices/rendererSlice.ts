/**
 * rendererSlice.ts
 * ----------------
 * A Zustand “slice” that stores run-time renderer controls
 * (invalidate, device-pixel-ratio, frame-loop mode, etc.).
 *
 * Import into your root store:
 *   const useAppStore = create<AppState>()((set,get) => ({
 *     ...createStageSlice(set, get),
 *     ...createRendererSlice(set, get),
 *   }));
 *
 * Authors: 2025 © Your Team
 */

import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/* 1.  Types                                                           */
/* ------------------------------------------------------------------ */

export interface RendererState {
  /** R3F’s invalidate function - initialised as a no-op.               */
  invalidate: () => void;

  /** Current device-pixel-ratio override (1 = browser default).        */
  dpr: number | 'auto';

  /** Current frame-loop mode (R3F: “always” | “demand” | “never”).      */
  frameLoop: 'always' | 'demand' | 'never';
}

export interface RendererActions {
  /** Called once inside the <Canvas> to wire up useThree().invalidate. */
  setInvalidate: (fn: () => void) => void;

  /** Allow UI/dev-tools to adjust DPR at run-time.                     */
  setDpr: (value: RendererState['dpr']) => void;

  /** Switch between ‘always’ and ‘demand’ at run-time.                 */
  setFrameLoop: (mode: RendererState['frameLoop']) => void;
}

export type RendererSlice = RendererState & RendererActions;

/* ------------------------------------------------------------------ */
/* 2.  Slice factory                                                   */
/* ------------------------------------------------------------------ */

type SetFn<SliceState> = (
  partial: SliceState | Partial<SliceState> |
  ((state: SliceState) => SliceState | Partial<SliceState>),
  replace?: boolean
) => void;

export const createRendererSlice = <RootState>(
  set: SetFn<RootState>,
  get: () => RootState
): RendererSlice => ({
  // ---------- state ----------
  invalidate: () => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[rendererSlice] invalidate() called before Canvas mounted');
    }
  },
  dpr: 'auto',
  frameLoop: 'demand',

  // ---------- actions ----------
  setInvalidate: (fn) => set({ invalidate: fn } as Partial<RootState>),
  setDpr:        (value) => set({ dpr: value }       as Partial<RootState>),
  setFrameLoop:  (mode)  => set({ frameLoop: mode } as Partial<RootState>),
});

/* ------------------------------------------------------------------ */
/* 3.  Stand-alone store (optional)                                    */
/* ------------------------------------------------------------------ */
/**
 * If your project does NOT combine slices into a single `useAppStore`,
 * uncomment below to expose a dedicated renderer store:
 *
 * export const useRendererStore = create<RendererSlice>()((...a) =>
 *   createRendererSlice<RendererSlice>(...a as any)
 * );
 */
