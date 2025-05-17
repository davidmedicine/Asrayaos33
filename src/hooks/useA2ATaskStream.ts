// === File: src/hooks/useA2ATaskStream.ts ===
// Description: Hook to fetch and manage A2A task stream data, status, and artifacts.

import { useState, useEffect } from 'react';
import type { StreamEvent } from '@/types/stream'; // Assuming StreamEvent type exists
import type { QuestStatus, QuestOutput } from '@/types/quest'; // Import necessary types for status and artifacts
import { mockStreamEvents } from '@/lib/mock/chatMockData'; // Mock data source

// Define the properties the hook accepts
interface UseA2ATaskStreamProps {
  taskId?: string;
  enabled?: boolean; // Suggestion 1: Allow conditional fetching
  initialEvents?: StreamEvent[]; // Suggestion 2: Allow pre-seeding events
  simulateRealtime?: boolean; // Suggestion 3: Flag to simulate ongoing events
}

// Define the structure of the state and return value of the hook
// Renamed and updated based on feedback
interface A2ATaskStreamState {
  streamEvents: StreamEvent[];
  status: QuestStatus | null; // Correction: Added status
  artifacts: QuestOutput[]; // Correction: Added artifacts
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook to manage the stream of events, status, and artifacts for an A2A task.
 * Currently uses mock data and simulates fetching.
 *
 * @param props - Configuration options for the hook.
 * @param props.taskId - The ID of the task to stream data for.
 * @param props.enabled - Whether the hook should actively fetch/simulate (defaults to true).
 * @param props.initialEvents - Optional initial set of stream events.
 * @param props.simulateRealtime - Optional flag to simulate new events arriving over time.
 * @returns The state object including stream events, status, artifacts, loading state, and error.
 */
export function useA2ATaskStream({
  taskId,
  enabled = true, // Default enabled to true
  initialEvents,
  simulateRealtime = false, // Default simulateRealtime to false
}: UseA2ATaskStreamProps): A2ATaskStreamState {
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>(initialEvents ?? []);
  const [status, setStatus] = useState<QuestStatus | null>(null); // Correction: Added state for status
  const [artifacts, setArtifacts] = useState<QuestOutput[]>([]); // Correction: Added state for artifacts
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !!taskId); // Initial loading only if enabled and taskId exists
  const [error, setError] = useState<Error | null>(null);

  // Effect for initial fetch/simulation
  useEffect(() => {
    // Suggestion 1: Check enabled flag and taskId presence
    if (!taskId || !enabled) {
      // If not enabled or no taskId, reset to non-loading, potentially clear state if desired
      setIsLoading(false);
      // Optionally clear state if disabled after being enabled:
      // setStreamEvents(initialEvents ?? []);
      // setStatus(null);
      // setArtifacts([]);
      // setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    // Reset status/artifacts for new task fetch
    setStatus(null);
    setArtifacts([]);
    setStreamEvents(initialEvents ?? []); // Reset events based on initialEvents prop for this taskId


    // Simulate API call with timeout
    const timer = setTimeout(() => {
      try {
        // Filter mock events for the specified taskId
        const taskEvents = mockStreamEvents.filter(event => event.taskId === taskId);

        // Sort events by timestamp
        const sortedEvents = [...taskEvents].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        setStreamEvents(prevEvents => {
          // Merge initialEvents with fetched/sorted ones if initialEvents were provided
          // This simple merge might need adjustment based on real-world needs (e.g., avoiding duplicates)
          const combined = [...prevEvents, ...sortedEvents];
          // Deduplicate based on event ID if applicable, or just return sortedEvents if initialEvents shouldn't persist
          return sortedEvents; // Simplest approach for now: replace initial with fetched
        });

        // --- Correction: ADD MOCK STATUS/ARTIFACTS ---
        // Example mock logic: Status depends on events, artifacts on specific taskId
        const mockStatus: QuestStatus = sortedEvents.length > 0
          ? (sortedEvents[sortedEvents.length - 1].type === 'task_end' ? 'complete' : 'active') // Example: derive from last event
          : 'draft'; // Default if no events found
        const mockArtifacts: QuestOutput[] = taskId === 'a2a-task-abc-123' // Example ID check
          ? [{ artifactId: 'mock-artifact-generated', type: 'text', content: 'Mock output content' }]
          : [];

        setStatus(mockStatus);
        setArtifacts(mockArtifacts);
        // --- END CORRECTION ---

        setIsLoading(false);

        // Optional Improvement: Add logging in development
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useA2ATaskStream] Loaded mock data:', { sortedEvents, mockStatus, mockArtifacts });
        }

      } catch (err) {
        console.error("Error fetching/simulating A2A task stream:", err);
        setError(err instanceof Error ? err : new Error('Failed to process stream events'));
        setIsLoading(false);
        // TODO (UX): Add retry mechanism placeholder if needed
      }
    }, 500); // Simulate network delay

    // Cleanup function to clear the timeout if taskId/enabled changes before completion
    return () => clearTimeout(timer);

  }, [taskId, enabled, initialEvents]); // Rerun effect if taskId, enabled status, or initialEvents ref changes

  // Suggestion 3: Effect for simulating real-time updates (optional)
  useEffect(() => {
    if (!taskId || !enabled || !simulateRealtime) {
      return; // Only run if simulating is requested and hook is active
    }

    const interval = setInterval(() => {
      // Simulate adding a new event
      const newMockEvent: StreamEvent = {
        eventId: `evt-${Date.now()}`,
        taskId: taskId,
        timestamp: new Date().toISOString(),
        type: 'step_progress', // Example type
        payload: { message: `Simulated update at ${new Date().toLocaleTimeString()}` },
      };

      setStreamEvents(prev => [...prev, newMockEvent]);

      // Optionally update status based on simulated events
      setStatus('active'); // Keep status active during simulation

      if (process.env.NODE_ENV === 'development') {
        console.debug('[useA2ATaskStream] Simulated new event:', newMockEvent);
      }

    }, 3000); // Add a new event every 3 seconds

    // Cleanup function to clear the interval
    return () => clearInterval(interval);

  }, [taskId, enabled, simulateRealtime]); // Rerun if taskId, enabled status, or simulateRealtime flag changes

  // Correction: Return the full state including status and artifacts
  return { streamEvents, status, artifacts, isLoading, error };
}

// TODO (A2A - Brief 4.6): Implement real A2A stream subscription using SSE
// - Replace setTimeout simulation with actual EventSource connection.
// - Connect to LangGraph/A2A backend endpoint (e.g., /api/a2a/stream?taskId=...).
// - Handle server-sent events (SSE): parse event data, update state (streamEvents, status, artifacts).
// - Implement robust error handling and reconnection logic (e.g., exponential backoff).
// - Add real-time update handling based on incoming SSE messages.
// - Implement authentication and authorization checks if required for the stream endpoint.
// - Consider using a library like 'eventsource-parser' or managing EventSource lifecycle carefully.

// Potential Future Enhancement: Abstract SSE logic into a reusable useSSEStream hook.
// Potential Future Enhancement (Shared Abstraction): Combine with other quest-related hooks.