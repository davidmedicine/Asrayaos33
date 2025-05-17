// === File: asrayaos3.4/src/lib/state/slices/commandSlice.ts ===

/**
 * commandSlice.ts
 * Zustand slice for managing command menu UI state (searchQuery, open state) and
 * persisting recently used commands using safe utilities and debouncing.
 * (v10.6 - Refactored for Correct Persistence)
 */

import { StateCreator } from 'zustand';

// --- Constants ---
// Import limit from shared constants (Assumed path)
import { RECENT_COMMAND_LIMIT } from '@/constants/commands';
const RECENTS_STORAGE_KEY = 'asraya-recent-commands';
const DEBOUNCE_SAVE_DELAY = 300; // ms delay for debouncing storage writes

// --- Local Utility Implementations ---
// Implement helper functions directly to avoid import issues

// Check if we're running in a browser environment
const isClient = typeof window !== 'undefined';

// Safe localStorage implementation
const safeLocalStorage = {
  /** Safely retrieves an item from localStorage. */
  get: <T>(key: string, defaultValue: T): T => {
    if (!isClient) return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item !== null && item !== 'undefined' ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  },
  /** Safely sets an item in localStorage. */
  set: <T>(key: string, value: T): void => {
    if (!isClient) return;
    try {
      if (value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  },
  /** Safely removes an item from localStorage. */
  remove: (key: string): void => {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }
};

// Implement debounce function directly to avoid import issues
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, delay);
  };
}

// Placeholder for a potential telemetry/analytics function
const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
         console.debug(`[Telemetry] Event: ${eventName}`, properties);
    }
    // Replace with actual analytics call
};

// --- Types ---
export interface CommandState {
  isOpen: boolean;
  searchQuery: string; // Renamed from 'query' previously
  recentCommandIds: string[];
  // Actions
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  setSearchQuery: (searchQuery: string) => void; // Renamed from 'setQuery'
  addRecentCommand: (commandId: string) => void;
  clearRecentCommands: () => void;
}

// --- Helper Functions ---

/**
 * Loads recent command IDs from safeLocalStorage, performs validation,
 * handles potential data corruption, and is exported for potential reuse.
 * Adheres to implementation shown in Screenshot 2025-04-04 at 16.27.22.png.
 * @param limit Maximum number of recent commands to return.
 * @returns An array of recent command IDs or an empty array.
 */
export const getRecentCommands = (limit = RECENT_COMMAND_LIMIT): string[] => {
  // safeLocalStorage handles SSR checks internally
  const data = safeLocalStorage.get<unknown>(RECENTS_STORAGE_KEY, []); // Default to []

  // Validate the data structure after retrieval
  if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
    return (data as string[]).slice(0, limit); // Valid: return sliced array
  } else {
    // Invalid data structure found in storage
    // Only log/remove if the retrieved data wasn't the default empty array
    if (data !== null && Array.isArray(data) && data.length > 0) {
      console.warn('[CommandSlice] Invalid data format found in localStorage for recent commands. Resetting.');
      safeLocalStorage.remove(RECENTS_STORAGE_KEY); // Use safe remove
      trackEvent('command_recents_reset', { reason: 'invalid_format_found' });
    } else if (data !== null && !Array.isArray(data)) {
      console.warn('[CommandSlice] Non-array data found in localStorage for recent commands. Resetting.');
      safeLocalStorage.remove(RECENTS_STORAGE_KEY);
      trackEvent('command_recents_reset', { reason: 'non_array_found' });
    }
    // If data was null or already [], no need to log/remove/track reset.

    return []; // Return empty array for any invalid case or if storage was empty/failed internally
  }
  // Note: try/catch for parsing errors is handled within safeLocalStorage.get
};

/**
 * Debounced function to persist recent commands using safeLocalStorage.
 * Renamed for clarity and uses corrected implementation without redundant try/catch.
 * Adheres to implementation shown in text feedback referencing Screenshot 2025-04-04 at 16.39.14.png.
 */
const persistRecentCommandsDebounced = debounce((items: string[]) => {
    // safeLocalStorage handles SSR checks and try...catch internally (Correction Applied)
    safeLocalStorage.set(RECENTS_STORAGE_KEY, items);

    if (process.env.NODE_ENV === 'development') {
        console.debug('[CommandSlice] Debounced persist recents via safeLocalStorage:', items);
    }
    // Note: Specific error handling (like QuotaExceededError) should ideally
    // be added WITHIN the safeLocalStorage.set function in utils.ts.
    // Potential telemetry for save errors would also likely originate from safeLocalStorage.set
}, DEBOUNCE_SAVE_DELAY);


// --- Slice Creator ---
export const createCommandSlice: StateCreator<CommandState> = (set, get) => {

  return {
    // --- Initial State ---
    isOpen: false,
    searchQuery: '',
    recentCommandIds: getRecentCommands(RECENT_COMMAND_LIMIT), // Use exported helper

    // --- Actions ---

    /** Opens the command menu UI. */
    openMenu: () => {
        if (process.env.NODE_ENV === 'development') { console.debug('[CommandSlice] Opening command menu'); }
        set({ isOpen: true });
    },

    /** Closes the command menu UI and clears the search query. */
    closeMenu: () => {
        if (process.env.NODE_ENV === 'development') { console.debug('[CommandSlice] Closing command menu'); }
        set({ isOpen: false, searchQuery: '' }); // Use renamed state field
    },

    /** Toggles the command menu's open/closed state. */
    toggleMenu: () => {
        const currentlyOpen = get().isOpen;
        if (process.env.NODE_ENV === 'development') { console.debug(`[CommandSlice] Toggling command menu ${currentlyOpen ? 'to closed' : 'to open'}`); }
        set(state => ({
            isOpen: !state.isOpen,
            searchQuery: !state.isOpen ? state.searchQuery : '', // Use renamed state field & reset if closing
        }));
    },

    /** Sets the command menu's search query. */
    setSearchQuery: (searchQuery) => { // Renamed action and parameter
        set({ searchQuery }); // Use renamed state field
    },

    /** Adds a command ID to the recents list and persists (debounced). */
    addRecentCommand: (commandId) => {
      if (!commandId?.trim()) {
        if (process.env.NODE_ENV === 'development') { console.warn('[CommandSlice] Attempted to add empty commandId.'); }
        return;
      }
      set((state) => {
        const filteredRecent = state.recentCommandIds.filter(id => id !== commandId);
        const newRecentCommandIds = [commandId, ...filteredRecent].slice(0, RECENT_COMMAND_LIMIT);
        // Trigger debounced persist using the corrected function
        persistRecentCommandsDebounced(newRecentCommandIds);
        if (process.env.NODE_ENV === 'development') { console.debug('[CommandSlice] Added recent command:', { commandId, newList: newRecentCommandIds }); }
        return { recentCommandIds: newRecentCommandIds };
      });
    },

    /** Clears all recent command IDs from state and storage. */
    clearRecentCommands: () => {
      // Use safeLocalStorage utility for removal (no local try/catch needed)
      safeLocalStorage.remove(RECENTS_STORAGE_KEY);
      if (process.env.NODE_ENV === 'development') { console.debug('[CommandSlice] Cleared all recent commands.'); }
      // Potential telemetry point
      // trackEvent('command_recents_cleared');
      set({ recentCommandIds: [] }); // Clear state
    },
  };
  // Optional: Comment about zustand/persist middleware alternative
};

// Ensure file ends with a newline