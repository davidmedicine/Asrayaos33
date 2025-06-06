"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useTransition,
  useDeferredValue,
} from "react";
import { useQuery, useQueryClient, QueryKey } from "@tanstack/react-query";
import { shallow } from "zustand/shallow";
import { useRouter } from "next/navigation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { FlipState } from "gsap/Flip";

import { supabase } from "@/lib/supabase_client/client";
import { getFlameStatus } from "@/lib/api/getFlameStatus";
import {
  useQuestStore,
  Quest as BaseQuest,
  useSafeSetActiveQuestId,
} from "@/lib/state/slices/questslice";
import { useAuth } from "../AuthContext";
import {
  FIRST_FLAME_RITUAL_SLUG,
  AppRoutes,
  QUEST_QUERY_GC_TIME,
  QUEST_QUERY_STALE_TIME,
  sortQuests,
  UIPanelPhase,
  VIRTUALIZATION_THRESHOLD,
  QUESTS_QUERY_KEY,
} from "./unifiedChatListPanelConstants";
import { announceToSR } from "@/lib/accessibilityUtils";
import { seedFirstFlame } from "@/lib/temporal_client"; // 🚩 Temporal client wrapper
import { fetchQuestList } from "@/lib/api/quests";
import { FIRST_FLAME_QUERY_KEY } from "@flame";

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
// keyListQuests removed as per diff implication (usage replaced by QUESTS_QUERY_KEY)
const keyFlameStatus = (uid?: string): QueryKey =>
  uid ? [...FIRST_FLAME_QUERY_KEY, uid] : FIRST_FLAME_QUERY_KEY;

const mapQuest = (row: QuestPayloadFromServer): Quest | null => {
  if (!row.id || !row.name || !row.slug) return null;
  return {
    ...row,
    createdAt: new Date(row.created_at).getTime(),
    isFirstFlameRitual: row.slug === FIRST_FLAME_RITUAL_SLUG,
  };
};

const buildFlameStatusQueryOpts = (uid: string) =>
  ({
    queryKey: keyFlameStatus(uid),
    queryFn: async () => {
      if (uid === "anon") throw new SilentError("anon");
      const { flameStatus } = await getFlameStatus("ember");
      return { overallProgress: null, flameStatus } as any;
    },
    staleTime: Infinity as const,
    gcTime: QUEST_QUERY_GC_TIME as const,
  }) as const;

/* -------------------------------------------------------------------------- */
/* Hook: useUnifiedChatPanelData                                              */
/* -------------------------------------------------------------------------- */
export const useUnifiedChatPanelData = ({
  initialQuestSlugToSelect,
  panelId, // assumed stable
}: {
  initialQuestSlugToSelect?: string | null;
  panelId: string;
}) => {
  const router = useRouter();
  const qc = useQueryClient();
  const { userId, isLoadingAuth, authError } = useAuth();

  const activeQuestId = useQuestStore((s) => s.activeQuestId);
  const setActiveQuestId = useSafeSetActiveQuestId();

  /* ---------------- Local state ---------------- */
  const [uiPhase, setUiPhase] = useState<UIPanelPhase>(UIPanelPhase.INTRO);
  const [errorDisplay, setErrorDisplay] = useState<{
    message: string;
    code?: any;
  } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const deferredSearchInput = useDeferredValue(searchInput);
  const [_isPendingTransitionSearch, startTransition] = useTransition(); // Renamed by diff (_isPendingSearch -> _isPendingTransitionSearch)

  const hasDoneInitialAutoSelect = useRef(false);
  const hasBootstrappedWhenEmpty = useRef(false);
  const heroButtonFlipStateRef = useRef<FlipState | null>(null);

  const prevListQDataForQuestsMemoRef = useRef<{
    rawData: Quest[] | undefined;
    sortedQuests: Quest[];
  }>({ rawData: undefined, sortedQuests: [] });

  /* ---------------- Queries ---------------- */
  const listQ = useQuery({
    queryKey: QUESTS_QUERY_KEY,
    enabled: !!userId && !isLoadingAuth && !authError,
    staleTime: QUEST_QUERY_STALE_TIME,
    gcTime: QUEST_QUERY_GC_TIME,
    placeholderData: (prev) => prev,
    queryFn: fetchQuestList,
    select: (res: ListQuestsResponse) => ({
      quests: res.data.map(mapQuest).filter((q): q is Quest => Boolean(q)),
      serverTimestamp: res.serverTimestamp,
    }),
    onSuccess: (data) => {
      useQuestStore.getState().setLastSynced(Date.parse(data.serverTimestamp));
    },
    retry: (cnt, err) =>
      !(err instanceof SilentError) &&
      cnt < 2 &&
      !(
        err instanceof FunctionsHttpError && (err.context?.status ?? 500) < 500
      ),
    retryDelay: (attempt) =>
      Math.min(2 ** attempt * 1000 + Math.random() * 200, 30_000),
  });

  // Preload flame‑status (disabled by default)
  useQuery({ ...buildFlameStatusQueryOpts(userId ?? "anon"), enabled: false });

  /* ---------------- Derived: quests (stable ref) ---------------- */
  const quests = useMemo(() => {
    const currentRaw = listQ.data?.quests;
    const { rawData: prevRaw, sortedQuests: prevSorted } =
      prevListQDataForQuestsMemoRef.current;
    if (prevRaw && currentRaw && shallow(prevRaw, currentRaw))
      return prevSorted;
    const sorted = (currentRaw ?? []).slice().sort(sortQuests);
    if (
      process.env.NODE_ENV !== "production" &&
      sorted[0] &&
      sorted[0].slug !== FIRST_FLAME_RITUAL_SLUG
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[useUnifiedChatPanelData] Expected first quest to be ${FIRST_FLAME_RITUAL_SLUG}, got ${sorted[0].slug}`,
      );
    }
    prevListQDataForQuestsMemoRef.current = {
      rawData: currentRaw,
      sortedQuests: sorted,
    };
    return sorted;
  }, [listQ.data?.quests]);

  const questsArray = quests ?? [];

  async function bootstrapFirstFlame() {
    if (!userId) return;
    try {
      await seedFirstFlame({ userId });
      qc.invalidateQueries({ queryKey: keyFlameStatus(userId) });
      await qc.fetchQuery(buildFlameStatusQueryOpts(userId));
      // qc.invalidateQueries({ queryKey: QUESTS_QUERY_KEY }); // Comment updated by diff
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[bootstrapFirstFlame] failed", err);
      setErrorDisplay({
        message: err instanceof Error ? (err as Error).message : "An unknown error occurred.",
      });
    }
  }

  async function selectQuestSafely(id: string | null) {
    if (!id) return setActiveQuestId(null);
    const quest = questsArray.find((q) => q.id === id);
    if (!quest) return;

    startTransition(() => setActiveQuestId(id));
    if (quest.isFirstFlameRitual) await maybeRedirectToRitualDayOne();
  }

  useEffect(() => {
    if (
      !listQ.isSuccess ||
      questsArray.length !== 0 ||
      hasBootstrappedWhenEmpty.current
    )
      return;

    hasBootstrappedWhenEmpty.current = true;

    void (async () => {
      await bootstrapFirstFlame();
      await qc.invalidateQueries({
        queryKey: QUESTS_QUERY_KEY,
        exact: true,
      });
      await listQ.refetch();
      await selectQuestSafely(FIRST_FLAME_RITUAL_SLUG);
      router.replace(AppRoutes.RitualDayOne);
    })();
  }, [
    listQ.isSuccess,
    questsArray.length,
    qc,
    listQ.refetch,
    router,
  ]);

  /* ---------------- Phase calculation (memoised) ---------------- */
  const nextPhase = useMemo(() => {
    // Variable name `calculatedNextPhase` in diff, `nextPhase` in base. Sticking to `nextPhase` from base for minimal change if logic is same. Diff's logic for phase is identical.
    if (listQ.isPending || isLoadingAuth) return UIPanelPhase.INTRO;
    if (listQ.isError && !(listQ.error instanceof SilentError))
      return UIPanelPhase.ERROR;
    if (!listQ.data?.quests) return uiPhase;
    return listQ.data.quests.length
      ? UIPanelPhase.NORMAL
      : UIPanelPhase.ONBOARDING;
  }, [
    listQ.isPending,
    isLoadingAuth,
    listQ.isError,
    listQ.error,
    listQ.data?.quests,
    uiPhase,
  ]);

  useEffect(() => {
    if (nextPhase !== uiPhase) setUiPhase(nextPhase);
  }, [nextPhase, uiPhase]);

  /* ---------------- Actions ---------------- */
  const maybeRedirectToRitualDayOne = useCallback(async () => {
    if (!userId) return;
    try {
      const { overallProgress } = await qc.fetchQuery(
        buildFlameStatusQueryOpts(userId),
      );
      if (!overallProgress) return;
      if (overallProgress.current_day_target !== 1) return;

      router.replace(AppRoutes.RitualDayOne);
      announceToSR("Navigating to First Flame – Day 1", {
        politeness: "assertive",
      });
    } catch (error) {
      if (!(error instanceof SilentError)) {
        console.error("Failed to fetch flame status for redirect:", error);
      }
    }
  }, [qc, router, userId]);


  const handleRetryLoad = useCallback(() => {
    setErrorDisplay(null); // Added by diff
    qc.invalidateQueries({ queryKey: QUESTS_QUERY_KEY }); // Changed by diff
  }, [qc, userId]); // userId kept in deps as per diff, though QUESTS_QUERY_KEY might be static.

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    [],
  );

  /**
   * 🔥 bootstrapFirstFlame
   * Kicks Temporal worker to seed ritual rows, then refetches flame‑status.
   */

  /**
   * Called after the user hits the First‑Flame CTA. Boots the ritual on the
   * backend, prefetches Day 1 data and navigates to the ritual screen once
   * ready.
   */
  const handleBeginFirstFlame = useCallback(async () => {
    await bootstrapFirstFlame();

    if (userId) {
      try {
        await qc.prefetchQuery(buildFlameStatusQueryOpts(userId));
      } catch (err) {
        if (!(err instanceof SilentError)) {
          // eslint-disable-next-line no-console
          console.error("[handleBeginFirstFlame] prefetch failed", err);
        }
      }
    }

    const flameQuest = questsArray.find((q) => q.isFirstFlameRitual);
    if (flameQuest && !hasDoneInitialAutoSelect.current) {
      void selectQuestSafely(flameQuest.id);
      hasDoneInitialAutoSelect.current = true;
    }

    router.replace(AppRoutes.RitualDayOne);
  }, [userId, qc, questsArray, router]);

  /* ------------- Auto‑select & prefetch once data is ready ----------- */
  useEffect(() => {
    if (
      hasDoneInitialAutoSelect.current ||
      listQ.isPending ||
      !questsArray.length ||
      !userId
    )
      return;
    
    // Check if activeQuestId is already set and exists in questsArray
    if (activeQuestId && questsArray.some(q => q.id === activeQuestId)) {
      console.log("[useUnifiedChatPanelData] Using existing activeQuestId:", activeQuestId);
      hasDoneInitialAutoSelect.current = true;
      
      // If it's the First Flame, check if we need to redirect
      const quest = questsArray.find(q => q.id === activeQuestId);
      if (quest?.isFirstFlameRitual) void maybeRedirectToRitualDayOne();
      return;
    }

    const explicit = initialQuestSlugToSelect
      ? questsArray.find((q) => q.slug === initialQuestSlugToSelect)
      : undefined;
    const target =
      explicit ||
      questsArray.find((q) => q.isFirstFlameRitual) ||
      questsArray[0];

    if (target) {
      console.log("[useUnifiedChatPanelData] Auto-selecting target quest:", target.id, target.slug);
      void selectQuestSafely(target.id);
    }
    hasDoneInitialAutoSelect.current = true;

    // Check query state before prefetching to avoid redundant calls
    if (!qc.getQueryState(keyFlameStatus(userId ?? "anon"))) {
      void qc.prefetchQuery(buildFlameStatusQueryOpts(userId ?? "anon"));
    }
  }, [
    activeQuestId,
    initialQuestSlugToSelect,
    listQ.isPending,
    questsArray,
    qc,
    userId,
    maybeRedirectToRitualDayOne,
  ]);

  /* ------------- Error Display Effect for listQ query ----------- */
  const prevErr = useRef<{ message: string; code?: number } | null>(null);
  useEffect(() => {
    if (listQ.isError && !(listQ.error instanceof SilentError)) {
      const message =
        listQ.error instanceof Error
          ? listQ.error.message
          : "Failed to load quests.";
      const code =
        listQ.error instanceof FunctionsHttpError
          ? listQ.error.context?.status
          : undefined;

      if (
        !prevErr.current ||
        prevErr.current.message !== message ||
        prevErr.current.code !== code
      ) {
        prevErr.current = { message, code };
        setErrorDisplay(prevErr.current);
      }
    } else if (!listQ.isError && errorDisplay) {
      prevErr.current = null;
      setErrorDisplay(null);
    }
  }, [listQ.isError, listQ.error]);

  /* ---------------- Filters & selectors ---------------- */
  const filteredQuests = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return questsArray;
    return questsArray.filter((q) => q.name.toLowerCase().includes(query));
  }, [questsArray, searchInput]);

  const shouldVirtualize = useMemo(
    () => filteredQuests.length >= VIRTUALIZATION_THRESHOLD,
    [filteredQuests.length],
  ); // .length added by diff
  // More accurate isPendingSearch: true if a search is typed but deferred value hasn't updated AND list is fetching
  // Or if the transition for selection is pending.
  // The original `_isPendingTransitionSearch` from `useTransition` was unused.
  // This `isPendingSearch` indicates if the displayed list might be stale due to active search input.
  const isPendingSearch =
    listQ.isFetching &&
    searchInput.trim().toLowerCase() !==
      deferredSearchInput.trim().toLowerCase();

  const listItemData = filteredQuests ?? [];

  /* ---------------- Return API ---------------- */
  return {
    uiPhase,
    errorDisplay,
    searchQuery: searchInput,
    isPendingSearch,

    quests: questsArray, // All available quests, sorted
    listItemData: listItemData as QuestForListItemAugmented[],

    firstFlameQuest: questsArray.find((q) => q.isFirstFlameRitual),
    activeQuestId,

    isLoadingAuth,
    isLoadingInitial: listQ.isPending && !hasDoneInitialAutoSelect.current,
    isLoadingBackground: listQ.isFetching && hasDoneInitialAutoSelect.current,

    shouldVirtualize,
    heroButtonFlipStateRef,

    /* actions */
    handleSearchChange,
    handleSelectQuest: selectQuestSafely,
    handleRetryLoad,
    bootstrapFirstFlame,
    handleBeginFirstFlame,
  };
};
