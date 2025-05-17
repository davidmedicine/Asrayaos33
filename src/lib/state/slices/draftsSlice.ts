// === File: asrayaos3.4/src/lib/state/slices/draftsSlice.ts ===

/**
 * draftsSlice.ts
 * Zustand slice for managing input drafts per context, with debounced
 * persistence and history. (v10.6 - Enhanced)
 */

import { StateCreator } from 'zustand';

// --- Constants ---
const DRAFTS_STORAGE_KEY = 'asraya-input-drafts';
const HISTORY_STORAGE_KEY = 'asraya-draft-history';
const DEBOUNCE_DELAY = 300; // ms delay for debouncing storage writes
const MAX_HISTORY_PER_CONTEXT = 10; // Max history entries per context

// --- Utility (Ideally move to a utils file) ---
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
        fn(...args);
        timeout = null; // Clear timeout after execution
    }, delay);
  }) as T;
}

// --- Types ---
export interface DraftsSlice {
  // State
  drafts: Record<string, string>; // contextKey -> draft text
  draftHistory: Record<string, string[]>; // contextKey -> previous entries (persisted)
  isLoading: boolean; // Primarily for potential future server loading

  // Actions
  getDraft: (contextKey: string) => string;
  setDraft: (contextKey: string, text: string) => void;
  clearDraft: (contextKey: string) => void;
  clearAllDrafts: () => void;
  addToHistory: (contextKey: string, text: string) => void;
  loadDrafts: () => Promise<void>; // Placeholder for explicit load/sync
}

// --- Debounced Storage Writers ---
// Debounced function to save the entire drafts object to localStorage
const saveDraftsToLocalStorage = debounce((drafts: Record<string, string>) => {
  try {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
        console.debug('[DraftsSlice] Debounced save drafts to localStorage');
    }
  } catch (e) {
    console.error('[DraftsSlice] Failed to save drafts to localStorage:', e);
  }
}, DEBOUNCE_DELAY);

// Debounced function to save the entire history object to localStorage
const saveHistoryToLocalStorage = debounce((history: Record<string, string[]>) => {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
            console.debug('[DraftsSlice] Debounced save history to localStorage');
        }
    } catch (e) {
        console.error('[DraftsSlice] Failed to save history to localStorage:', e);
    }
}, DEBOUNCE_DELAY);


// --- Slice Creator ---
export const createDraftsSlice: StateCreator<DraftsSlice> = (set, get) => {

  // Helper to load data safely from localStorage
  const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    if (typeof localStorage === 'undefined') {
        return defaultValue; // Handle environments without localStorage (SSR)
    }
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : defaultValue;
    } catch (e) {
      console.error(`[DraftsSlice] Failed to load ${key} from localStorage:`, e);
      return defaultValue;
    }
  };

  return {
    // --- Initial State ---
    // Load drafts and history eagerly from localStorage on initialization
    drafts: loadFromStorage<Record<string, string>>(DRAFTS_STORAGE_KEY, {}),
    draftHistory: loadFromStorage<Record<string, string[]>>(HISTORY_STORAGE_KEY, {}),
    isLoading: false, // Not actively loading initially

    // --- Actions ---
    getDraft: (contextKey) => {
      // No need for console log here, it's just a read
      return get().drafts[contextKey] || '';
    },

    setDraft: (contextKey, text) => {
      set(state => {
        const newDrafts = { ...state.drafts, [contextKey]: text };
        // Trigger debounced save instead of immediate write
        saveDraftsToLocalStorage(newDrafts);
        console.debug(`[DraftsSlice] Set draft for context "${contextKey}"`);
        return { drafts: newDrafts };
      });
    },

    clearDraft: (contextKey) => {
      set(state => {
        const newDrafts = { ...state.drafts };
        const newHistory = { ...state.draftHistory };

        let draftsChanged = false;
        let historyChanged = false;

        if (contextKey in newDrafts) {
            delete newDrafts[contextKey];
            draftsChanged = true;
            console.debug(`[DraftsSlice] Cleared draft for context "${contextKey}"`);
        }
        // Also clear history for the context when clearing the draft
        if (contextKey in newHistory) {
            delete newHistory[contextKey];
            historyChanged = true;
             console.debug(`[DraftsSlice] Cleared history for context "${contextKey}"`);
        }

        // Trigger debounced saves only if data actually changed
        if (draftsChanged) {
            saveDraftsToLocalStorage(newDrafts);
        }
        if (historyChanged) {
            saveHistoryToLocalStorage(newHistory);
        }

        // Return new state only if something changed
        return draftsChanged || historyChanged ? { drafts: newDrafts, draftHistory: newHistory } : {};
      });
    },

    clearAllDrafts: () => {
        console.debug('[DraftsSlice] Clearing all drafts and history');
        // Clear state immediately
        set({ drafts: {}, draftHistory: {} });

        // Clear localStorage directly (debouncing not necessary for infrequent full clear)
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(DRAFTS_STORAGE_KEY);
                localStorage.removeItem(HISTORY_STORAGE_KEY);
            }
        } catch (e) {
            console.error('[DraftsSlice] Failed to remove items from localStorage:', e);
        }
    },

    addToHistory: (contextKey, text) => {
      const trimmedText = text.trim();
      if (!trimmedText) return; // Don't add empty entries

      set(state => {
        const currentHistory = state.draftHistory[contextKey] || [];
        // Add new entry, remove duplicates, limit size
        const newHistory = [
          trimmedText,
          ...currentHistory.filter(entry => entry !== trimmedText)
        ].slice(0, MAX_HISTORY_PER_CONTEXT);

        const updatedHistoryState = {
            ...state.draftHistory,
            [contextKey]: newHistory
        };

        // Trigger debounced save for history
        saveHistoryToLocalStorage(updatedHistoryState);
        console.debug(`[DraftsSlice] Added entry to history for context "${contextKey}"`);

        return { draftHistory: updatedHistoryState };
      });
    },

    loadDrafts: async () => {
        // Note: Initial load now happens synchronously via IIFE above.
        // This action can be used for explicit re-sync or potential server loading later.
        console.debug('[DraftsSlice] loadDrafts called (currently a placeholder, data loaded on init)');
        set({ isLoading: true });
        try {
            // Placeholder: If needed, implement server loading here and merge with localStorage
            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async work
            set({ isLoading: false });
        } catch (error) {
            console.error('[DraftsSlice] Error in loadDrafts:', error);
            set({ isLoading: false });
        }
    }
  };
};