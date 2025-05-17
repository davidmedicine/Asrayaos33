/**
 * typingSlice.ts
 * Zustand slice for managing typing indicators
 *
 * Features:
 * - Decoupled from presence for performance.
 * - O(1) lookup for user typing status (Map).
 * - Time-based expiry for indicators.
 * - Max user limit with FIFO eviction to prevent memory leaks.
 * - Clear actions for updating and clearing state.
 * - Well-documented for maintainability.
 */

import { StateCreator } from 'zustand';
// Import createSelector if you want memoized selectors (recommended for performance)
// import { createSelector } from 'zustand/traditional'; // Or your preferred selector library

// --- Constants ---

/**
 * Default expiry time for typing indicators in milliseconds.
 * Users typically perceive 3-10 seconds as "live". Setting to 10s.
 * Source: CometChat UX research, general chat app conventions.
 */
export const DEFAULT_TYPING_EXPIRY = 10_000; // 10 seconds (Removed 'as const')

/**
 * Maximum number of users to track typing simultaneously.
 * Acts as a safeguard against unbounded memory growth.
 * When the limit is reached, the oldest entry is pruned (FIFO).
 */
export const MAX_TYPING_USERS = 50; // (Removed 'as const')

// --- Types ---

/**
 * Information stored per typing user. Renamed from TypingInfo for consistency
 * with other potential "*Entry" types in the project.
 */
export type TypingEntry = {
  /** The identifier for the room (or channel) where the user is typing. Standardized on roomId. */
  roomId: string;
  /** Timestamp (from Date.now()) when the user's typing status was last updated. */
  timestamp: number;
};

/**
 * Shape of state managed by the typing slice.
 */
export interface TypingSlice {
  /**
   * Maps user IDs to their typing information (where and when).
   * Key: userId (string)
   * Value: TypingEntry { roomId: string, timestamp: number }
   *
   * Note on Persistence: If using zustand/persist, Map objects don't serialize
   * correctly via `JSON.stringify` (become `[]`). You MUST either:
   * 1. Use a custom serializer/deserializer (e.g., provide `storage` option with
   * `setItem: (name, value) => storage.setItem(name, JSON.stringify(Array.from(value.state.typingUsers.entries())))`
   * `getItem: (name) => { const str = storage.getItem(name); if (!str) return null; const parsed = JSON.parse(str); return { state: { typingUsers: new Map(parsed) } }; }`
   * replacing `storage` with `localStorage`, `sessionStorage`, etc. See Zustand docs/FAQ for Map examples.)
   * 2. Exclude this slice from persistence using `partialize`:
   * `partialize: (state) => ({ ...state, typingUsers: undefined })` or similar based on your full state shape.
   * Refer to Zustand persistence docs for `partialize`.
   *
   * Consider exact-type helpers (e.g., from 'ts-essentials' or custom) when constructing
   * payloads passed to actions like `batchUpdateTypingUsers` upstream, to prevent
   * accidental inclusion of excess properties if payloads are dynamically created.
   */
  typingUsers: Map<string, TypingEntry>;

  // --- Actions ---

  /**
   * Updates the typing state for a specific user (adds, updates, or removes).
   * Renamed from `setUserTyping` to clarify it handles multiple operations.
   *
   * @param userId - The ID of the user whose typing status is changing.
   * @param roomId - The ID of the room where the user is typing/stopped typing.
   * @param isTyping - True if the user started/continued typing, false if they stopped.
   *
   * Note (Impurity): This action uses `Date.now()`, making it impure regarding time.
   * Unit tests needing specific timing must mock `Date.now()`. See Jest fake timers.
   *
   * Note (Throttling): Realtime events (like Supabase broadcasts) can arrive in bursts.
   * It's highly recommended to throttle calls to this action from your event handler
   * (e.g., using `lodash.throttle` with a 250ms wait) to reduce state churn and
   * unnecessary re-renders.
   */
  updateUserTyping: (userId: string, roomId: string, isTyping: boolean) => void;

  /**
   * Replaces the entire typing user map. Useful for batch updates or initialization
   * from a realtime backend sync event.
   *
   * @param incomingTypingUsers - A map containing the new set of typing users.
   * Ensure keys are userIds and values adhere to TypingEntry.
   */
  batchUpdateTypingUsers: (incomingTypingUsers: Map<string, TypingEntry>) => void;

  /**
   * Removes typing indicators older than the specified maximum age.
   *
   * CRITICAL USAGE NOTE: This cleanup relies on being called periodically.
   * You MUST set up an external interval timer (e.g., in a React hook managing
   * the realtime connection) to call this regularly. A suggested interval is
   * every 5 seconds (`setInterval(() => store.getState().clearStaleTypingIndicators(), 5000)`).
   * Failure to do so can lead to stale indicators persisting indefinitely if the
   * user abruptly disconnects or closes the tab without a "stop typing" event.
   *
   * @param maxAgeMs - The maximum age in milliseconds. Defaults to DEFAULT_TYPING_EXPIRY.
   */
  clearStaleTypingIndicators: (maxAgeMs?: number) => void;

  /**
   * Clears all typing indicators immediately.
   */
  clearAllTypingUsers: () => void; // Returns void implicitly
}

/**
 * Creates the typing slice for the Zustand store.
 */
export const createTypingSlice: StateCreator<TypingSlice, [], [], TypingSlice> = (set, get) => ({
  typingUsers: new Map(),

  updateUserTyping: (userId, roomId, isTyping) => {
    set((state) => {
      const currentTypingUsers = state.typingUsers;
      const newTypingUsers = new Map(currentTypingUsers); // Clone for immutability

      if (isTyping) {
        // User starts or continues typing
        let userToPrune: string | null = null;

        // Check limit ONLY if it's a new user being added
        if (!newTypingUsers.has(userId) && newTypingUsers.size >= MAX_TYPING_USERS) {
          // FIFO Eviction: Find the user with the oldest timestamp
          let oldestTimestamp = Infinity;
          newTypingUsers.forEach((entry, id) => {
            if (entry.timestamp < oldestTimestamp) {
              oldestTimestamp = entry.timestamp;
              userToPrune = id;
            }
          });

          if (process.env.NODE_ENV !== 'production') {
              console.warn(`[typingSlice] MAX_TYPING_USERS (${MAX_TYPING_USERS}) limit reached. Pruning oldest user (${userToPrune}) to add new user (${userId}).`);
          }
          if (userToPrune) {
            newTypingUsers.delete(userToPrune); // Make space
          }
        }

        // Add or update the user
        newTypingUsers.set(userId, {
          roomId,
          timestamp: Date.now(), // Impure: Uses wall-clock time
        });

        return { typingUsers: newTypingUsers };

      } else {
        // User stopped typing
        // Fast-exit: If user wasn't in the map, no change needed
        if (!newTypingUsers.has(userId)) {
          return state;
        }

        // User was typing, remove them
        newTypingUsers.delete(userId);
        return { typingUsers: newTypingUsers };
      }
    });
  },

  batchUpdateTypingUsers: (incomingTypingUsers) => {
    // Log warning if incoming batch exceeds the limit, but still process it.
    // The limit is primarily enforced on individual additions via updateUserTyping.
    if (process.env.NODE_ENV !== 'production' && incomingTypingUsers.size > MAX_TYPING_USERS) {
        console.warn(`[typingSlice] batchUpdateTypingUsers received ${incomingTypingUsers.size} entries, exceeding MAX_TYPING_USERS (${MAX_TYPING_USERS}).`);
    }
    // Directly replace the map. Ensure the input adheres to TypingEntry structure.
    set({ typingUsers: new Map(incomingTypingUsers) });
  },

  clearStaleTypingIndicators: (maxAgeMs = DEFAULT_TYPING_EXPIRY) => {
    set((state) => {
      const now = Date.now();
      const currentTypingUsers = state.typingUsers;
      const newTypingUsers = new Map<string, TypingEntry>();
      let hasChanges = false;

      currentTypingUsers.forEach((entry, userId) => {
        if (now - entry.timestamp <= maxAgeMs) {
          // Keep non-stale entry
          newTypingUsers.set(userId, entry);
        } else {
          // Entry is stale, mark that changes occurred
          hasChanges = true;
        }
      });

      // Only return a new state object if changes were actually made
      return hasChanges ? { typingUsers: newTypingUsers } : state;
    });
  },

  clearAllTypingUsers: () => {
    set({ typingUsers: new Map() });
  },
});

// --- Selectors ---
// Define selectors outside the slice for organization and memoization readiness.

/**
 * Selects a list of user IDs currently typing in a specific room.
 *
 * Memoization Recommendation: Use `createSelector` (e.g., from `zustand/traditional`
 * or `reselect`) if this selector is used in performance-sensitive components
 * to avoid unnecessary recalculations and re-renders.
 *
 * @param state - The Zustand state containing the TypingSlice.
 * @param roomId - The ID of the room to check.
 * @returns An array of user IDs typing in the specified room.
 */
export const selectTypingUserIdsInRoom = (state: TypingSlice, roomId: string): string[] => {
  const userIds: string[] = [];
  // Direct iteration avoids creating intermediate arrays like Array.from(map.entries())
  state.typingUsers.forEach((entry, userId) => {
    if (entry.roomId === roomId) {
      userIds.push(userId);
    }
  });
  return userIds;
};

/**
 * Selects the TypingEntry for a specific user, if they are typing.
 * Useful for getting both the roomId and timestamp.
 *
 * @param state - The Zustand state containing the TypingSlice.
 * @param userId - The ID of the user to check.
 * @returns The TypingEntry object if the user is typing, otherwise undefined.
 */
export const selectUserTypingEntry = (state: TypingSlice, userId: string): TypingEntry | undefined => {
  return state.typingUsers.get(userId);
};