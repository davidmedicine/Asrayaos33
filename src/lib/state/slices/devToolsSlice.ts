// ────────────────────────────────────────────────────────────────
// File: src/lib/state/slices/devToolsSlice.ts
// Fully self-contained Zustand slice + hook (error-free).
// ────────────────────────────────────────────────────────────────
import { create, StateCreator } from 'zustand';

/* ------------------------------------------------------------------
   1 · Types
------------------------------------------------------------------- */
// Possible log-levels for console filtering.
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// Slice state
export interface DevToolsState {
  isPanelOpen: boolean;          // Is the dev-tools panel visible?
  logLevel: LogLevel;            // Current filter level
  showPerformanceMetrics: boolean;
  showLayoutState: boolean;
  featureFlags: Record<string, boolean>; // Arbitrary feature toggles
}

// Slice actions
export interface DevToolsActions {
  togglePanel: () => void;
  setLogLevel: (level: LogLevel) => void;
  togglePerformanceMetrics: () => void;
  toggleLayoutState: () => void;
  toggleFeatureFlag: (name: string) => void;
  setFeatureFlag: (name: string, value: boolean) => void;
  resetDevTools: () => void;
}

// Combined type
export type DevToolsSlice = DevToolsState & DevToolsActions;

/* ------------------------------------------------------------------
   2 · Initial state
------------------------------------------------------------------- */
const initialIsPanelOpen = process.env.NODE_ENV === 'development';

export const initialDevToolsState: DevToolsState = {
  isPanelOpen: initialIsPanelOpen,
  logLevel: initialIsPanelOpen ? 'debug' : 'warn',
  showPerformanceMetrics: false,
  showLayoutState: false,
  featureFlags: {
    // experimentalLayoutEngine: false,
  },
};

/* ------------------------------------------------------------------
   3 · Slice creator
------------------------------------------------------------------- */
export const createDevToolsSlice: StateCreator<
  DevToolsSlice,
  [], // no set-middleware
  [], // no get-middleware
  DevToolsSlice
> = (set) => ({
  ...initialDevToolsState,

  /* ------- actions ------- */
  togglePanel: () =>
    set((s) => ({ isPanelOpen: !s.isPanelOpen }), false, 'devTools/togglePanel'),

  setLogLevel: (level) =>
    set({ logLevel: level }, false, 'devTools/setLogLevel'),

  togglePerformanceMetrics: () =>
    set((s) => ({ showPerformanceMetrics: !s.showPerformanceMetrics }),
        false, 'devTools/togglePerformanceMetrics'),

  toggleLayoutState: () =>
    set((s) => ({ showLayoutState: !s.showLayoutState }),
        false, 'devTools/toggleLayoutState'),

  toggleFeatureFlag: (name) =>
    set((s) => ({
      featureFlags: { ...s.featureFlags, [name]: !s.featureFlags[name] },
    }), false, `devTools/toggleFeatureFlag/${name}`),

  setFeatureFlag: (name, value) =>
    set((s) => ({
      featureFlags: { ...s.featureFlags, [name]: value },
    }), false, `devTools/setFeatureFlag/${name}`),

  resetDevTools: () =>
    set(initialDevToolsState, false, 'devTools/reset'),
});

/* ------------------------------------------------------------------
   4 · Slice hook export (💡 what was missing)
------------------------------------------------------------------- */
/**
 * `useDevToolsStore` – standalone hook for components.
 * Usage:
 *   const { isPanelOpen, togglePanel } = useDevToolsStore();
 */
export const useDevToolsStore = create<DevToolsSlice>()(
  // Cast is required because devtools middleware in the root store
  // adds params not present here.
  createDevToolsSlice as unknown as StateCreator<DevToolsSlice>
);

/* ------------------------------------------------------------------
   5 · End of file
------------------------------------------------------------------- */
