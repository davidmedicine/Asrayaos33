/**
 * @file src/hooks/useFlameStatus.ts
 * @description React Query hook for Asraya OS's First-Flame ritual status.
 * Manages fetching and hydrating data into the `firstFlameSlice`.
 * Components use Zustand selectors; this hook is for data logic or direct
 * TanStack Query state (loading/error).
 *
 * `placeholderData: (prev) => prev`: Shows last data during refetch (no UI
 * flash), not cached as "true" data. Ideal for frequent updates per TanStack Query v5.
 * `initialData`: Seeds cache pre-fetch, can mark query fresh. Good for SSR.
 *
 * SSR & Offline: `queryClient.isRestoring` (React 19 Suspense hydration) skips
 * fetch during RSC hydration, relying on slice. `navigator.onLine` prevents
 * fetch if offline. An 'online' event listener (in `useEffect`) re-validates
 * when connection returns, ensuring data freshness.
 */

import {
  useQuery, useQueryClient, type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';
// Query helpers for First Flame status
import { fetchFlameStatus, FLAME_STATUS_QUERY_KEY } from '@/lib/api/quests';
import { FIRST_FLAME_QUEST_ID } from '@flame';
import { useBoundStore } from '@/lib/state/store';
// FlameStatusResponse should contain `dataVersion: number` (or similar) for version comparison.
import type { FlameStatusResponse } from '@/types/flame';

// Type for errors passed to the Zustand slice's setError action.
// This allows UI to branch on error types (e.g., show specific messages for RLS).
export type SliceError =
  | { type: 'supabase'; status: number; message: string }
  | { type: 'network'; message: string }
  | { type: 'unknown'; message: string };

// Type guard for Supabase-like errors (can be refined based on actual error structure)
// This helps ensure `err.status` and `err.message` exist before access.
function isSupabaseRpcError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === 'object' && err !== null &&
    typeof (err as { status?: unknown }).status === 'number' &&
    typeof (err as { message?: unknown }).message === 'string'
  );
}

// Exponential backoff retry delay function, matching API util if applicable.
// 1s, 2s, 4s, 8s, 16s, then capped at 20s.
const flameStatusRetryDelay = (attemptIndex: number): number => {
  return Math.min(1000 * 2 ** attemptIndex, 20000);
};

export function useFlameStatus(
  questId: string = FIRST_FLAME_QUEST_ID,
): UseQueryResult<FlameStatusResponse, unknown> {
  const queryClient = useQueryClient();
  // Stable selectors for Zustand actions and version, preventing re-subscriptions.
  const hydrate = useBoundStore((s) => s.firstFlame._hydrateFromServer);
  const setError = useBoundStore((s) => s.firstFlame.setError); // Assumes setError signature matches SliceError
  const sliceVersion = useBoundStore((s) => s.firstFlame.version); // Version from the Zustand slice

  // SSR/Offline: Listener to refetch data when the application comes back online.
  useEffect(() => {
    const handleOnline = () => {
      // Use the exported constant for the query key
      queryClient.invalidateQueries({ queryKey: FLAME_STATUS_QUERY_KEY });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]); // queryClient is stable, effect runs once per component instance.

  return useQuery<
    FlameStatusResponse, // TQueryFnData: type returned by queryFn
    unknown,             // TError: type for errors
    FlameStatusResponse, // TData: type of data delivered to components
    typeof FLAME_STATUS_QUERY_KEY // TQueryKey: strictly typed using the constant
  >({
    queryKey: FLAME_STATUS_QUERY_KEY, // Use the exported constant
    queryFn: () => fetchFlameStatus(questId),
    staleTime: 0, // Ritual UX: Data is always considered stale, ensuring refetch on mount.
    refetchOnWindowFocus: true, // Ritual UX: Ensures progress updates if user worked in another tab.
    placeholderData: (previous) => previous, // UX: TanStack v5 pattern. Keeps old data visible, no UI flash.
    // SSR/Offline: Skip fetch if restoring from SSR hydration or if offline.
    enabled: !queryClient.isRestoring && (typeof navigator !== 'undefined' ? navigator.onLine : true),
    retryDelay: flameStatusRetryDelay,
    // Default retry for React Query is 3 times for queryFn failures.
    refetchInterval: (data) => (data && (data as any).processing === true ? 2000 : false),

    onSuccess: (data: FlameStatusResponse) => {
      // Silent Hydration: Update slice only if fetched data is newer.
      // Use `data.dataVersion` (or the actual version field name from FlameStatusResponse).
      // Guard version check: `sliceVersion ?? 0` handles initial undefined/0 state.
      // Assumes FlameStatusResponse has a `dataVersion: number` field.
      if (typeof data.dataVersion === 'number' && (sliceVersion ?? 0) < data.dataVersion) {
        hydrate(data);
      }
    },
    onError: (err: unknown) => { // Error Bubbling: Surface typed errors to Zustand slice.

      if (isSupabaseRpcError(err)) {
        setError({ type: 'supabase', status: err.status, message: err.message });
      } else if (err instanceof TypeError) { // TypeError often indicates network issues like "Failed to fetch".
        setError({ type: 'network', message: err.message });
      } else {
        setError({ type: 'unknown', message: err instanceof Error ? err.message : String(err) });
      }
    },
  });
}