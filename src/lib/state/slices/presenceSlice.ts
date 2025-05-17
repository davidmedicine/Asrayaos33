/**
 * presenceSlice.ts
 * Zustand slice for managing user presence across the application
 * Using performant Map-based storage for O(1) lookups
 */

import { StateCreator } from 'zustand';
import { PresenceKind, OnlineFriend } from '@/types';
import { DEFAULT_PRESENCE_DIFF_SCAN_LIMIT } from '@/lib/utils/realtimeHelpers';
import { mapToJson, jsonToMap } from '@/lib/utils/serializationHelpers';

/**
 * Default expiry time for presence entries
 * Used as a buffer over Supabase's ~60s (2 missed 30s heartbeats) presence eviction
 */
const DEFAULT_PRESENCE_EXPIRY = 90000; // 90 seconds

// Parse from env vars or use defaults
const PRESENCE_EXPIRY = 
  parseInt(process.env.NEXT_PUBLIC_PRESENCE_EXPIRY || String(DEFAULT_PRESENCE_EXPIRY), 10);
const PRESENCE_DIFF_SCAN_LIMIT = 
  parseInt(process.env.NEXT_PUBLIC_PRESENCE_DIFF_SCAN_LIMIT || String(DEFAULT_PRESENCE_DIFF_SCAN_LIMIT), 10);

/**
 * Shape of state managed by this slice
 */
export interface PresenceSlice {
  // Map not JSON serializable natively; using mapToJson/jsonToMap helpers for potential persistence
  onlineFriends: Map<string, OnlineFriend>;
  friendsLastUpdated: number;
  botPresence: Map<string, OnlineFriend>; // For non-human presences like AI agents

  // Actions
  setFriendOnline: (userId: string, friend: OnlineFriend) => void;
  setFriendOffline: (userId: string) => void;
  updateFriendStatus: (userId: string, status: 'online' | 'away' | 'typing') => void;
  updateFriendLocation: (userId: string, location: string) => void;
  batchUpdateFriends: (friends: Map<string, OnlineFriend>) => void;
  removeStalePresence: () => void;
  clearAllPresence: () => void;
}

/**
 * Creates the presence slice for the Zustand store
 */
export const createPresenceSlice: StateCreator<PresenceSlice, [], [], PresenceSlice> = (set, get) => ({
  onlineFriends: new Map<string, OnlineFriend>(),
  friendsLastUpdated: Date.now(),
  botPresence: new Map<string, OnlineFriend>(),

  setFriendOnline: (userId, friend) => {
    set((state) => {
      const newFriends = new Map(state.onlineFriends);
      newFriends.set(userId, {
        ...friend,
        lastSeen: Date.now()
      });
      return {
        onlineFriends: newFriends,
        friendsLastUpdated: Date.now()
      };
    });
  },

  setFriendOffline: (userId) => {
    set((state) => {
      const newFriends = new Map(state.onlineFriends);
      newFriends.delete(userId);
      return {
        onlineFriends: newFriends,
        friendsLastUpdated: Date.now()
      };
    });
  },

  updateFriendStatus: (userId, status) => {
    set((state) => {
      const friend = state.onlineFriends.get(userId);
      if (!friend) return state;
      
      const newFriends = new Map(state.onlineFriends);
      newFriends.set(userId, {
        ...friend,
        status,
        lastSeen: Date.now()
      });
      
      return {
        onlineFriends: newFriends,
        friendsLastUpdated: Date.now()
      };
    });
  },

  updateFriendLocation: (userId, location) => {
    set((state) => {
      const friend = state.onlineFriends.get(userId);
      if (!friend) return state;
      
      const newFriends = new Map(state.onlineFriends);
      newFriends.set(userId, {
        ...friend,
        location,
        lastSeen: Date.now()
      });
      
      return {
        onlineFriends: newFriends,
        friendsLastUpdated: Date.now()
      };
    });
  },

  batchUpdateFriends: (friends) => {
    set((state) => {
      // If update exceeds heuristic limit, log warning in dev mode
      if (process.env.NODE_ENV === 'development' && friends.size > PRESENCE_DIFF_SCAN_LIMIT) {
        console.warn(
          `[PresenceSlice] Large batch update detected (${friends.size} entries > ${PRESENCE_DIFF_SCAN_LIMIT}). ` +
          'Consider optimizing update frequency or adjusting NEXT_PUBLIC_PRESENCE_DIFF_SCAN_LIMIT.'
        );
      }
      
      return {
        onlineFriends: new Map(friends),
        friendsLastUpdated: Date.now()
      };
    });
  },

  removeStalePresence: () => {
    set((state) => {
      const now = Date.now();
      const newFriends = new Map(state.onlineFriends);
      let hasChanges = false;
      
      // Filter out stale presences
      newFriends.forEach((friend, userId) => {
        if (now - friend.lastSeen > PRESENCE_EXPIRY) {
          newFriends.delete(userId);
          hasChanges = true;
        }
      });
      
      return hasChanges 
        ? { onlineFriends: newFriends, friendsLastUpdated: now }
        : state;
    });
  },

  clearAllPresence: () => {
    set({
      onlineFriends: new Map(),
      friendsLastUpdated: Date.now()
    });
  }
});