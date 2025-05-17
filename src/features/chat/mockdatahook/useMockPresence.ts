// === File: src/hooks/usePresence.ts ===
// Description: Hook to manage presence data (online status, typing indicators)
//              for a specific communication channel. this file is for mock data only

import { useState, useEffect } from 'react';
import type { PresenceState } from '@/types/presence'; // Assuming type definition exists
import { mockPresenceData } from '@/lib/mock/chatMockData'; // Mock data source

// Define the properties the hook accepts
interface UsePresenceProps {
  /** The unique identifier for the channel to track presence in. */
  channelName?: string;
  /** If false, the hook will not attempt to fetch or simulate presence. Defaults to true. */
  enabled?: boolean; // Suggestion 1: Allow conditional hook usage
  /** Optional initial presence state to hydrate the hook, e.g., from SSR or cache. */
  initialPresence?: PresenceState[]; // Suggestion 2: Allow seeding
  /** If true, simulates users starting/stopping typing for UI development. Dev only. */
  simulateTyping?: boolean; // Suggestion 3: Add simulation flag
}

// Define the structure of the state and return value of the hook
interface UsePresenceReturn {
  /** Array of users currently present in the channel. */
  presentUsers: PresenceState[];
  /** Array of users currently marked as 'typing' in the channel. */
  typingUsers: PresenceState[];
  /** True while the initial presence state is being loaded/simulated. */
  isLoading: boolean;
  /** Contains an error object if fetching/simulation failed. */
  error: Error | null;
}

/**
 * Custom hook to manage and simulate user presence within a channel.
 * Uses mock data and simulates fetching/realtime updates.
 *
 * @param props - Configuration options for the hook.
 * @returns The presence state including present users, typing users, loading status, and errors.
 */
export function usePresence({
  channelName,
  enabled = true, // Default to enabled
  initialPresence,
  simulateTyping = false, // Default to no typing simulation
}: UsePresenceProps): UsePresenceReturn {
  const [presentUsers, setPresentUsers] = useState<PresenceState[]>(initialPresence ?? []);
  // Initialize typingUsers based on initialPresence if provided and applicable
  const [typingUsers, setTypingUsers] = useState<PresenceState[]>(
    () => (initialPresence ?? []).filter(user => user.status === 'typing')
  );
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !!channelName); // Initial loading only if enabled and channelName provided
  const [error, setError] = useState<Error | null>(null);

  // Suggestion: Add Dev Warnings for Missing Channel
  if (process.env.NODE_ENV === 'development' && enabled && !channelName) {
    console.warn('[usePresence] Hook is enabled but missing required `channelName` prop. Presence will not be tracked.');
  }

  // Effect for fetching/simulating initial presence state
  useEffect(() => {
    // Suggestion 1: Check enabled flag and channelName presence
    if (!channelName || !enabled) {
      setIsLoading(false);
      // Reset state if disabled or channelName is removed
      setPresentUsers(initialPresence ?? []);
      setTypingUsers((initialPresence ?? []).filter(user => user.status === 'typing'));
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    // Reset states based on potentially new initialPresence for this channel/enabled state
    setPresentUsers(initialPresence ?? []);
    setTypingUsers((initialPresence ?? []).filter(user => user.status === 'typing'));


    // Simulate API call or initial subscription setup with timeout
    const timer = setTimeout(() => {
      try {
        // Convert channelName to a conversationId for mock data lookup (adjust if needed)
        // This assumes mockPresenceData keys are derived from channel names like 'channel-foo' -> 'foo'
        const conversationId = channelName.startsWith('channel-')
          ? channelName.substring('channel-'.length)
          : channelName; // Basic fallback if prefix isn't there

        const fetchedPresenceData = mockPresenceData[conversationId] || [];

        // In a real scenario, you might merge initialPresence with fetched data carefully.
        // For mock, we'll just replace with the fetched data.
        setPresentUsers(fetchedPresenceData);

        // Filter for typing users from the fetched data
        setTypingUsers(fetchedPresenceData.filter(user => user.status === 'typing'));

        setIsLoading(false);

        if (process.env.NODE_ENV === 'development') {
          console.debug(`[usePresence] Mock presence loaded for channel "${channelName}":`, { present: fetchedPresenceData.length, typing: fetchedPresenceData.filter(user => user.status === 'typing').length });
        }

      } catch (err) {
        console.error(`[usePresence] Error processing mock presence for channel "${channelName}":`, err);
        setError(err instanceof Error ? err : new Error('Failed to fetch presence data'));
        setIsLoading(false);
      }
    }, 500); // Simulate network delay

    // Cleanup function to clear the timeout if dependencies change before completion
    return () => clearTimeout(timer);

  }, [channelName, enabled, initialPresence]); // Rerun if channelName, enabled status, or initialPresence ref changes

  // Suggestion 3: Effect for simulating realtime typing indicators (Dev Only)
  useEffect(() => {
    // Only run if enabled, simulating, and we have some users to work with
    if (!enabled || !simulateTyping || presentUsers.length === 0 || !channelName) {
      return;
    }

    if (process.env.NODE_ENV !== 'development') {
        console.warn('[usePresence] `simulateTyping` is enabled in a non-development environment. This should typically be used for dev/testing only.');
    }

    const interval = setInterval(() => {
      setTypingUsers(prevTyping => {
        if (prevTyping.length > 0) {
          // If someone is typing, make them stop
          if (process.env.NODE_ENV === 'development') {
             console.debug(`[usePresence] Simulating typing stop on channel "${channelName}"`);
          }
          return [];
        } else {
          // If no one is typing, find the first non-bot 'online' user to start typing
          const potentialTyper = presentUsers.find(u => u.status === 'online' && !u.userId.startsWith('agent-')); // Example: Don't make bots type
          if (potentialTyper) {
              if (process.env.NODE_ENV === 'development') {
                  console.debug(`[usePresence] Simulating typing start for user "${potentialTyper.userId}" on channel "${channelName}"`);
              }
              // Create a *new* object reference for the typing user state
              return [{ ...potentialTyper, status: 'typing' }];
          }
          return []; // No one available to type
        }
      });
    }, 4000); // Cycle typing status every 4 seconds

    // Cleanup function to clear the interval
    return () => clearInterval(interval);

  }, [channelName, enabled, simulateTyping, presentUsers]); // Rerun simulation logic if these change

  return {
    presentUsers,
    typingUsers,
    isLoading,
    error,
  };
}

// TODO (Presence - Brief 4.7): Implement real presence tracking using Supabase Realtime
// - Establish connection using `supabase.channel(channelName)`.
// - Use `.on('presence', { event: 'sync' }, () => setState(channel.presenceState()))` for initial state.
// - Use `.on('presence', { event: 'join' }, ({ key, newPresences }) => ...)` to handle users joining.
// - Use `.on('presence', { event: 'leave' }, ({ key, leftPresences }) => ...)` to handle users leaving.
// - Implement `.track({ user: userId, online_at: timestamp, status: 'online' | 'typing' })` on mount/focus.
// - Implement `.track({ status: 'typing' })` when user types and `.track({ status: 'online' })` after debounce.
// - Subscribe using `.subscribe((status) => ...)` and handle status changes/errors (implement reconnection).
// - Ensure Supabase RLS policies allow presence reads/writes for the channel.
// - Unsubscribe/remove channel `.unsubscribe()` or `.removeChannel()` on component unmount.

// Added newline at end of file