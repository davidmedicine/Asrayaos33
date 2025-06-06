/**
 * @file src/features/hub/components/ChatContextPanel.tsx
 * @description Refactored ChatContextPanel component for displaying quest-specific context.
 * This version integrates with Zustand for state management (questSlice, contextSlice, devToolsSlice),
 * uses TanStack Query v5 for data fetching, and incorporates View Transitions and GSAP animations
 * with accessibility and performance considerations.
 *
 * Implemented as per plan: [Link to relevant plan/issue, e.g., Jira, GitHub Issue, or planning document URL]
 * Date: 2023-10-27 // Update if necessary, this is from original
 */
'use client';

import React, {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
} from 'react';
// React's unstable ViewTransition for potential future use or if preferred over Next's
import { unstable_ViewTransition as ReactViewTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FlameStatusResponse } from '@flame';
import { fetchFlameStatus } from '@/lib/api/quests';
import { shallow } from 'zustand/shallow';

// GSAP and utilities
import { gsap, SplitText } from '@/lib/gsapSetup'; // Central GSAP import
import { cn } from '@/lib/utils';

// Components
import { Panel } from '@/components/panels/Panel';
import { SkeletonLine } from '@/components/ui/Skeleton';

// State management (Zustand stores)
import { useQuestStore, Quest } from '@/lib/state/slices/questslice';
import {
  useContextStore,
  selectQuestContextByQuestId,
  selectIsLoadingContextByQuestId,
  selectContextErrorByQuestId,
} from '@/lib/state/slices/contextSlice'; // Updated imports
import { useDevToolsStore } from '@/lib/state/slices/devToolsSlice';

// Static Data Import for Flame Quest
import day1Flame from '@flame'; // Preferred alias import for src/lib/shared/firstFlame.ts

// Panel Registry
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';

// Hooks
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Constants
// eslint-disable-next-line import/no-unresolved
// Path based on ChatContextPanel.tsx in src/features/hub/components/
// and unifiedChatListPanelConstants.ts in src/features/hub/components/leftpanel/
import { FIRST_FLAME_RITUAL_SLUG as FIRST_FLAME_SLUG } from './leftpanel/unifiedChatListPanelConstants';

// Type definitions for context data
export interface FlameDayTask {
  id: string;
  description: string;
  completed?: boolean;
}

export interface FlameDayDefinition {
  day: number;
  title: string;
  summary: string;
  tasks: FlameDayTask[];
}

export interface FlameQuestContext {
  type: 'flame';
  title: string;
  overallProgress: number;
  currentDay: number;
  dayDefinition: FlameDayDefinition;
}

export interface GenericQuestContext {
  type: 'generic';
  title: string;
  summary: string;
  details?: Record<string, string | number | boolean>;
}

export type QuestContext = FlameQuestContext | GenericQuestContext;

// Placeholder for DevToolsSliceState
interface DevToolsSliceStatePlaceholder {
  enableViewTransition: boolean;
  // other devtools flags
}


// Helper Components
const ContextPlaceholder: React.FC = memo(() => (
  <div
    role="status"
    className="flex flex-col items-center justify-center h-full text-center p-8 text-[var(--text-muted)]"
    data-testid="context-placeholder"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="80"
      height="80"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-scroll-text mb-4 opacity-50"
      aria-hidden="true"
    >
      <path d="M12 22h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1" />
      <path d="M18 22V4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12Z" />
      <path d="M14 8h-2" />
      <path d="M14 12h-4" />
      <path d="M14 16h-4" />
      <path d="M8 6h2" />
    </svg>
    <p aria-live="polite" aria-atomic="true">
      Select a quest to reveal its context and lore.
    </p>
  </div>
));
ContextPlaceholder.displayName = 'ContextPlaceholder';

const ContextSkeleton: React.FC = memo(() => (
  <div
    className="p-6 space-y-6 focusRing"
    aria-busy="true"
    aria-live="polite"
    data-testid="context-skeleton"
  >
    <SkeletonLine className="h-8 w-3/4 mb-2" />
    <SkeletonLine className="h-4 w-full" />
    <SkeletonLine className="h-4 w-5/6" />
    <div className="mt-6 space-y-3">
      <SkeletonLine className="h-6 w-1/2 mb-3" />
      <SkeletonLine className="h-5 w-full" />
      <SkeletonLine className="h-5 w-full" />
    </div>
    <div className="mt-6 space-y-3">
      <SkeletonLine className="h-6 w-1/2 mb-3" />
      <SkeletonLine className="h-10 w-full" />
      <SkeletonLine className="h-10 w-full" />
    </div>
  </div>
));
ContextSkeleton.displayName = 'ContextSkeleton';

// Panel State
type PanelState = 'resting' | 'loading' | 'loaded';

const ChatContextPanelComponent: React.FC<{
  id: string;
  className?: string;
  isActive?: boolean;
  alwaysVisible?: boolean;
  panelTitleId?: string;
}> = ({
  id: panelId,
  className,
  isActive,
  alwaysVisible,
  panelTitleId = 'chat-context-panel-heading',
}) => {
  const panelMeta = getPanelMeta('ChatContextPanel');
  const contentRef = useRef<HTMLDivElement>(null);

  const { activeQuestId, quests } = useQuestStore(
    (s) => ({ activeQuestId: s.activeQuestId, quests: s.quests }),
    shallow
  );

  // Read state from Zustand contextSlice using new selectors
  const questCtx = useContextStore(selectQuestContextByQuestId(activeQuestId));
  const isLoadingFromSlice = useContextStore(selectIsLoadingContextByQuestId(activeQuestId));
  const ctxErr = useContextStore(selectContextErrorByQuestId(activeQuestId));

  // Obtain action creators from the store
  const setQuestContext = useContextStore(s => s.setQuestContext, shallow);
  const setLoadingQuestContext = useContextStore(s => s.setLoadingQuestContext, shallow);
  const setErrorQuestContext = useContextStore(s => s.setErrorQuestContext, shallow);

  const enableViewTransition = useDevToolsStore(
    (s: DevToolsSliceStatePlaceholder) => s.enableViewTransition,
    shallow
  );
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [isGsapSafe, setIsGsapSafe] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const memory = (navigator as any).deviceMemory as number | undefined;
      const cores = navigator.hardwareConcurrency as number | undefined;
      if ((memory && memory < 2) || (cores && cores < 4)) {
        setIsGsapSafe(false);
      } else {
        setIsGsapSafe(true);
      }
    } else {
      setIsGsapSafe(true);
    }
  }, []);

  const activeQuest = useMemo(
    () => quests.find((q) => q.id === activeQuestId),
    [quests, activeQuestId]
  );

  const fetchQuestContextData = async (quest: Quest): Promise<QuestContext> => {
    if (quest.slug === FIRST_FLAME_SLUG) {
      return day1Flame as FlameQuestContext;
    }
    return Promise.resolve({
      type: 'generic',
      title: `Context: ${quest.name}`,
      summary: `Details and lore related to the quest "${quest.name}". This quest is of type "${quest.type}".`,
      details: {
        createdAt: new Date(quest.createdAt).toLocaleDateString(),
      },
    } as GenericQuestContext);
  };

  const flameQuery = useQuery<FlameStatusResponse>({
    queryKey: ['flameStatus', activeQuestId],
    enabled: !!activeQuestId && activeQuest?.slug === FIRST_FLAME_SLUG,
    queryFn: () => fetchFlameStatus(activeQuestId!),
    gcTime: 30 * 60_000,
    staleTime: 5 * 60_000,
    refetchInterval: (data) => data?.processing ? 1500 : false,
    onSuccess: (data) => {
      if (activeQuestId) {
        setQuestContext(activeQuestId, {
          overallProgress: data.overallProgress,
          dayDefinition: data.dayDefinition,
        });
        setLoadingQuestContext(activeQuestId, false);
        setErrorQuestContext(activeQuestId, null);
      }
    },
    onError: (err) => {
      if (activeQuestId) {
        setErrorQuestContext(activeQuestId, (err as Error).message);
        setLoadingQuestContext(activeQuestId, false);
        setQuestContext(activeQuestId, null);
      }
    },
  });

  const questCtxQuery = useQuery<QuestContext, Error>({
    queryKey: ['context', activeQuestId],
    queryFn: async () => {
      if (!activeQuest) {
        throw new Error('Active quest not found for context fetching.');
      }
      return fetchQuestContextData(activeQuest);
    },
    enabled: !!activeQuestId && !!activeQuest && activeQuest.slug !== FIRST_FLAME_SLUG,
    staleTime: 5 * 60_000, // 5 minutes
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      if (activeQuestId) {
        setQuestContext(activeQuestId, data);
        setLoadingQuestContext(activeQuestId, false);
        setErrorQuestContext(activeQuestId, null);
      }
    },
    onError: (err) => {
      if (activeQuestId) {
        setErrorQuestContext(activeQuestId, err.message);
        setLoadingQuestContext(activeQuestId, false);
        setQuestContext(activeQuestId, null);
      }
    },
  });

  useEffect(() => {
    if (activeQuestId && questCtxQuery.isPending && !isLoadingFromSlice) {
      setLoadingQuestContext(activeQuestId, true);
    }
  }, [activeQuestId, questCtxQuery.isPending, isLoadingFromSlice, setLoadingQuestContext]);

  useEffect(() => {
    if (
      activeQuestId &&
      activeQuest?.slug === FIRST_FLAME_SLUG &&
      flameQuery.isPending &&
      !isLoadingFromSlice
    ) {
      setLoadingQuestContext(activeQuestId, true);
    }
  }, [activeQuestId, activeQuest?.slug, flameQuery.isPending, isLoadingFromSlice, setLoadingQuestContext]);


  const currentPanelState: PanelState = useMemo(() => {
    // Log the panel state conditions
    console.log("[ChatContextPanel] Determining panel state:", {
      activeQuestId,
      hasQuestCtx: !!questCtx,
      hasFlameData: !!flameQuery.data,
      hasDayDefinition: !!flameQuery.data?.dayDefinition,
      hasOverallProgress: !!flameQuery.data?.overallProgress,
      isLoadingFromSlice,
      flameQueryLoading: flameQuery.isLoading,
      questCtxQueryLoading: questCtxQuery.isLoading,
      isProcessing: flameQuery.data?.processing
    });
    
    if (!activeQuestId) return 'resting';
    
    // PRIORITY 1: If we have a day definition, always show content immediately
    // Even if we're still in the processing state
    if (flameQuery.data?.dayDefinition) {
      console.log("[ChatContextPanel] Found day definition, showing loaded state");
      return 'loaded';
    }
    
    // PRIORITY 2: If we already have context data from any source, show it
    if (questCtx) return 'loaded';
    
    // PRIORITY 3: If we have partial data like overall progress, show loaded state
    // to avoid flickering back to loading state
    if (flameQuery.data?.overallProgress) {
      console.log("[ChatContextPanel] Found overall progress, showing loaded state");
      return 'loaded';
    }
    
    // PRIORITY 4: If we're actively loading data and have nothing to show
    if (isLoadingFromSlice || flameQuery.isLoading || questCtxQuery.isLoading) {
      console.log("[ChatContextPanel] Still loading data, showing loading state");
      return 'loading';
    }
    
    // PRIORITY 5: If we have an active quest ID but no data yet, still show loaded state
    // This shows the retry option or empty state for better UX than a perpetual loader
    console.log("[ChatContextPanel] No data yet, showing empty loaded state with retry option");
    return 'loaded';
  }, [activeQuestId, isLoadingFromSlice, questCtx, flameQuery.data, flameQuery.isLoading, questCtxQuery.isLoading]);

  useLayoutEffect(() => {
    if (
      currentPanelState === 'loaded' &&
      questCtx &&
      !ctxErr &&
      contentRef.current &&
      !prefersReducedMotion &&
      isGsapSafe
    ) {
      const mainContentArea = contentRef.current?.querySelector<HTMLElement>(
        '[data-testid="context-loaded-content"]'
      );
      if (!mainContentArea) return;

      const gsapCtx = gsap.context(() => {
        const headers = Array.from(mainContentArea.querySelectorAll<HTMLElement>('.section-header'));
        const paragraphs = Array.from(mainContentArea.querySelectorAll<HTMLElement>('.section-summary, .section-task-description'));

        if (headers.length > 0) {
          const splitHeaders = SplitText.create(headers, { type: 'lines,words', linesClass: 'split-line-outer' });
          gsap.from(splitHeaders.lines, {
            yPercent: 100,
            opacity: 0,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.1,
          });
        }

        if (paragraphs.length > 0) {
          gsap.from(paragraphs, {
            opacity: 0,
            y: 15,
            duration: 0.5,
            ease: 'power3.out',
            stagger: 0.07,
            delay: headers.length > 0 ? 0.2 : 0,
          });
        }
      }, mainContentArea);

      return () => gsapCtx.revert();
    }
  }, [currentPanelState, questCtx, ctxErr, prefersReducedMotion, isGsapSafe]);

  const renderResting = () => <ContextPlaceholder />;
  const renderLoading = () => <ContextSkeleton />;

  const renderLoaded = () => {
    if (ctxErr) {
      return (
        <div
          className="p-6 text-red-500 focusRing"
          role="alert"
          data-testid="context-error-message"
        >
          <h3 className="font-semibold section-header">Error Loading Context</h3>
          <p className="section-summary">{ctxErr}</p>
          <button 
            onClick={() => flameQuery.refetch()}
            className="mt-4 px-4 py-2 bg-[var(--bg-primary-dark)] text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-primary-hover)] transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    
    // Use partial data from flameQuery if available, even when questCtx is null
    if (!questCtx && flameQuery.data?.dayDefinition) {
      const dayDef = flameQuery.data.dayDefinition;
      return (
        <div className="p-6 space-y-6 custom-scrollbar focusRing" data-testid="context-loaded-from-partial">
          <header>
            <h2 className="text-2xl font-bold text-[var(--text-heading)] section-header" data-testid="context-title">
              Day {dayDef.ritualDay}: {dayDef.title}
            </h2>
            <p className="text-sm text-[var(--text-muted)] section-summary" data-testid="context-subtitle">
              {dayDef.subtitle}
            </p>
            {flameQuery.data.processing && (
              <div className="mt-2 text-amber-500 text-sm font-medium">
                Loading complete context...
              </div>
            )}
          </header>
          <section aria-labelledby="flame-theme-title">
            <h3 id="flame-theme-title" className="text-xl font-semibold text-[var(--text-primary)] mb-2 section-header">
              {dayDef.theme}
            </h3>
            <p className="text-[var(--text-secondary)] mb-4 section-summary">
              {dayDef.intention}
            </p>
          </section>
        </div>
      );
    }
    
    if (!questCtx) {
      return (
        <div
          className="p-6 text-[var(--text-muted)] focusRing"
          role="status"
          data-testid="context-no-data"
        >
          Context data is unavailable. Please select another quest or try again.
          <button 
            onClick={() => flameQuery.refetch()}
            className="mt-4 px-4 py-2 bg-[var(--bg-primary-dark)] text-[var(--text-primary)] rounded-md block hover:bg-[var(--bg-primary-hover)] transition-colors"
          >
            Retry Loading
          </button>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6 custom-scrollbar focusRing" data-testid="context-loaded-content">
        {questCtx.type === 'flame' && (
          <>
            <header>
              <h2 className="text-2xl font-bold text-[var(--text-heading)] section-header" data-testid="context-title">
                {questCtx.title} - Day {questCtx.currentDay}
              </h2>
              <p className="text-sm text-[var(--text-muted)] section-summary" data-testid="context-summary">
                Overall Progress: {questCtx.overallProgress}%
              </p>
            </header>
            <section aria-labelledby="flame-day-title">
              <h3 id="flame-day-title" className="text-xl font-semibold text-[var(--text-primary)] mb-2 section-header">
                {questCtx.dayDefinition.title}
              </h3>
              <p className="text-[var(--text-secondary)] mb-4 section-summary">
                {questCtx.dayDefinition.summary}
              </p>
              <ul className="space-y-2">
                {questCtx.dayDefinition.tasks.map((task) => (
                  <li key={task.id} className="p-3 border border-[var(--border-muted)] rounded-md section-task-description">
                    {task.description} ({task.completed ? 'Completed' : 'Pending'})
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
        {questCtx.type === 'generic' && (
          <>
            <header>
              <h2 className="text-2xl font-bold text-[var(--text-heading)] section-header" data-testid="context-title">
                {questCtx.title}
              </h2>
            </header>
            <p className="text-[var(--text-secondary)] section-summary" data-testid="context-summary">
              {questCtx.summary}
            </p>
            {questCtx.details && Object.keys(questCtx.details).length > 0 && (
              <section aria-labelledby="generic-details-title">
                <h3 id="generic-details-title" className="text-lg font-semibold text-[var(--text-primary)] mt-4 mb-2 section-header">
                  Additional Details
                </h3>
                <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] section-summary">
                  {Object.entries(questCtx.details).map(([key, value]) => ( // CORRECTED THIS LINE
                    <li key={key}>
                      <strong>{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {String(value)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    );
  };

  const panelContent = useMemo(() => {
    const keySuffix = activeQuestId || 'resting';
    switch (currentPanelState) {
      case 'resting':
        return <div key={`ctx-resting-${keySuffix}`}>{renderResting()}</div>;
      case 'loading':
        return <div key={`ctx-loading-${keySuffix}`}>{renderLoading()}</div>;
      case 'loaded':
        return <div key={`ctx-loaded-${keySuffix}-${questCtx?.type}-${!!ctxErr}`}>{renderLoaded()}</div>;
      default:
        return null;
    }
  }, [currentPanelState, activeQuestId, questCtx, ctxErr]);

  const FallbackViewTransitionWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <Fragment>{children}</Fragment>;

  const ViewTransitionComponent = useMemo(() => {
      if (
          enableViewTransition &&
          !prefersReducedMotion &&
          typeof ReactViewTransition === 'function' &&
          typeof document !== 'undefined' &&
          typeof (document as any).startViewTransition === 'function'
      ) {
          return ReactViewTransition;
      }
      return FallbackViewTransitionWrapper;
  }, [enableViewTransition, prefersReducedMotion]);


  return (
    <Panel
      id={panelId}
      title="Context"
      panelMeta={panelMeta}
      className={cn('flex flex-col h-full overflow-hidden focusRing', className)}
      isActive={isActive}
      alwaysVisible={alwaysVisible}
      panelTitleId={panelTitleId}
      data-testid="chat-context-panel"
    >
      <div
        ref={contentRef}
        className="flex-grow overflow-y-auto custom-scrollbar"
        aria-live="polite"
        data-testid="context-content-wrapper"
      >
        <ViewTransitionComponent>
          {panelContent}
        </ViewTransitionComponent>
      </div>
    </Panel>
  );
};

ChatContextPanelComponent.displayName = 'ChatContextPanel';

export default memo(ChatContextPanelComponent);

// Note on duplicated code removal:
// The instruction to "Delete everything from the second 'use client'; line down to the end of the file"
// refers to a duplicated `useUnifiedChatPanelData` hook. This duplicated code was not present
// in the provided code snippet for ChatContextPanel.tsx (which ends with the export default line above).
// If such duplicated code exists in your full file, it should be removed as per the original instructions.