/* --------------------------------------------------------------------------
 *  Unified Chat‑List Panel (v2) – Lean & Resilient
 *  -------------------------------------------------------------------------
 *  – Orchestrates the “quest list” left‑hand pane of Asraya OS.
 *  – Switches between: intro hero • list • error.
 *  – Adds safety nets for unknown uiPhase and preserves dev‑tools friendliness.
 * -------------------------------------------------------------------------*/

'use client';

import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
} from 'react';

// ──────────────────── Shared Components ───────────────────
import { Panel } from '@/components/panels/Panel';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';

// ──────────────────── Utilities & Hooks ───────────────────
import { cn } from '@/lib/utils';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { useDevToolsStore } from '@/lib/state/slices/devToolsSlice';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { shallow } from 'zustand/shallow';

// ──────────────────── Feature‑local Imports ────────────────
import {
  useUnifiedChatPanelData,
} from './useUnifiedChatPanelData';
import { HeroIntroScreen } from './HeroIntroScreen';
import { QuestListView } from './QuestListView';
import { UIPanelPhase } from './unifiedChatListPanelConstants';

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */
export interface UnifiedChatListPanelProps {
  id: string;
  instanceId: string;
  className?: string;
  isActive?: boolean;
  alwaysVisible?: boolean;
  initialQuestSlugToSelect?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Implementation                                                              */
/* -------------------------------------------------------------------------- */
function UnifiedChatListPanelImpl({
  id: panelId,
  instanceId,
  className,
  isActive,
  alwaysVisible,
  initialQuestSlugToSelect,
}: UnifiedChatListPanelProps) {
  /* ----------------------------- Refs ---------------------------------- */
  const panelRef = useRef<HTMLDivElement>(null);
  const heroButtonRef = useRef<HTMLButtonElement>(null);
  const headerFirstFlameBtnRef = useRef<HTMLButtonElement>(null);
  const questsTitleRef = useRef<HTMLHeadingElement>(null);
  const searchBarContainerRef = useRef<HTMLDivElement>(null);

  /* ------------------------- Data & State ------------------------------ */
  const {
    /* UI */
    uiPhase,
    errorDisplay,

    /* Data */
    quests,
    listItemData,
    firstFlameQuest,
    activeQuestId,
    searchQuery,

    /* Loading */
    isLoadingInitial,
    isLoadingBackground,
    isRefetching,
    isPendingSearch,
    isInitialLoadComplete,

    /* Config */
    shouldVirtualize,

    /* Actions */
    handleSearchChange,
    handleSelectQuest,
    handleRetryLoad,
    bootstrapFirstFlame,
    handlePinQuest,
    handleCreateNewQuest,
  } = useUnifiedChatPanelData({
    panelId,
    initialQuestSlugToSelect,
  });

  /* ----------------------- View‑Transition Flag ------------------------ */
  const { enableViewTransition: devToolsVTEnabled } = useDevToolsStore(
    s => ({ enableViewTransition: s.enableViewTransition }),
    shallow,
  );
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const vtApiAvailable = typeof document !== 'undefined' && 'startViewTransition' in document;

  // Only meaningful for list phases – memoised.
  const isVtEnabled = useMemo(() => {
    const listPhases = [UIPanelPhase.NORMAL, UIPanelPhase.ONBOARDING];
    if (!listPhases.includes(uiPhase)) return false;
    return devToolsVTEnabled && vtApiAvailable && !prefersReducedMotion;
  }, [uiPhase, devToolsVTEnabled, vtApiAvailable, prefersReducedMotion]);

  /* ----------------------------- Meta ---------------------------------- */
  const panelMeta = useMemo(() => getPanelMeta('UnifiedChatListPanel'), []);

  /* --------------------------- Handlers -------------------------------- */
  const handleSelectFirstFlameFromHeader = useCallback(() => {
    if (firstFlameQuest) handleSelectQuest(firstFlameQuest.id);
  }, [firstFlameQuest, handleSelectQuest]);

  const handleSelectFirstFlameFromHero = useCallback(() => {
    firstFlameQuest ? handleSelectQuest(firstFlameQuest.id) : handleCreateNewQuest();
  }, [firstFlameQuest, handleSelectQuest, handleCreateNewQuest]);

  /* ------------------------ Early‑return Error ------------------------- */
  if (uiPhase === UIPanelPhase.ERROR) {
    return (
      <Panel
        id={panelId}
        instanceId={instanceId}
        panelMeta={panelMeta}
        className={cn('flex flex-col h-full', className)}
        isActive={isActive}
        alwaysVisible={alwaysVisible}
        ref={panelRef}
      >
        <div className="flex-1 flex items-center justify-center p-4">
          <ErrorDisplay
            title="Failed to Load Quests"
            message={errorDisplay?.message || 'Unknown error.'}
            code={errorDisplay?.code}
            type={errorDisplay?.type}
            onRetry={handleRetryLoad}
            retryButtonText="Try Again"
            className="w-full max-w-sm"
          />
        </div>
      </Panel>
    );
  }

  /* --------------------------- Panel Body ------------------------------ */
  const content = (() => {
    switch (uiPhase) {
      case UIPanelPhase.INTRO:
        return (
          <HeroIntroScreen
            uiPhase={uiPhase}
            isLoadingInitial={isLoadingInitial}
            errorDisplay={errorDisplay}
            firstFlameQuest={firstFlameQuest}
            isInitialLoadComplete={isInitialLoadComplete}
            questsAvailable={quests.length > 0}
            onBeginFirstFlame={handleSelectFirstFlameFromHero}
            bootstrapFirstFlame={bootstrapFirstFlame}
            onRetryLoad={handleRetryLoad}
            heroButtonRef={heroButtonRef}
          />
        );

      case UIPanelPhase.NORMAL:
      case UIPanelPhase.ONBOARDING:
        return (
          <QuestListView
            /* identifiers */
            panelId={panelId}
            /* data */
            listItemData={listItemData}
            activeQuestId={activeQuestId}
            quests={quests}
            searchQuery={searchQuery}
            shouldVirtualize={shouldVirtualize}
            /* loading */
            isLoadingBackground={isLoadingBackground || isRefetching}
            isPendingSearch={isPendingSearch}
            /* config */
            isVtEnabled={isVtEnabled}
            /* callbacks */
            handleSelectQuest={handleSelectQuest}
            handleSearchChange={handleSearchChange}
            onSelectFirstFlameFromHeader={handleSelectFirstFlameFromHeader}
            handlePinQuest={handlePinQuest}
            handleCreateNewQuest={handleCreateNewQuest}
            /* refs */
            questsTitleRef={questsTitleRef}
            searchBarContainerRef={searchBarContainerRef}
            headerFirstFlameButtonRef={headerFirstFlameBtnRef}
          />
        );

      default: // Safety net for future phases
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn(`[UnifiedChatListPanel] Unhandled uiPhase: ${String(uiPhase)}`);
        }
        return null;
    }
  })();

  /* ------------------------------- JSX --------------------------------- */
  return (
    <Panel
      id={panelId}
      instanceId={instanceId}
      panelMeta={panelMeta}
      className={cn(
        'flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden',
        className,
      )}
      data-testid="unified-chat-list-panel"
      isActive={isActive}
      alwaysVisible={alwaysVisible}
      ref={panelRef}
      role="region"
      aria-labelledby={`${panelId}-heading`}
    >
      {content}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Export – memoised + DevTools‑friendly name                                  */
/* -------------------------------------------------------------------------- */
UnifiedChatListPanelImpl.displayName = 'UnifiedChatListPanel';

export const UnifiedChatListPanel = memo(UnifiedChatListPanelImpl);
export default UnifiedChatListPanel;
