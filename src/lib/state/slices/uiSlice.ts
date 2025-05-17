/**
 * uiSlice.ts – global, serialisable UI state (selected tab, motion/theme toggles, etc.)
 * ---------------------------------------------------------------------------------
 * • SSR‑safe   – no direct window/document access during module evaluation.
 * • Persisted   – only minimal primitive data is stored.
 * • Versioned   – old persisted shapes are migrated in‑place.
 * • DX‑friendly – explicit action labels for Redux DevTools & time‑travel.
 * • A11y-focused – includes controls for user motion preferences, initialized safely.
 * • Performance-aware - throttled events, careful with localStorage.
 *
 * Patch v3.2.0 – YYYY-MM-DD (Based on "ultra-hard" feedback)
 * • Refined motion preference initialization: moved to be called from a root component's
 *   `useEffect` or `useLayoutEffect` (client-side only) instead of `onRehydrateStorage`
 *   to prevent hydration mismatches and ensure safer first-paint behavior.
 * • Ensured all `set()` calls have explicit action labels for Redux DevTools.
 * • Added suggestions for throttling/replacing global CustomEvent for tab changes.
 * • Reinforced type guards and error handling for localStorage.
 * • Highlighted the need for a visible settings toggle for motion preferences.
 *
 * Previous Patches:
 * Patch v3.1.0 – YYYY-MM-DD
 * • Added `isReduceMotionGloballyEnabled` state and `toggleReduceMotionPreference` action.
 * • Added `initializeMotionPreference` to sync with system settings on client load.
 * Patch v3.0.7 – 2025‑04‑22
 * • Fixed action loss after rehydration, guarded invalid tab values, added TAB_CONFIG.
 * Patch based on suggestion (SSR storage update) – 2025-04-27
 * • Updated persist storage to use a dummy object on server-side.
 *
 * Related reading:
 * – Zustand SSR & Persistence: https://github.com/pmndrs/zustand
 * – WCAG Motion Guidance: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
 * --------------------------------------------------------------------------------- */

import { StateCreator } from 'zustand';
import {
  devtools,
  persist,
  createJSONStorage,
  type PersistOptions,
} from 'zustand/middleware';
import { throttle } from 'lodash-es'; // For throttling events

import type { StoreState } from '@/lib/state/store';
import type { ConversationTabType } from '@/types/chat';

/* ---------------------------------------------------------------------------
 * 1. Tab configuration (single source‑of‑truth)
 * ------------------------------------------------------------------------ */
export const TAB_CONFIG = [
  { label: 'Chats',    value: 'chats'    },
  { label: 'Channels', value: 'channels' },
  { label: 'Online',   value: 'online'   },
] as const satisfies readonly { label: string; value: ConversationTabType }[];

const VALID_TABS: readonly ConversationTabType[] = TAB_CONFIG.map(t => t.value);

export const isConversationTab = (x: unknown): x is ConversationTabType =>
  VALID_TABS.includes(x as ConversationTabType);

/* ---------------------------------------------------------------------------
 * 2. State & actions types
 * ------------------------------------------------------------------------ */
export interface UISliceState {
  selectedConversationTab: ConversationTabType;
  isReduceMotionGloballyEnabled: boolean;
  _motionPreferenceInitialized: boolean; // Internal flag, not persisted directly by user choice
}

export interface UISliceActions {
  setSelectedConversationTab: (tab: ConversationTabType) => void;
  toggleReduceMotionPreference: () => void;
  initializeMotionPreference: () => void; // To be called from client-side root component effect
  resetUIState: () => void;
}

export type UISlice = UISliceState & UISliceActions;

/* ---------------------------------------------------------------------------
 * 3. Initial state (used for reset & SSR)
 * ------------------------------------------------------------------------ */
export const INITIAL_UI_STATE: UISliceState = {
  selectedConversationTab: 'chats',
  isReduceMotionGloballyEnabled: true, // WCAG C39: Default to motion-off (vestibular safety)
  _motionPreferenceInitialized: false,
};

/* ---------------------------------------------------------------------------
 * 4. Persistence options
 * ------------------------------------------------------------------------ */
const UI_PERSIST_NAME = 'app-ui-persist-storage';
const UI_PERSIST_VERSION = 3; // Stays version 3, as persisted shape hasn't changed since motion flag was added

// SSR-safe storage implementation
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
    } catch (error) {
      console.warn(`[uiSlice] Error reading localStorage item "${name}":`, error);
      return null; // Handle quota exhausted or other errors gracefully
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(name, value);
      }
    } catch (error) {
      console.warn(`[uiSlice] Error setting localStorage item "${name}":`, error);
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(name);
      }
    } catch (error) {
      console.warn(`[uiSlice] Error removing localStorage item "${name}":`, error);
    }
  },
};

const persistOptions: PersistOptions<UISlice, Partial<UISliceState>> = {
  name: UI_PERSIST_NAME,
  version: UI_PERSIST_VERSION,
  storage: createJSONStorage(() => safeStorage), // Use the robust safeStorage
  partialize: (state) => ({
    selectedConversationTab: state.selectedConversationTab,
    isReduceMotionGloballyEnabled: state.isReduceMotionGloballyEnabled,
    // _motionPreferenceInitialized is intentionally not persisted as it's a runtime flag
  }),
  migrate: (persisted, version) => {
    // Start with current runtime defaults to ensure all fields are present
    let migratedState: Partial<UISliceState> = { ...INITIAL_UI_STATE };

    if (persisted && typeof persisted === 'object') {
      // Explicitly map persisted fields to the new state structure
      if ('selectedConversationTab' in persisted && persisted.selectedConversationTab !== undefined) {
        migratedState.selectedConversationTab = persisted.selectedConversationTab as ConversationTabType;
      }
      if ('isReduceMotionGloballyEnabled' in persisted && persisted.isReduceMotionGloballyEnabled !== undefined) {
        migratedState.isReduceMotionGloballyEnabled = persisted.isReduceMotionGloballyEnabled as boolean;
      }
    }

    // Apply version-specific migrations if necessary (example from previous feedback)
    if (version < UI_PERSIST_VERSION) {
      if (version <= 1 && ['active', 'saved', 'all'].includes(migratedState.selectedConversationTab as any)) {
        migratedState.selectedConversationTab = INITIAL_UI_STATE.selectedConversationTab;
      }
      // If migrating from a version without 'isReduceMotionGloballyEnabled',
      // it will correctly retain the INITIAL_UI_STATE.isReduceMotionGloballyEnabled value.
    }

    // Final validation against current definitions
    if (!isConversationTab(migratedState.selectedConversationTab)) {
      migratedState.selectedConversationTab = INITIAL_UI_STATE.selectedConversationTab;
    }
    if (typeof migratedState.isReduceMotionGloballyEnabled !== 'boolean') {
      migratedState.isReduceMotionGloballyEnabled = INITIAL_UI_STATE.isReduceMotionGloballyEnabled;
    }
    
    // Crucially, ensure _motionPreferenceInitialized is reset to false after migration,
    // so initializeMotionPreference() can run correctly on next app load.
    // This field should always come from the runtime INITIAL_UI_STATE for this purpose.
    migratedState._motionPreferenceInitialized = INITIAL_UI_STATE._motionPreferenceInitialized;

    return migratedState; // This partial state will be merged by Zustand's persist middleware
  },
  onRehydrateStorage: () => (state, error) => {
    if (error) {
      console.error('[uiSlice] Persist rehydration failed:', error);
      // Potentially trigger a reset or clear the specific storage item
      // state?.resetUIState(); // This would re-run initializeMotionPreference if called.
    }
    // Removed initializeMotionPreference() call from here.
    // It should be called from a React useEffect/useLayoutEffect in the root app component.
  },
};

/* ---------------------------------------------------------------------------
 * 5. Slice creator
 * ------------------------------------------------------------------------ */

// Throttled event dispatcher for tab changes
const dispatchThrottledTabChange = throttle((tab: ConversationTabType) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ui:tab-change', { detail: { tab } }));
  }
}, 300, { leading: true, trailing: false }); // Example: throttle to 300ms

export const createUISlice: StateCreator<
  StoreState,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  UISlice
> = devtools(
  persist(
    (set, get) => ({
      ...INITIAL_UI_STATE,

      setSelectedConversationTab: (tab) => {
        if (!isConversationTab(tab)) {
          console.warn(`[uiSlice] Attempted to set invalid tab: "${tab}". Ignoring.`);
          return;
        }
        if (get().selectedConversationTab === tab) return;

        set({ selectedConversationTab: tab }, false, 'ui/setSelectedConversationTab');
        // Consider using Zustand's own subscription model or a dedicated event bus
        // if performance with global CustomEvent becomes an issue.
        // For now, using a throttled dispatcher.
        dispatchThrottledTabChange(tab);
      },

      toggleReduceMotionPreference: () => {
        set(
          (state) => ({ isReduceMotionGloballyEnabled: !state.isReduceMotionGloballyEnabled }),
          false,
          'ui/toggleReduceMotionPreference'
        );
      },

      initializeMotionPreference: () => {
        // This action is intended to be called from a React useEffect/useLayoutEffect
        // in the root <App> component, only on the client-side, after hydration.
        if (typeof window !== 'undefined' && !get()._motionPreferenceInitialized) {
          const systemPrefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          
          // If the current state is still the initial default (true), sync with system.
          // If it's been explicitly set by user (e.g., persisted as false), respect that user choice.
          if (get().isReduceMotionGloballyEnabled === INITIAL_UI_STATE.isReduceMotionGloballyEnabled) {
            set(
              {
                isReduceMotionGloballyEnabled: systemPrefersReducedMotion,
                _motionPreferenceInitialized: true,
              },
              false,
              'ui/initializeMotionPreferenceFromSystem'
            );
          } else {
            // Motion preference was likely set by user and persisted, or already initialized. Mark as initialized.
            set({ _motionPreferenceInitialized: true }, false, 'ui/markMotionPreferenceInitialized');
          }
        }
      },

      resetUIState: () => {
        // When resetting, also reset the _motionPreferenceInitialized flag
        // so initializeMotionPreference can correctly re-sync on next opportunity.
        const newInitialState = { ...INITIAL_UI_STATE, _motionPreferenceInitialized: false };
        set(newInitialState, true, 'ui/resetUIState'); // 'true' replaces the state
        // The call to initializeMotionPreference() after reset should happen
        // from the same client-side effect that calls it on initial load.
      },
    }),
    persistOptions,
  ),
  { name: 'UISlice', store: 'ui', enabled: process.env.NODE_ENV !== 'production' }
);

/* ---------------------------------------------------------------------------
 * 6. Selectors & Hooks (Example pattern - adapt to your project)
 *
 * Consider creating a React Context for motion preference if it's read frequently
 * by many deeply nested components to avoid prop-drilling or excessive slice reads.
 *
 * Example hook (if uiSlice is part of a combined store):
 * import { useStore } from '@/lib/state/store'; // Your main store hook
 *
 * export const useUIMotionPreference = () => {
 *   return useStore(state => state.uiSlice.isReduceMotionGloballyEnabled);
 * };
 *
 * export const useSelectedTab = () => {
 *   return useStore(state => state.uiSlice.selectedConversationTab);
 * };
 * ------------------------------------------------------------------------ */

/* ---------------------------------------------------------------------------
 * 7. End of file
 * ------------------------------------------------------------------------ */