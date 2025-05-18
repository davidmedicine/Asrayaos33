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

import { supabase } from '@/lib/supabase_client/client';
import { useQuestStore, Quest as BaseQuest } from '@/lib/state/slices/questslice';
import { useAuth } from '../AuthContext';
import {
  FIRST_FLAME_RITUAL_SLUG,
  FIRST_FLAME_DAY_ONE_ROUTE,
  QUEST_QUERY_GC_TIME,
  QUEST_QUERY_STALE_TIME,
  sortQuests,
  UIPanelPhase,
  VIRTUALIZATION_THRESHOLD,
} from './unifiedChatListPanelConstants';
import { announceToSR } from '@/lib/accessibilityUtils';

/* ---------- Types ---------- */
export interface QuestPayloadFromServer {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface ListQuestsResponse {
  data: QuestPayloadFromServer[];
  serverTimestamp: string;
}

export interface FlameStatusResponse {
  overallProgress: { current_day_target: number } | null;
  error?: string;
}

export interface Quest extends BaseQuest {
  isFirstFlameRitual?: boolean;
}

export type QuestForListItemAugmented = Quest;

/* ---------- Helpers ---------- */
class SilentError extends Error {}
const keyListQuests = (uid?: string): QueryKey => ['list-quests', uid ?? 'anon'];
const keyFlameStatus = (uid?: string): QueryKey => ['flame-status', uid ?? 'anon'];

const mapQuest = (row: QuestPayloadFromServer): Quest | null => {
  if (!row.id || !row.name || !row.slug) return null;
  return {
    ...row,
    createdAt: new Date(row.created_at).getTime(),
    isFirstFlameRitual: row.slug === FIRST_FLAME_RITUAL_SLUG,
  };
};

const buildFlameStatusQueryOpts = (uid: string) => ({
  queryKey: keyFlameStatus(uid),
  queryFn: async () => {
    if (uid === 'anon') throw new SilentError('anon');
    const { data, error } = await supabase.functions.invoke<FlameStatusResponse>('get-flame-status');
    if (error) throw error;
    return data ?? { overallProgress: null };
  },
  staleTime: Infinity as const,
  gcTime: QUEST_QUERY_GC_TIME as const,
} as const);

/* -------------------------------------------------------------------------- */
/* Hook: useUnifiedChatPanelData                                              */
/* -------------------------------------------------------------------------- */
export const useUnifiedChatPanelData = ({
  initialQuestSlugToSelect,
  panelId,
}: {
  initialQuestSlugToSelect?: string | null;
  panelId: string;
}) => {
  const router = useRouter();
  const qc = useQueryClient();
  const { userId, isLoadingAuth, authError } = useAuth();

  const { activeQuestId, selectQuest } = useQuestStore(
    (s) => ({ activeQuestId: s.activeQuestId, selectQuest: s.selectQuest }),
    shallow
  );

  const [uiPhase, setUiPhase] = useState<UIPanelPhase>(UIPanelPhase.INTRO);
  const [errorDisplay, setErrorDisplay] = useState<{ message: string; code?: any } | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const deferredQuery = useDeferredValue(searchInput.trim().toLowerCase());
  const [isPendingSearch, startTransition] = useTransition();

  const hasDoneInitialAutoSelect = useRef(false);
  const heroButtonFlipStateRef = useRef<FlipState | null>(null);

  /* --------------------------- Queries -------------------------------- */
  const listQ = useQuery({
    queryKey: keyListQuests(userId),
    enabled: !!userId && !isLoadingAuth && !authError,
    staleTime: QUEST_QUERY_STALE_TIME,
    gcTime: QUEST_QUERY_GC_TIME,
    placeholderData: (prev) => prev,
    queryFn: async ({ queryKey }) => {
      const uid = queryKey[1] as string;
      if (uid === 'anon') throw new SilentError('not logged in');
      const { data, error } = await supabase.functions.invoke<ListQuestsResponse>('list-quests');
      if (error) throw error;
      if (!data || !Array.isArray(data.data)) throw new Error('bad payload');
      return data;
    },
    select: (resp) => resp.data.map(mapQuest).filter(Boolean) as Quest[],
    retry: (cnt, err) =>
      !(err instanceof SilentError) &&
      cnt < 2 &&
      !(err instanceof FunctionsHttpError && (err.context?.status ?? 500) < 500),
    retryDelay: (attempt) => Math.min(2 ** attempt * 1000 + Math.random() * 200, 30000),
  });

  // preload flame-status but fetch manually
  useQuery({
    ...buildFlameStatusQueryOpts(userId ?? 'anon'),
    enabled: false,
  });

  /* --------------------------- Actions --------------------------------- */
  const maybeRedirectToRitualDayOne = useCallback(async () => {
    if (!userId) return;
    const data = await qc.fetchQuery(buildFlameStatusQueryOpts(userId));
    if (data.overallProgress?.current_day_target === 1) {
      router.replace(FIRST_FLAME_DAY_ONE_ROUTE);
      announceToSR('Navigating to First Flame – Day 1', { politeness: 'assertive' });
    }
  }, [qc, router, userId]);

  const selectQuestSafely = useCallback(
    (id: string | null) => {
      if (!id) {
        selectQuest(null);
        return;
      }
      const quest = listQ.data?.find((q) => q.id === id);
      if (!quest) return;

      startTransition(() => {
        selectQuest(id);
        announceToSR(`Selected ${quest.name}.`);
        if (quest.isFirstFlameRitual) void maybeRedirectToRitualDayOne();
      });
    },
    [listQ.data, maybeRedirectToRitualDayOne, selectQuest]
  );

  const handleRetryLoad = useCallback(() => {
    qc.invalidateQueries({ queryKey: keyListQuests(userId) });
  }, [qc, userId]);

  /* ---------------- Phase Handling ----------------------------------- */
  useEffect(() => {
    if (listQ.isPending || isLoadingAuth) {
      if (uiPhase !== UIPanelPhase.INTRO) setUiPhase(UIPanelPhase.INTRO);
      return;
    }
    if (listQ.isError && !(listQ.error instanceof SilentError)) {
      setErrorDisplay({ message: (listQ.error as Error).message });
      if (uiPhase !== UIPanelPhase.ERROR) setUiPhase(UIPanelPhase.ERROR);
      return;
    }
    if (!listQ.data) return;
    const next = listQ.data.length > 0 ? UIPanelPhase.NORMAL : UIPanelPhase.ONBOARDING;
    if (uiPhase !== next) setUiPhase(next);
  }, [listQ.isPending, listQ.isError, listQ.data, listQ.error, isLoadingAuth, uiPhase]);

  useEffect(() => {
    if (
      hasDoneInitialAutoSelect.current ||
      listQ.isPending ||
      !listQ.data?.length
    ) {
      return;
    }

    const sorted = [...listQ.data].sort(sortQuests);
    const explicit = initialQuestSlugToSelect
      ? sorted.find((q) => q.slug === initialQuestSlugToSelect)
      : undefined;
    const target = explicit || sorted.find((q) => q.isFirstFlameRitual) || sorted[0];

    if (target) selectQuestSafely(target.id);
    hasDoneInitialAutoSelect.current = true;

    if (!qc.getQueryState(keyFlameStatus(userId))) {
      void qc.prefetchQuery(buildFlameStatusQueryOpts(userId ?? 'anon'));
    }
  }, [initialQuestSlugToSelect, listQ.isPending, listQ.data, qc, userId, selectQuestSafely]);

  /* ---------------- Derived Data ------------------------------------- */
  const quests = useMemo(() => (listQ.data ?? []).sort(sortQuests), [listQ.data]);

  const filteredQuests = useMemo(() => {
    if (!deferredQuery) return quests;
    return quests.filter((q) => q.name.toLowerCase().includes(deferredQuery));
  }, [quests, deferredQuery]);

  const shouldVirtualize = useMemo(
    () => filteredQuests.length >= VIRTUALIZATION_THRESHOLD,
    [filteredQuests]
  );

  return {
    uiPhase,
    errorDisplay,
    searchQuery: searchInput,
    isPendingSearch,

    quests,
    listItemData: filteredQuests,
    firstFlameQuest: quests.find((q) => q.isFirstFlameRitual),
    activeQuestId,

    isLoadingAuth,
    isLoadingInitial: listQ.isPending && !hasDoneInitialAutoSelect.current,
    isLoadingBackground: listQ.isFetching && hasDoneInitialAutoSelect.current,

    shouldVirtualize,
    heroButtonFlipStateRef,

    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value),
    handleSelectQuest: selectQuestSafely,
    handleRetryLoad,
  };
};
