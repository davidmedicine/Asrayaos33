'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useTransition,
  useDeferredValue,
} from 'react';
import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { shallow } from 'zustand/shallow';
import { useRouter } from 'next/navigation';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { FlipState } from 'gsap/Flip';

// --- External Project Imports (These remain as they are project-specific) ---
import { supabase } from '@/lib/supabase_client/client'; // Actual Supabase client
import { useQuestStore } from '@/lib/state/slices/questslice'; // Actual Zustand store hook
import { useAuth } from '../AuthContext'; // Actual Auth context hook

/* ---------- Inlined Constants (originally from ./unifiedChatListPanelConstants) ---------- */
// TODO: Verify these values match your project's configuration
const FIRST_FLAME_RITUAL_SLUG = 'first-flame-ritual';
const FIRST_FLAME_DAY_ONE_ROUTE = '/quests/first-flame/day-1'; // Example: '/app/first-flame/day-1'
const QUEST_QUERY_GC_TIME = 1000 * 60 * 30; // 30 minutes
const QUEST_QUERY_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const VIRTUALIZATION_THRESHOLD = 50; // Show this many items before virtualizing

export const UIPanelPhase = {
  INTRO: 'INTRO',
  NORMAL: 'NORMAL',
  ERROR: 'ERROR',
  ONBOARDING: 'ONBOARDING',
} as const;
export type UIPanelPhase = (typeof UIPanelPhase)[keyof typeof UIPanelPhase];

/* ---------- Inlined/Placeholder BaseQuest type (originally from @/lib/state/slices/questslice) ---------- */
// TODO: Ensure this matches your actual BaseQuest structure
export interface BaseQuest {
  id: string;
  name: string;
  slug: string;
  createdAt: number; // Timestamp (e.g., Date.getTime())
  // Add any other properties that are part of your BaseQuest from questslice
}

/* ---------- Inlined Helper: sortQuests (originally from ./unifiedChatListPanelConstants) ---------- */
// TODO: Implement your actual quest sorting logic here
const sortQuests = (a: Quest, b: Quest): number => {
  // Example: Prioritize First Flame, then sort by newest first
  if (a.isFirstFlameRitual && !b.isFirstFlameRitual) return -1;
  if (!a.isFirstFlameRitual && b.isFirstFlameRitual) return 1;
  return b.createdAt - a.createdAt;
};

/* ---------- Mock/Placeholder for announceToSR (originally from @/lib/accessibilityUtils) ---------- */
// TODO: Replace with your actual announceToSR import if needed, or keep this mock
const announceToSR = (message: string, options?: { politeness?: 'assertive' | 'polite' | 'off' }) => {
  if (typeof window !== 'undefined' && window.console) {
    console.log(`[SR announce (${options?.politeness || 'polite'})]: ${message}`);
  }
};

/* ---------- Mock/Placeholder for seedFirstFlame (originally from @/lib/temporal_client) ---------- */
// TODO: Replace with your actual seedFirstFlame import
// This is a 🚩 Temporal client wrapper in your original code
const seedFirstFlame = async (params: { userId: string }): Promise<void> => {
  if (typeof window !== 'undefined' && window.console) {
    console.log('[Mock] seedFirstFlame called with userId:', params.userId);
  }
  // Simulate an API call
  return new Promise(resolve => setTimeout(resolve, 500));
};


/* ---------- Types ---------- */
export interface QuestPayloadFromServer {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface ListQuestsResponse {
  data: QuestPayloadFromServer[];
  serverTimestamp: string; // Assuming this is part of the response
}

export interface FlameStatusResponse {
  overallProgress: { current_day_target: number } | null;
  error?: string;
}

export interface Quest extends BaseQuest {
  isFirstFlameRitual?: boolean;
}

export type QuestForListItemAugmented = Quest; // Alias for clarity if needed elsewhere


/* ---------- Helpers ---------- */
class SilentError extends Error {}

const keyListQuests = (uid?: string): QueryKey => ['list-quests', uid ?? 'anon'];
const keyFlameStatus = (uid?: string): QueryKey => ['flame-status', uid ?? 'anon'];

const mapQuest = (row: QuestPayloadFromServer): Quest | null => {
  if (!row.id || !row.name || !row.slug) return null;
  return {
    ...row, // Spreads id, name, slug
    createdAt: new Date(row.created_at).getTime(),
    isFirstFlameRitual: row.slug === FIRST_FLAME_RITUAL_SLUG,
  };
};

const buildFlameStatusQueryOpts = (uid: string) => ({
  queryKey: keyFlameStatus(uid),
  queryFn: async () => {
    if (uid === 'anon') throw new SilentError('anon'); // Should not query if anon
    const { data, error } = await supabase.functions.invoke<FlameStatusResponse>('get-flame-status');
    if (error) throw error;
    return data ?? { overallProgress: null };
  },
  staleTime: Infinity, // Data is very stable or manually invalidated
  gcTime: QUEST_QUERY_GC_TIME,
} as const); // `as const` here ensures the object is deeply readonly and types are literal


/* -------------------------------------------------------------------------- /
/ Hook: useUnifiedChatPanelData                                              /
/ -------------------------------------------------------------------------- */
export const useUnifiedChatPanelData = ({
  initialQuestSlugToSelect,
  panelId, // assumed stable
}: {
  initialQuestSlugToSelect?: string | null;
  panelId: string; // Used for potential unique behaviors or logging, currently unused in logic
}) => {
  const noop = () => {}; // guard for prod crashes or for optional Zustand setters

  const router = useRouter();
  const qc = useQueryClient();
  const { userId, isLoadingAuth, authError } = useAuth();

  // Ensure setActiveQuestId from Zustand store has a default noop if not provided
  const { activeQuestId, setActiveQuestId = noop } = useQuestStore(
    (s) => ({ activeQuestId: s.activeQuestId, setActiveQuestId: s.setActiveQuestId }),
    shallow,
  );

  /* ---------------- Local state ---------------- */
  const [uiPhase, setUiPhase] = useState<UIPanelPhase>(UIPanelPhase.INTRO);
  const [errorDisplay, setErrorDisplay] = useState<{ message: string; code?: any } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const deferredQuery = useDeferredValue(searchInput.trim().toLowerCase());
  const [_isPendingTransitionSearch, startTransition] = useTransition(); // Renamed _isPendingSearch for clarity

  const hasDoneInitialAutoSelect = useRef(false);
  const heroButtonFlipStateRef = useRef<FlipState | null>(null); // For GSAP Flip animations if used
  
  // Ref to store previous raw data and sorted quests to optimize useMemo for `quests`
  const prevListQDataForQuestsMemoRef = useRef<{ rawData: Quest[] | undefined; sortedQuests: Quest[] }>({
    rawData: undefined,
    sortedQuests: [],
  });

  /* ---------------- Queries ---------------- */
  const listQ = useQuery({
    queryKey: keyListQuests(userId),
    enabled: !!userId && !isLoadingAuth && !authError, // Only run if logged in and auth is settled
    staleTime: QUEST_QUERY_STALE_TIME,
    gcTime: QUEST_QUERY_GC_TIME,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    queryFn: async ({ queryKey }) => {
      const uid = queryKey[1] as string;
      if (uid === 'anon') throw new SilentError('User is not logged in.'); // Should be caught by `enabled`
      
      const { data, error } = await supabase.functions.invoke<ListQuestsResponse>('list-quests');
      if (error) throw error;
      if (!data || !Array.isArray(data.data)) throw new Error('Invalid data payload from list-quests');
      
      return data; // Return the full response
    },
    select: (response) => {
      // Map and filter quests from the response data
      return response.data.map(mapQuest).filter((q): q is Quest => q !== null);
    },
    retry: (failureCount, error) => {
      if (error instanceof SilentError) return false; // Don't retry for silent errors
      if (error instanceof FunctionsHttpError && (error.context?.status ?? 500) < 500) {
        return false; // Don't retry for client-side errors (4xx)
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
    retryDelay: (attemptIndex) => Math.min(2 ** attemptIndex * 1000 + Math.random() * 200, 30_000),
  });

  // Preload flame-status query (disabled by default, enabled on demand or by other logic)
  useQuery({ ...buildFlameStatusQueryOpts(userId ?? 'anon'), enabled: false });

  /* ---------------- Derived: quests (stable ref via custom memoization) ---------------- */
  const quests = useMemo(() => {
    const currentRawData = listQ.data;
    const { rawData: prevRawData, sortedQuests: prevSortedQuests } = prevListQDataForQuestsMemoRef.current;

    // If underlying data reference hasn't changed (common with placeholderData),
    // or if shallow comparison indicates no change in content, return previous sorted list.
    if (currentRawData === prevRawData || (prevRawData && currentRawData && shallow(prevRawData, currentRawData)) ) {
      return prevSortedQuests;
    }
    
    const sorted = (currentRawData ?? []).slice().sort(sortQuests); // Use .slice() to sort a copy
    prevListQDataForQuestsMemoRef.current = { rawData: currentRawData, sortedQuests: sorted };
    return sorted;
  }, [listQ.data]); // Dependency is listQ.data which changes when new data is fetched

  /* ---------------- Phase calculation (memoised) ---------------- */
  const calculatedNextPhase = useMemo(() => {
    if (listQ.isPending || isLoadingAuth) return UIPanelPhase.INTRO;
    if (listQ.isError && !(listQ.error instanceof SilentError)) return UIPanelPhase.ERROR;
    if (!listQ.data) return uiPhase; // No data yet, keep current phase (could be INTRO or previous state)
    return listQ.data.length > 0 ? UIPanelPhase.NORMAL : UIPanelPhase.ONBOARDING;
  }, [listQ.isPending, isLoadingAuth, listQ.isError, listQ.error, listQ.data, uiPhase]);

  useEffect(() => {
    if (calculatedNextPhase !== uiPhase) {
      setUiPhase(calculatedNextPhase);
    }
  }, [calculatedNextPhase, uiPhase]);

  /* ---------------- Actions ---------------- */
  const maybeRedirectToRitualDayOne = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await qc.fetchQuery(buildFlameStatusQueryOpts(userId));
      if (data.overallProgress?.current_day_target === 1) {
        router.replace(FIRST_FLAME_DAY_ONE_ROUTE);
        announceToSR('Navigating to First Flame – Day 1', { politeness: 'assertive' });
      }
    } catch (error) {
        if (!(error instanceof SilentError)) {
            console.error('Failed to fetch flame status for redirect:', error);
        }
    }
  }, [qc, router, userId]);

  const selectQuestSafely = useCallback(
    (questId: string | null) => {
      if (!questId) {
        setActiveQuestId(null);
        return;
      }
      const questToSelect = quests.find((q) => q.id === questId);
      if (!questToSelect) {
        console.warn(`Quest with id ${questId} not found for selection.`);
        return;
      }

      startTransition(() => {
        setActiveQuestId(questId);
        announceToSR(`Selected ${questToSelect.name}.`);
        if (questToSelect.isFirstFlameRitual) {
          void maybeRedirectToRitualDayOne();
        }
      });
    },
    [quests, setActiveQuestId, startTransition, maybeRedirectToRitualDayOne],
  );

  const handleRetryLoad = useCallback(() => {
    setErrorDisplay(null); // Clear previous error
    qc.invalidateQueries({ queryKey: keyListQuests(userId) });
  }, [qc, userId]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  /**
   * 🔥 bootstrapFirstFlame
   * Kicks Temporal worker (or relevant service) to seed ritual rows,
   * then refetches flame-status and potentially list-quests.
   */
  const bootstrapFirstFlame = useCallback(async () => {
    if (!userId) return;
    try {
      await seedFirstFlame({ userId }); // Call the (mocked or real) seed function
      // Invalidate and refetch flame status to get updated progress
      qc.invalidateQueries({ queryKey: keyFlameStatus(userId) });
      await qc.fetchQuery(buildFlameStatusQueryOpts(userId));
      // Optionally, invalidate and refetch quests if seeding adds a new quest
      // qc.invalidateQueries({ queryKey: keyListQuests(userId) });
    } catch (err) {
      console.error('[bootstrapFirstFlame] failed', err);
      setErrorDisplay({ message: err instanceof Error ? err.message : 'An unknown error occurred.' });
    }
  }, [userId, qc]);

  /* ------------- Auto-select & prefetch once data is ready ----------- */
  useEffect(() => {
    if (hasDoneInitialAutoSelect.current || listQ.isPending || !quests.length || !userId) return;

    let targetQuest: Quest | undefined = undefined;
    if (initialQuestSlugToSelect) {
      targetQuest = quests.find((q) => q.slug === initialQuestSlugToSelect);
    }
    if (!targetQuest) {
      targetQuest = quests.find((q) => q.isFirstFlameRitual) || quests[0];
    }

    if (targetQuest) {
      selectQuestSafely(targetQuest.id);
    }
    hasDoneInitialAutoSelect.current = true;

    // Prefetch flame status if not already fetched or fetching
    // Check query state before prefetching to avoid redundant calls
    if (!qc.getQueryState(keyFlameStatus(userId))) {
      void qc.prefetchQuery(buildFlameStatusQueryOpts(userId));
    }
  }, [initialQuestSlugToSelect, listQ.isPending, quests, qc, userId, selectQuestSafely]);
  
  /* ------------- Error Display Effect for listQ query ----------- */
  useEffect(() => {
    if (listQ.isError && !(listQ.error instanceof SilentError)) {
        const message = listQ.error instanceof Error ? listQ.error.message : 'Failed to load quests.';
        const code = listQ.error instanceof FunctionsHttpError ? listQ.error.context?.status : undefined;
        setErrorDisplay({ message, code });
    } else if (!listQ.isError && errorDisplay) {
        // Clear error if query is no longer in error state (e.g. after successful retry)
        // but only if the current errorDisplay is related to listQ (this is a simplification)
        setErrorDisplay(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQ.isError, listQ.error]); // errorDisplay is intentionally omitted to avoid loop if setErrorDisplay caused re-render

  /* ---------------- Filters & selectors ---------------- */
  const filteredQuests = useMemo(() => {
    if (!deferredQuery) return quests;
    return quests.filter((q) => q.name.toLowerCase().includes(deferredQuery));
  }, [quests, deferredQuery]);

  const shouldVirtualize = useMemo(
    () => filteredQuests.length >= VIRTUALIZATION_THRESHOLD,
    [filteredQuests.length],
  );

  // More accurate isPendingSearch: true if a search is typed but deferred value hasn't updated AND list is fetching
  // Or if the transition for selection is pending.
  // The original `_isPendingSearch` from `useTransition` was unused.
  // This `isPendingSearch` indicates if the displayed list might be stale due to active search input.
  const isPendingSearch = listQ.isFetching && searchInput.trim().toLowerCase() !== deferredQuery;


  /* ---------------- Return API ---------------- */
  return {
    uiPhase,
    errorDisplay, // For showing critical errors like quest list failing
    searchQuery: searchInput,
    isPendingSearch, // True if search input is being processed or results are loading due to search
    
    quests, // All available quests, sorted
    listItemData: filteredQuests as QuestForListItemAugmented[], // Quests filtered by search, ready for list rendering
    
    firstFlameQuest: quests.find((q) => q.isFirstFlameRitual),
    activeQuestId,

    isLoadingAuth, // Auth status loading
    isLoadingInitial: listQ.isPending && !hasDoneInitialAutoSelect.current, // Initial load of quests
    isLoadingBackground: listQ.isFetching && hasDoneInitialAutoSelect.current, // Background refresh of quests

    shouldVirtualize, // Flag for UI to switch to virtualized list
    heroButtonFlipStateRef, // Ref for GSAP animations on a specific button

    /* actions */
    handleSearchChange,
    handleSelectQuest: selectQuestSafely,
    handleRetryLoad, // Action to retry loading quests
    bootstrapFirstFlame, // Action to initiate the First Flame ritual
  };
};