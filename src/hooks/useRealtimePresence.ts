/**
 * useRealtimePresence.ts
 *
 * Custom hook for managing real-time presence and typing indicators with Supabase.
 * Optimized for performance with throttled updates, minimal payloads, and robust lifecycle management.
 * Includes visibility detection to pause background activity.
 *
 * Key Concepts & Supabase Behavior:
 * - Presence Payload: Uses a standardized `PresencePayload` shape { id, name, image, roomId, kind }.
 * - Throttling: Limits the frequency of presence updates (default 7s) and typing broadcasts (default 1s).
 * - Supabase Heartbeat: Supabase Realtime uses a default heartbeat of 30 seconds. A client is considered
 * offline ("stale") if it misses 2 consecutive heartbeats (~60s). Ref: https://supabase.com/docs/guides/realtime/presence
 * - Stale Data Cleanup: Uses intervals to periodically remove users who haven't sent a heartbeat
 * within the configured `PRESENCE_EXPIRY` window. This expiry should be >= 60s (2 * heartbeat).
 * - Typing Indicator Expiry: Uses a separate, shorter interval (default 5s) to clear typing indicators.
 * - Channel Key: Uses `userId` as the presence key (`config.presence.key`) as recommended. Ensure this `userId`
 * is stable for the duration the channel is active to avoid duplicate presence entries.
 * - Append-Only Optimization: Supabase/Phoenix Presence tracks only the *last* presence entry per user key,
 * making frequent `track()` calls efficient overwrite operations.
 * - Lifecycle Hygiene: Implements checks and cleanup logic to prevent duplicate timers or listeners,
 * especially during component unmounts or quick re-renders.
 * - Visibility Handling: Pauses cleanup intervals when the browser tab is hidden to conserve resources.
 *
 * Testing Tips:
 * - Mocking: Use a simple EventEmitter or mock library to simulate Supabase channel events for unit tests.
 * - Fake Timers: Employ Jest's fake timers (`jest.useFakeTimers()`) to deterministically test throttle intervals
 * and stale data cleanup logic without waiting in real-time.
 * - Integration: Write tests that mount multiple instances of components using this hook and assert that they
 * correctly see each other's presence and typing status changes after simulated heartbeats/events.
 */

import { useEffect, useRef, useCallback } from 'react';
import { type RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase_client/client'; // Ensure this points to your Supabase client setup
import { usePresenceStore, useTypingStore } from '@/lib/state/store'; // Ensure these point to your Zustand stores
// [FIXED] Import from specific path
import { PresencePayload, PresenceKind } from '@/types/presence';
import {
  // [FIXED] Import the actual exported name and alias it locally
  createThrottledPresenceTracker as createThrottledFunction,
  convertSupabasePresenceStateToMap,
} from '@/lib/utils/realtimeHelpers'; // Ensure this points to your helper functions

// --- Constants ---

// Default Throttle Intervals
const DEFAULT_PRESENCE_THROTTLE_MS = 7000; // 7 seconds (comfortably below 30s heartbeat)
const DEFAULT_TYPING_THROTTLE_MS = 1000; // 1 second (standard UX)

// Default Cleanup Intervals & Expiry
const DEFAULT_PRESENCE_EXPIRY_MS = 90000; // 90 seconds (allows for >2 missed heartbeats)
const PRESENCE_CLEANUP_INTERVAL_MS = DEFAULT_PRESENCE_EXPIRY_MS / 3; // ~30s, check 3 times per expiry window
const DEFAULT_TYPING_STALE_INTERVAL_MS = 5000; // 5 seconds for typing indicators

// Load intervals from environment variables or use defaults
const PRESENCE_THROTTLE_MS =
  parseInt(process.env.NEXT_PUBLIC_PRESENCE_THROTTLE || String(DEFAULT_PRESENCE_THROTTLE_MS), 10);
const TYPING_THROTTLE_MS =
  parseInt(process.env.NEXT_PUBLIC_TYPING_THROTTLE || String(DEFAULT_TYPING_THROTTLE_MS), 10);
const PRESENCE_EXPIRY_MS =
  parseInt(process.env.NEXT_PUBLIC_PRESENCE_EXPIRY || String(DEFAULT_PRESENCE_EXPIRY_MS), 10);
// Ensure PRESENCE_EXPIRY is sufficient based on Supabase's ~60s implicit timeout (2 * 30s heartbeat)
if (PRESENCE_EXPIRY_MS < 60000) {
  console.warn(`Presence expiry (${PRESENCE_EXPIRY_MS}ms) is less than the recommended minimum (60000ms) based on Supabase's 30s heartbeat.`);
}
const TYPING_STALE_INTERVAL_MS =
  parseInt(process.env.NEXT_PUBLIC_TYPING_STALE_INTERVAL || String(DEFAULT_TYPING_STALE_INTERVAL_MS), 10);

// --- Hook Props Interface ---

interface UseRealtimePresenceProps {
  /** Stable user ID used as the presence key. Crucial: Do not change while the hook is active. */
  userId: string;
  /** User's display name. */
  userName: string;
  /** User's image URL. */
  userImageUrl?: string;
  /** The Supabase channel name to join (e.g., 'room-123', 'global-presence'). Defaults to 'presence'. */
  channelName?: string;
  /** The type/context of the presence (e.g., specific feature area). Defaults to User. */
  kind?: PresenceKind;
  /** The specific location or sub-context (e.g., document ID, game lobby ID). Maps to `roomId` in payload. */
  roomId?: string;
  /** Flag to enable/disable the hook's functionality. */
  enabled?: boolean;
}

// --- Custom Hook Implementation ---

export function useRealtimePresence({
  userId,
  userName,
  userImageUrl,
  channelName = 'presence', // Default channel name
  kind = PresenceKind.User, // Default kind
  roomId,
  enabled = true,
}: UseRealtimePresenceProps) {
  // --- State Management ---
  const { batchUpdateFriends, removeStalePresence } = usePresenceStore(
    (state) => ({
      batchUpdateFriends: state.batchUpdateFriends,
      removeStalePresence: state.removeStalePresence,
    })
  );
  const { setUserTyping, clearStaleTypingIndicators } = useTypingStore(
    (state) => ({
      setUserTyping: state.setUserTyping,
      clearStaleTypingIndicators: state.clearStaleTypingIndicators,
    })
  );

  // --- Refs ---
  const supabase = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceCleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingCleanupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);
  const isSubscribedRef = useRef(false); // Track subscription status for timer management

  // --- Helper Functions for Timers ---

  const clearPresenceTimer = useCallback(() => {
    if (presenceCleanupTimerRef.current) {
      // console.debug('[useRealtimePresence] Clearing presence cleanup timer.');
      clearInterval(presenceCleanupTimerRef.current);
      presenceCleanupTimerRef.current = null;
    }
  }, []);

  const clearTypingTimer = useCallback(() => {
    if (typingCleanupTimerRef.current) {
      // console.debug('[useRealtimePresence] Clearing typing cleanup timer.');
      clearInterval(typingCleanupTimerRef.current);
      typingCleanupTimerRef.current = null;
    }
  }, []);

  const startTimers = useCallback(() => {
    // Start timers only if subscribed, mounted, and document is visible
    if (!isMountedRef.current || !isSubscribedRef.current || document.visibilityState !== 'visible') {
      // console.debug('[useRealtimePresence] Skipping timer start (not mounted, subscribed, or visible)');
      return;
    }

    // Guard against creating multiple intervals
    if (!presenceCleanupTimerRef.current) {
      // console.debug('[useRealtimePresence] Setting up presence cleanup timer.');
      presenceCleanupTimerRef.current = setInterval(() => {
        // [FIXED] Call removeStalePresence without arguments (assuming slice takes none)
        removeStalePresence();
      }, PRESENCE_CLEANUP_INTERVAL_MS);
    }
    if (!typingCleanupTimerRef.current) {
      // console.debug('[useRealtimePresence] Setting up typing cleanup timer.');
      typingCleanupTimerRef.current = setInterval(() => {
        clearStaleTypingIndicators();
      }, TYPING_STALE_INTERVAL_MS);
    }
  }, [removeStalePresence, clearStaleTypingIndicators]); // Dependencies: Zustand actions

  // --- Presence Tracking ---
  const trackPresence = useCallback(() => {
    if (!enabled || !channelRef.current || !userId || !userName) {
      return;
    }
    const client = supabase.current;
    if (!client) return;

    const channel = channelRef.current;

    // Construct the presence payload according to the required schema.
    // [FIXED] Removed last_seen to adhere to interface and lean-payload rule.
    const presenceData: PresencePayload = {
      id: userId,
      name: userName,
      image: userImageUrl ?? null, // Allow null if undefined
      roomId: roomId,
      kind: kind,
      // last_seen is handled implicitly by Supabase heartbeat
    };

    // console.debug('[useRealtimePresence] Tracking presence:', presenceData);
    try {
      channel.track(presenceData);
    } catch (error) {
       console.error('[useRealtimePresence] Error tracking presence:', error);
    }

  }, [userId, userName, userImageUrl, roomId, kind, enabled]);

  const throttledTrackPresence = useCallback(
    createThrottledFunction(trackPresence, PRESENCE_THROTTLE_MS),
    [trackPresence]
  );

  // --- Typing Status Broadcast ---
  const updateTypingStatus = useCallback((isTyping: boolean) => {
    if (!enabled || !channelRef.current || !userId) {
      return;
    }
    const client = supabase.current;
    if (!client) return;

    const channel = channelRef.current;

    // console.debug(`[useRealtimePresence] Sending typing status: ${isTyping} for user ${userId} in room ${roomId}`);
    try {
      // [FIXED] Use channel.broadcast for v2+ SDK
      channel.broadcast('typing', {
        userId,
        roomId: roomId, // Use roomId consistently
        isTyping,
      });
    } catch (error) {
        console.error('[useRealtimePresence] Error sending typing broadcast:', error);
    }
  }, [userId, roomId, enabled]);

  const throttledUpdateTypingStatus = useCallback(
    createThrottledFunction(updateTypingStatus, TYPING_THROTTLE_MS),
    [updateTypingStatus]
  );

  // --- Effect for Channel Setup, Subscription, and Cleanup ---
  useEffect(() => {
    isMountedRef.current = true;
    // console.debug('[useRealtimePresence] Effect triggered. Enabled:', enabled, 'UserID:', userId);

    // Guard: Exit early if disabled or essential info is missing
    if (!enabled || !userId || !userName) {
      // console.debug('[useRealtimePresence] Effect setup skipped (disabled or missing user info)');
      return () => { // Cleanup function for early exit
        isMountedRef.current = false;
        isSubscribedRef.current = false;
        if (channelRef.current) {
          // console.debug('[useRealtimePresence] Unsubscribing channel due to disable/deps change.');
          supabase.current?.removeChannel(channelRef.current).catch(err => console.error("Error removing channel on disable:", err));
          channelRef.current = null;
        }
        clearPresenceTimer();
        clearTypingTimer();
      };
    }

    const client = supabase.current;
    if (!client) {
      console.error('[useRealtimePresence] Supabase client not initialized!');
      isMountedRef.current = false; // Should not happen if ref init is correct
      return;
    }

    // --- Channel Initialization ---
    // console.debug(`[useRealtimePresence] Setting up channel: ${channelName} for user: ${userId}`);
    const channel = client.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });
    channelRef.current = channel;

    // --- Event Listeners ---

    const handlePresenceSync = () => {
      if (!isMountedRef.current || !channelRef.current) return;
      const presenceState = channelRef.current.presenceState<PresencePayload>();
      // console.debug('[useRealtimePresence] Presence sync event received:', presenceState);
      const onlineFriendsMap = convertSupabasePresenceStateToMap(presenceState);
      batchUpdateFriends(onlineFriendsMap);
    };
    channel.on('presence', { event: 'sync' }, handlePresenceSync);

    const handleTypingEvent = (event: { payload: any }) => {
        if (!isMountedRef.current) return;
        // Basic validation of payload structure
        if (typeof event.payload === 'object' && event.payload !== null && 'userId' in event.payload && 'isTyping' in event.payload) {
          const { userId: typingUserId, roomId: eventRoomId, isTyping } = event.payload;
          // console.debug(`[useRealtimePresence] Typing event received: User ${typingUserId} in room ${eventRoomId ?? 'N/A'} isTyping: ${isTyping}`);
          // Optionally filter by eventRoomId if required: if (eventRoomId !== roomId) return;
          setUserTyping(typingUserId, eventRoomId ?? channelName, isTyping);
        } else {
            console.warn("[useRealtimePresence] Received malformed typing event payload:", event.payload);
        }
    };
    channel.on('broadcast', { event: 'typing' }, handleTypingEvent);

    // [MODIFIED] Visibility listener handles timer pausing/resuming
    const handleVisibilityChange = () => {
      if (!isMountedRef.current || !isSubscribedRef.current) return; // Only act if mounted and subscribed

      if (document.visibilityState === 'visible') {
        // console.debug('[useRealtimePresence] Tab became visible. Re-tracking presence and restarting timers.');
        throttledTrackPresence(); // Re-sync presence quickly
        startTimers(); // Restart cleanup timers
      } else if (document.visibilityState === 'hidden') {
        // console.debug('[useRealtimePresence] Tab became hidden. Pausing cleanup timers.');
        clearPresenceTimer(); // Pause timers to save resources
        clearTypingTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // --- Subscribe and Initial Track ---
    // console.debug('[useRealtimePresence] Subscribing to channel...');
    channel.subscribe((status, err) => {
      if (!isMountedRef.current) {
        // console.debug('[useRealtimePresence] Received subscribe callback after unmount, ignoring.');
        return;
      }

      if (status === 'SUBSCRIBED') {
        // console.debug('[useRealtimePresence] Successfully subscribed to channel. Tracking initial presence.');
        isSubscribedRef.current = true; // Mark as subscribed
        throttledTrackPresence(); // Track presence immediately
        startTimers(); // Start cleanup timers now that we are subscribed and visible (checked in startTimers)
      } else if (status === 'CLOSED') {
          // console.debug('[useRealtimePresence] Channel closed.');
          isSubscribedRef.current = false; // Mark as unsubscribed
          clearPresenceTimer(); // Stop timers if channel closes unexpectedly
          clearTypingTimer();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`[useRealtimePresence] Channel subscription error/timeout: ${status}`, err);
        isSubscribedRef.current = false; // Mark as unsubscribed
        clearPresenceTimer(); // Stop timers on error
        clearTypingTimer();
        // Optional: Implement retry logic or notify user
      } else {
        // console.debug(`[useRealtimePresence] Channel status changed: ${status}`);
      }
    });

    // --- Cleanup Function ---
    return () => {
      // console.debug('[useRealtimePresence] Cleanup effect running.');
      isMountedRef.current = false; // Mark as unmounted
      isSubscribedRef.current = false; // Reset subscription state

      // 1. Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // 2. Clear intervals safely
      clearPresenceTimer();
      clearTypingTimer();

      // 3. Unsubscribe and remove the channel
      if (channelRef.current) {
        const chan = channelRef.current;
        channelRef.current = null;
        // console.debug('[useRealtimePresence] Unsubscribing and removing channel.');
        client.removeChannel(chan).catch((error) => {
            console.error('[useRealtimePresence] Error removing channel during cleanup:', error);
        });
      } else {
        // console.debug('[useRealtimePresence] Cleanup: No channel ref found to remove.');
      }
    };
  }, [
    // --- Dependency Array ---
    userId,
    userName,
    userImageUrl,
    roomId,
    kind,
    channelName,
    enabled,
    batchUpdateFriends, // Stable Zustand action
    setUserTyping,      // Stable Zustand action
    removeStalePresence,// Stable Zustand action
    clearStaleTypingIndicators, // Stable Zustand action
    throttledTrackPresence, // Memoized throttled function
    startTimers,          // Include memoized timer helpers
    clearPresenceTimer,   // Include memoized timer helpers
    clearTypingTimer,     // Include memoized timer helpers
    // Note: trackPresence and updateTypingStatus are deps of throttled versions,
    // and timer helpers depend on Zustand actions - all covered.
  ]);

  // --- Returned API ---
  return {
    /** Call this function when the user starts or stops typing. It's throttled. */
    setTyping: throttledUpdateTypingStatus,
    /** Manually trigger a presence update (e.g., after profile/location change). It's throttled. */
    trackPresence: throttledTrackPresence,
    /** The current Supabase channel instance (use with caution, may be null). */
    _channel: channelRef.current,
  };
}