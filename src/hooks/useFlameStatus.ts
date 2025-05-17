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
  import { fetchFlameStatus } from '@/lib/api/quests';
  import { useBoundStore } from '@/lib/state/store';
  // `FlameStatusPayload` must include `version: number | string` for comparison.
  import type { FlameStatusPayload } from 'supabase/functions/_shared/5dayquest/FirstFlame';
  
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
  
  export function useFlameStatus(): UseQueryResult<FlameStatusPayload, unknown> {
    const queryClient = useQueryClient();
    // Stable selectors for Zustand actions and version, preventing re-subscriptions.
    const hydrate = useBoundStore((s) => s.firstFlame._hydrateFromServer);
    const setError = useBoundStore((s) => s.firstFlame.setError); // Assumes setError signature matches SliceError
    const sliceVersion = useBoundStore((s) => s.firstFlame.version);
  
    // SSR/Offline: Listener to refetch data when the application comes back online.
    useEffect(() => {
      const handleOnline = () => {
        queryClient.invalidateQueries({ queryKey: ['flame-status'] });
      };
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }, [queryClient]); // queryClient is stable, effect runs once per component instance.
  
    return useQuery<
      FlameStatusPayload, // TQueryFnData: type returned by queryFn
      unknown,            // TError: type for errors, matches UseQueryResult
      FlameStatusPayload, // TData: type of data delivered to components
      readonly ['flame-status'] // TQueryKey: strictly typed query key
    >({
      queryKey: ['flame-status'],
      queryFn: fetchFlameStatus,
      staleTime: 0, // Ritual UX: Data is always considered stale, ensuring refetch on mount.
      refetchOnWindowFocus: true, // Ritual UX: Ensures progress updates if user worked in another tab. Explicit for audit.
      placeholderData: (previous) => previous, // UX: TanStack v5 pattern. Keeps old data visible, no UI flash.
      // SSR/Offline: Skip fetch if restoring from SSR hydration or if offline.
      enabled: !queryClient.isRestoring && (typeof navigator !== 'undefined' ? navigator.onLine : true),
      onSuccess: (data: FlameStatusPayload) => {
        // Silent Hydration: Update slice only if fetched data is newer.
        // Guard version check: `sliceVersion ?? 0` handles initial undefined/0 state.
        if (data.version && (sliceVersion ?? 0) < data.version) {
          hydrate(data);
        }
      },
      onError: (err: unknown) => { // Error Bubbling: Surface typed errors to Zustand slice.
        if (isSupabaseRpcError(err)) {
          setError({ type: 'supabase', status: err.status, message: err.message });
        } else if (err instanceof TypeError) { // TypeError often indicates network issues like "Failed to fetch".
          setError({ type: 'network', message: err.message });
        } else {
          setError({ type: 'unknown', message: String(err) });
        }
      },
    });
  }