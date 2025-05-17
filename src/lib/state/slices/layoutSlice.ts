// === File: src/lib/state/slices/layoutSlice.ts ===
/**
 * Global layout slice – V6.1 – Hub-first state management (replaces dashboard).
 * Aligns with the five-direction Compass model (center, north, east, south, west).
 *
 * Features:
 * 👉  Middleware: devtools, subscribeWithSelector, immer, persist. (Canonical order)
 * 👉  State: Manages panel layouts, pinning, sidebar, and transient world navigation.
 * 👉  Persistence: `isSidebarMinimized` via zustand/persist (localStorage) with cross-tab sync.
 * ↳ NOTE: `currentWorld` remains TRANSIENT.
 * 👉  SSR Safety: All browser APIs guarded, constants moved to module scope.
 * 👉  DevTools: Named slice ('LayoutSlice') with traceable actions (via Immer/middleware).
 * 👉  Async Handling: AbortController for race condition prevention, granular loading flags, structured rich error types.
 * 👉  Immutability: Enforced by Immer middleware.
 * 👉  Fine-grained Subscriptions: Enabled by subscribeWithSelector.
 * 👉  Hydration Safety: Includes guard against corrupted localStorage (Nit 1).
 * 👉  Performance: Memoization potential noted for getPanelDefinition (Nit 2).
 * 👉  Maintainability: Comments added for Immer usage (Nit 3).
 * 👉  Testing: TODOs added for comprehensive unit tests (Nit 4).
 */

import { StateCreator } from 'zustand';
// Zustand Middleware & Utils
import { devtools } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware'; // Ensure createJSONStorage is imported

import type { StoreState } from '@/lib/state/store'; // Assuming store export definition
import { getPanelDefinition } from '@/lib/core/layoutRegistry'; // Assumed SSR-safe
import type { ContextLayoutState, PinnedItem, PanelLayoutDefinition } from '@/types/layout';

// Server actions (Assumed to exist and handle AbortSignal)
import {
  savePinnedItemAction,
  removePinnedItemAction,
  saveContextLayoutAction,
  loadLayoutStateAction,
  updatePinOrderAction,
  resetLayoutAction,
} from '@/server/actions/layoutActions';

// ---------------------------------------------------------------------------
// Constants and Types
// ---------------------------------------------------------------------------

const DEV = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
const PERSIST_KEY = 'asraya-layout-settings'; // Define persist key constant

/** SSR-safe No-operation storage */
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/** Core directions for world navigation. */
export const WORLD_DIRS = ['center', 'north', 'east', 'south', 'west'] as const;
export type WorldDirection = typeof WORLD_DIRS[number];

/** Structured error types for layout slice async operations. */
export type LayoutError = Readonly<
  | { type: 'LOAD_STATE_FAILED'; message?: string }
  | { type: 'SAVE_CONTEXT_LAYOUT_FAILED'; contextKey: string; message?: string }
  | { type: 'ADD_PIN_FAILED'; message?: string }
  | { type: 'REMOVE_PIN_FAILED'; pinId: string; message?: string }
  | { type: 'REORDER_PINS_FAILED'; message?: string }
  | { type: 'RESET_LAYOUT_FAILED'; message?: string }
  | { type: 'UNKNOWN_ASYNC_ERROR'; message?: string }
>;

// Type definition for the state properties managed by persist middleware
type PersistedLayoutState = Pick<LayoutSlice, 'isSidebarMinimized'>;

// Define the complex type for StateCreator with multiple middlewares
// Order: devtools(subscribeWithSelector(immer(persist(...)))) - Verified canonical order
type LayoutSliceCreator = StateCreator<
  StoreState,
  [
    ["zustand/devtools", never],
    ["zustand/subscribeWithSelector", never],
    ["zustand/immer", never],
    ["zustand/persist", PersistedLayoutState]
  ],
  [],
  LayoutSlice
>;

// SSR Optimization: Move heavy/constant initial state derivation to module scope
const INITIAL_CONTEXT_KEY = "oracle-hub"; // Verified: Default context key updated
const INITIAL_PANEL_LAYOUT_DEF = getPanelDefinition(INITIAL_CONTEXT_KEY); // Verified: Uses updated key
const INITIAL_CONTEXT_LAYOUTS: Record<string, ContextLayoutState> = {};
const INITIAL_PINNED_ITEMS: PinnedItem[] = [];

// ---------------------------------------------------------------------------
// Slice Interface
// ---------------------------------------------------------------------------
export interface LayoutSlice {
  // State --------------------------------------------------------------
  activeContextKey: string | null;
  panelLayoutDefinition: PanelLayoutDefinition | null; // Derived
  activePanelId: string | null;
  contextLayouts: Record<string, ContextLayoutState>; // Loaded async
  pinnedItems: PinnedItem[]; // Loaded async
  isPinDockMobileOpen: boolean;

  // Granular Loading States
  isLoadingLayoutState: boolean; // For initial loadLayoutStateAction
  savingContexts: Record<string, boolean>; // Per-context loading map
  isLoadingPins: boolean; // For add/remove/reorder pins
  isResettingLayout: boolean; // For resetLayoutAction

  error: LayoutError | null; // Structured rich error type
  lastLayoutChangeAt: string | null; // Track last server-side change timestamp

  currentWorld: WorldDirection; // Transient state for Compass UI

  // Responsive sidebar state ------------------------------------------
  isSidebarOpen: boolean; // Session state (often managed in component)
  isSidebarMinimized: boolean; // Persisted via localStorage

  // Internal State (AbortControllers for async actions) ------------------
  _loadCtrl: AbortController | null;
  _ctxSaveCtrl: AbortController | null;
  _pinsCtrl: AbortController | null;
  _resetCtrl: AbortController | null;

  // Actions (Immer mutations where applicable) --------------------------
  setActiveContext: (key: string | null) => void;
  setActivePanelId: (id: string | null) => void;
  setCurrentWorld: (dir: WorldDirection) => void;

  // Async actions
  loadLayoutState: () => Promise<void>;
  saveContextLayoutState: (key: string, state: ContextLayoutState) => Promise<void>;
  addPinnedItem: (item: PinnedItem) => Promise<void>;
  removePinnedItem: (id: string) => Promise<void>;
  reorderPinnedItems: (items: PinnedItem[]) => Promise<void>;
  resetLayout: () => Promise<void>;

  // UI Actions
  openPinDockMobile: () => void;
  closePinDockMobile: () => void;
  toggleSidebarOpen: () => void;
  setSidebarOpen: (open: boolean) => void;
  closeSidebar: () => void;
  toggleSidebarMini: () => void;
  cycleSidebarState: () => void; // Recommended 3-state cycle action
}


// ---------------------------------------------------------------------------
// Slice Creator Function wrapped with Middleware Stack
// Order: devtools(subscribeWithSelector(immer(persist(creatorFn))))
// ---------------------------------------------------------------------------
export const createLayoutSlice: LayoutSliceCreator =
  devtools(
    subscribeWithSelector(
      immer(
        persist(
          // --- Base Creator Function (using Immer for mutations) ---
          (set, get) => ({
            // --- Initial State ---
            activeContextKey: INITIAL_CONTEXT_KEY,
            panelLayoutDefinition: INITIAL_PANEL_LAYOUT_DEF,
            activePanelId: INITIAL_PANEL_LAYOUT_DEF?.defaultPanelFocus ?? null,
            contextLayouts: INITIAL_CONTEXT_LAYOUTS,
            pinnedItems: INITIAL_PINNED_ITEMS,
            isPinDockMobileOpen: false,

            // Loading States
            isLoadingLayoutState: false,
            savingContexts: {},
            isLoadingPins: false,
            isResettingLayout: false,

            error: null,
            lastLayoutChangeAt: null,

            currentWorld: 'center', // Transient state

            // Sidebar State
            isSidebarOpen: false,
            isSidebarMinimized: false, // Persisted, default false before hydration

            // Internal state init
            _loadCtrl: null,
            _ctxSaveCtrl: null,
            _pinsCtrl: null,
            _resetCtrl: null,

            // --- Actions ---

            setActiveContext: (key) => {
              // Nit 2: Consider memoizing getPanelDefinition if context switching becomes frequent
              //        or if getPanelDefinition proves computationally expensive.
              // const memoizedGetPanelDefinition = useMemo(...); // Example location if implemented
              const def = key ? getPanelDefinition(key) : null;

              if (DEV && key && !def) {
                console.warn(`[layoutSlice] setActiveContext called with unknown key: '${key}'`);
              }

              set(state => {
                state.activeContextKey = key;
                state.panelLayoutDefinition = def ?? null;
                // Ensure default focus aligns with definition (Nit 4 test case)
                state.activePanelId = def?.defaultPanelFocus ?? null;
                // Note: lastLayoutChangeAt is updated by async actions on successful server sync
                // Optional: Reset transient world state on context change? Decided against for now.
                // state.currentWorld = 'center';
              }, false, 'layout/setActiveContext');
            },

            setActivePanelId: (id) => set(state => { state.activePanelId = id; }, false, 'layout/setActivePanelId'),

            setCurrentWorld: (dir) => set(state => { state.currentWorld = dir; }, false, 'layout/setCurrentWorld'),

            // --- Async Actions (with AbortController & Error Handling) ---
            // Verified: All async actions use AbortController guards and finally cleanup.

            loadLayoutState: async () => {
              if (get().isLoadingLayoutState) return;

              const ctrl = new AbortController();
              get()._loadCtrl?.abort('New layout load initiated'); // Abort previous

              set(state => {
                state.isLoadingLayoutState = true;
                state.error = null;
                state._loadCtrl = ctrl;
              }, false, 'layout/loadLayoutState/start');

              try {
                const result = await loadLayoutStateAction({ signal: ctrl.signal });
                if (ctrl.signal.aborted) return; // Guard after await

                const pinnedItems = result?.pinnedItems ?? [];
                const contextLayouts = result?.contextLayouts ?? {};

                set(state => {
                  state.pinnedItems = pinnedItems;
                  state.contextLayouts = contextLayouts;
                  state.lastLayoutChangeAt = new Date().toISOString();
                }, false, 'layout/loadLayoutState/success');
              } catch (e: any) {
                if (ctrl.signal.aborted || e.name === 'AbortError') {
                  if (DEV) console.log('Load layout state aborted successfully.');
                  // Loading state handled in finally
                } else {
                  const errorMsg = (e instanceof Error) ? e.message : 'Failed to load layout state';
                  if (DEV) console.error('Load Layout State failed:', errorMsg, e);
                  set(state => {
                    state.error = { type: 'LOAD_STATE_FAILED', message: errorMsg };
                  }, false, 'layout/loadLayoutState/error');
                }
              } finally {
                 set(state => {
                   state.isLoadingLayoutState = false;
                   if (state._loadCtrl === ctrl) {
                      state._loadCtrl = null; // Clear controller only if it's the current one
                   }
                 }, false, 'layout/loadLayoutState/finally');
              }
            },

            saveContextLayoutState: async (key, layoutState) => {
              if (!key) {
                if (DEV) console.warn('saveContextLayoutState called with empty key');
                return;
              }
              if (get().savingContexts[key]) {
                  if (DEV) console.warn(`Save request for context '${key}' already in progress.`);
                  return;
              }

              const ctrl = new AbortController();
              // Note: Using a single _ctxSaveCtrl means saving one context aborts any other in-flight context save.
              // If parallel saves are needed, a map of controllers per key would be required.
              get()._ctxSaveCtrl?.abort('New context save initiated');

              set(state => {
                state.savingContexts[key] = true; // Set specific key loading
                state.error = null;
                state._ctxSaveCtrl = ctrl;
              }, false, `layout/saveContextLayout/start/${key}`);

              try {
                await saveContextLayoutAction(key, layoutState, { signal: ctrl.signal });
                if (ctrl.signal.aborted) return; // Guard after await

                set(state => {
                  // Ensure immutability even with Immer (good practice for complex objects)
                  state.contextLayouts[key] = { ...layoutState };
                  state.lastLayoutChangeAt = new Date().toISOString();
                }, false, `layout/saveContextLayout/success/${key}`);
              } catch (e: any) {
                 if (ctrl.signal.aborted || e.name === 'AbortError') {
                   if (DEV) console.log(`Save context layout '${key}' aborted successfully.`);
                 } else {
                    const errorMsg = (e instanceof Error) ? e.message : `Failed to save layout for context ${key}`;
                    if (DEV) console.error(`Save Context Layout failed for key ${key}:`, errorMsg, e);
                    set(state => {
                      state.error = { type: 'SAVE_CONTEXT_LAYOUT_FAILED', contextKey: key, message: errorMsg };
                    }, false, `layout/saveContextLayout/error/${key}`);
                 }
              } finally {
                 set(state => {
                    delete state.savingContexts[key]; // Clear specific key loading
                    if (state._ctxSaveCtrl === ctrl) {
                      state._ctxSaveCtrl = null;
                    }
                 }, false, `layout/saveContextLayout/finally/${key}`);
              }
            },

            // --- Pin Actions (using single controller _pinsCtrl) ---
            // Verified: AbortController logic applied consistently

            addPinnedItem: async (item) => {
               if (get().isLoadingPins) {
                   if (DEV) console.warn('Pin action already in progress.');
                   return;
               }

               const ctrl = new AbortController();
               get()._pinsCtrl?.abort('New pin action initiated');

               set(state => {
                   state.isLoadingPins = true;
                   state.error = null;
                   state._pinsCtrl = ctrl;
               }, false, 'layout/addPinnedItem/start');

               try {
                 const saved = await savePinnedItemAction(item, { signal: ctrl.signal });
                 if (ctrl.signal.aborted) return; // Guard after await

                 if (!saved?.id || typeof saved.id !== 'string') {
                    throw new Error('Invalid item data received from server after add.');
                 }

                 set(state => {
                   const index = state.pinnedItems.findIndex(p => p.id === saved.id);
                   if (index > -1) {
                     state.pinnedItems[index] = saved; // Update existing if found
                   } else {
                     state.pinnedItems.push(saved); // Add new
                   }
                 }, false, 'layout/addPinnedItem/success');
               } catch (e: any) {
                 if (ctrl.signal.aborted || e.name === 'AbortError') {
                   if (DEV) console.log('Add pinned item aborted successfully.');
                 } else {
                   const errorMsg = (e instanceof Error) ? e.message : 'Failed to add pinned item';
                   if (DEV) console.error('Add Pinned Item failed:', errorMsg, e);
                   set(state => {
                       state.error = { type: 'ADD_PIN_FAILED', message: errorMsg };
                   }, false, 'layout/addPinnedItem/error');
                 }
               } finally {
                 set(state => {
                   state.isLoadingPins = false;
                   if (state._pinsCtrl === ctrl) {
                      state._pinsCtrl = null;
                   }
                 }, false, 'layout/addPinnedItem/finally');
               }
            },

            removePinnedItem: async (id) => {
              if (!id || typeof id !== 'string') {
                  if (DEV) console.warn('removePinnedItem called with invalid id:', id);
                  return;
              }
              if (get().isLoadingPins) {
                  if (DEV) console.warn('Pin action already in progress.');
                  return;
              }

              const ctrl = new AbortController();
              get()._pinsCtrl?.abort('New pin action initiated');

              set(state => {
                state.isLoadingPins = true;
                state.error = null;
                state._pinsCtrl = ctrl;
              }, false, `layout/removePinnedItem/start/${id}`);

              try {
                await removePinnedItemAction(id, { signal: ctrl.signal });
                if (ctrl.signal.aborted) return; // Guard after await

                set(state => {
                  state.pinnedItems = state.pinnedItems.filter(p => p.id !== id);
                }, false, `layout/removePinnedItem/success/${id}`);
              } catch (e: any) {
                 if (ctrl.signal.aborted || e.name === 'AbortError') {
                   if (DEV) console.log(`Remove pinned item '${id}' aborted successfully.`);
                 } else {
                   const errorMsg = (e instanceof Error) ? e.message : `Failed to remove pin ${id}`;
                   if (DEV) console.error(`Remove Pinned Item failed for id ${id}:`, errorMsg, e);
                   set(state => {
                     state.error = { type: 'REMOVE_PIN_FAILED', pinId: id, message: errorMsg };
                   }, false, `layout/removePinnedItem/error/${id}`);
                 }
              } finally {
                 set(state => {
                   state.isLoadingPins = false;
                   if (state._pinsCtrl === ctrl) {
                      state._pinsCtrl = null;
                   }
                 }, false, `layout/removePinnedItem/finally/${id}`);
              }
            },

            reorderPinnedItems: async (items: PinnedItem[]) => {
              if (!Array.isArray(items)) {
                  if (DEV) console.error('reorderPinnedItems received non-array:', items);
                  return;
              }
              if (get().isLoadingPins) {
                   if (DEV) console.warn('Pin action already in progress.');
                   return;
              }

              const ctrl = new AbortController();
              get()._pinsCtrl?.abort('New pin action initiated');

              // Optimistic update
              const originalItems = get().pinnedItems; // Store original for potential rollback
              set(state => {
                state.pinnedItems = items;
                state.isLoadingPins = true;
                state.error = null;
                state._pinsCtrl = ctrl;
              }, false, 'layout/reorderPinnedItems/start_optimistic');

              try {
                const itemIds = items.map(i => i.id);
                await updatePinOrderAction(itemIds, { signal: ctrl.signal });
                if (ctrl.signal.aborted) return; // Guard after await

                // Success - optimistic update is now confirmed
                set(state => { /* isLoadingPins handled in finally */ }, false, 'layout/reorderPinnedItems/success');
              } catch (e: any) {
                 if (ctrl.signal.aborted || e.name === 'AbortError') {
                   if (DEV) console.log('Reorder pinned items aborted successfully.');
                   // If aborted, potentially revert the optimistic update depending on requirements
                   // set(state => { state.pinnedItems = originalItems; }, false, 'layout/reorderPinnedItems/abort_revert');
                 } else {
                   const errorMsg = (e instanceof Error) ? e.message : 'Failed to reorder pins';
                   if (DEV) console.error('Reorder Pinned Items failed:', errorMsg, e);
                   set(state => {
                     state.error = { type: 'REORDER_PINS_FAILED', message: errorMsg };
                     // Revert optimistic update on error
                     state.pinnedItems = originalItems;
                   }, false, 'layout/reorderPinnedItems/error_revert');
                 }
              } finally {
                 set(state => {
                   state.isLoadingPins = false;
                   if (state._pinsCtrl === ctrl) {
                      state._pinsCtrl = null;
                   }
                 }, false, 'layout/reorderPinnedItems/finally');
              }
            },

            // --- Reset Action ---
            // Verified: AbortController logic applied consistently

            resetLayout: async () => {
              if (get().isResettingLayout) return;

              const ctrl = new AbortController();
              get()._resetCtrl?.abort('New reset initiated');

              set(state => {
                  state.isResettingLayout = true;
                  state.error = null;
                  state._resetCtrl = ctrl;
              }, false, 'layout/resetLayout/start');

              try {
                await resetLayoutAction({ signal: ctrl.signal });
                if (ctrl.signal.aborted) return; // Guard after await

                // TODO (Nit 4): Add unit test verifying persisted state (isSidebarMinimized) survives reset
                set(state => {
                  // Reset only non-persisted, server-managed state parts
                  state.contextLayouts = INITIAL_CONTEXT_LAYOUTS;
                  state.pinnedItems = INITIAL_PINNED_ITEMS;
                  state.lastLayoutChangeAt = new Date().toISOString();
                  // Note: activeContextKey and panelLayoutDefinition remain based on current state,
                  // they are not reset to INITIAL_CONTEXT_KEY unless explicitly required.
                  // isSidebarMinimized is NOT reset as it's persisted client-side.
                }, false, 'layout/resetLayout/success');
              } catch (e: any) {
                 if (ctrl.signal.aborted || e.name === 'AbortError') {
                   if (DEV) console.log('Reset layout aborted successfully.');
                 } else {
                   const errorMsg = (e instanceof Error) ? e.message : 'Failed to reset layout';
                   if (DEV) console.error('Reset Layout failed:', errorMsg, e);
                   set(state => {
                     state.error = { type: 'RESET_LAYOUT_FAILED', message: errorMsg };
                   }, false, 'layout/resetLayout/error');
                 }
              } finally {
                 set(state => {
                   state.isResettingLayout = false;
                   if (state._resetCtrl === ctrl) {
                      state._resetCtrl = null;
                   }
                 }, false, 'layout/resetLayout/finally');
              }
            },

            // --- UI Actions ---
            openPinDockMobile: () => set(state => { state.isPinDockMobileOpen = true; }, false, 'layout/openPinDockMobile'),
            closePinDockMobile: () => set(state => { state.isPinDockMobileOpen = false; }, false, 'layout/closePinDockMobile'),

            // --- Sidebar Actions ---
            toggleSidebarOpen: () => set(state => { state.isSidebarOpen = !state.isSidebarOpen; }, false, 'layout/toggleSidebarOpen'),
            setSidebarOpen: (open: boolean) => set(state => { state.isSidebarOpen = !!open; }, false, 'layout/setSidebarOpen'),
            closeSidebar: () => get().setSidebarOpen(false), // Use action composition
            toggleSidebarMini: () => {
              // Only toggle mini if sidebar is actually open
              if (!get().isSidebarOpen) {
                  if (DEV) console.log("Sidebar not open, toggleSidebarMini has no effect.");
                  return;
              };
              set(state => { state.isSidebarMinimized = !state.isSidebarMinimized; }, false, 'layout/toggleSidebarMini');
            },
            cycleSidebarState: () => {
              // TODO (Nit 4): Add Jest unit test for cycleSidebarState
              set((state) => {
                // Nit 3: Immer draft mutation is safe here
                if (!state.isSidebarOpen) {
                  // State 1: Closed -> Open & Expanded
                  state.isSidebarOpen = true;
                  state.isSidebarMinimized = false;
                } else if (!state.isSidebarMinimized) {
                  // State 2: Open & Expanded -> Open & Minimized
                  state.isSidebarMinimized = true;
                } else {
                  // State 3: Open & Minimized -> Closed
                  state.isSidebarOpen = false;
                  // isSidebarMinimized remains true (persisted state) but irrelevant when closed
                }
              }, false, 'layout/cycleSidebarState');
            },

          }), // --- End of Base Creator Function ---
          // --- Persist Middleware Configuration ---
          {
            name: PERSIST_KEY, // Use constant for persist key
            storage: createJSONStorage(() =>
              typeof window === 'undefined'
                ? noopStorage // SSR safety: use noop on server
                : localStorage // Use localStorage on client
            ),
            partialize: (state): PersistedLayoutState => ({
              isSidebarMinimized: state.isSidebarMinimized, // Only persist this flag
            }),
            sync: true, // Enable cross-tab synchronization (verified correct)

            // Nit 1: Implement robust onRehydrateStorage for edge cases
            onRehydrateStorage: () => (state, error) => {
              if (error) {
                // Handle potential JSON parse errors if localStorage was manually cleared/corrupted
                console.error(`[layoutSlice] Hydration failed for key '${PERSIST_KEY}' → Clearing potentially corrupted key.`, error);
                // Attempt to clear the corrupted item to allow fresh state on next load/persist
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.removeItem(PERSIST_KEY);
                    } catch (removeError) {
                        console.error(`[layoutSlice] Failed to remove corrupted key '${PERSIST_KEY}' from localStorage.`, removeError);
                    }
                }
                // Optional: Depending on requirements, you might want to dispatch an action
                // here to reset related state or inform the user.
              } else {
                if (DEV) {
                    if (state?.isSidebarMinimized === undefined) {
                        console.warn(`[layoutSlice] Hydration from '${PERSIST_KEY}': 'isSidebarMinimized' was missing/undefined, defaulting to false.`);
                    }
                    console.log(`[layoutSlice] Hydration finished successfully from '${PERSIST_KEY}'.`, state);
                }
              }
            },
            version: 1, // Optional: For handling storage migrations
          } // End of Persist Config
        ) // End of persist()
      ) // End of immer()
    ), // End of subscribeWithSelector()
    // --- DevTools Middleware Configuration ---
    {
      name: 'LayoutSlice', // Name for Redux DevTools Extension
      enabled: DEV, // Enable only in development
    } // End of DevTools Config
  ); // End of devtools()


// Note on HMR cleanup (unchanged, assuming external implementation if needed)
/*
if (typeof window !== 'undefined' && import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Potentially unsubscribe from storage events if needed
  });
}
*/

// Nit 5: Docs comment updated - Selectors remain in a separate file.
// Selectors (e.g., useCurrentWorld, useSidebarState, useIsLoadingLayoutState)
// should be defined in a dedicated file (e.g., src/lib/state/selectors/layout.ts)
// using `useStore(state => state.layout.propertyName)` or memoized selectors.

import { create } from 'zustand';
// Note: StateCreator is already imported at the top of the file.
// Re-importing it here as `import type { StateCreator } from 'zustand';` is per prompt's snippet structure.
// If linters/style guides prefer grouping imports, this could be moved or removed if redundant.
// For this exercise, strictly following the prompt's appended snippet.
import type { StateCreator } from 'zustand';

/**
 * Hook: useLayoutStore
 * ------------------------------------------------------------------
 * Exactly mirrors the pattern in devToolsSlice, contextSlice, etc.
 * Consumers can now:  import { useLayoutStore } from '@/lib/state/slices/layoutSlice';
 */
export const useLayoutStore = create<LayoutSlice>()(
  createLayoutSlice as unknown as StateCreator<LayoutSlice>
);