// src/features/hub/components/QuestListView.tsx

import React, {
    memo,
    useRef,
    useCallback,
    useState,
    useEffect,
    useMemo,
    useLayoutEffect,
  } from 'react';
  import { FixedSizeList, ListChildComponentProps } from 'react-window';
  import AutoSizer from 'react-virtualized-auto-sizer';
  import { SearchIcon, FlameIcon, PlusCircleIcon } from 'lucide-react'; // Added PlusCircleIcon
  
  // --- UI Components & Utilities ---
  import { cn } from '@/lib/utils';
  import { Spinner } from '@/components/ui/Spinner';
  import { Input } from '@/components/ui/Input';
  import { Button } from '@/components/ui/Button';
  import { QuestListItem, QuestForListItem as QuestForListItemType } from './QuestListItem'; // Assuming QuestForListItem is the prop type for QuestListItem
  
  // --- App-specific Imports ---
  import type { Quest, QuestForListItemAugmented } from './useUnifiedChatPanelData'; // Import core types
  import {
    ITEM_HEIGHT,
    // VIRTUALIZATION_THRESHOLD, // Not needed here, parent sends shouldVirtualize
    HEADER_MIN_HEIGHT_PX,
    SEARCH_BAR_VISIBILITY_THRESHOLD,
    FIRST_FLAME_RITUAL_SLUG, // For identifying the First Flame quest
  } from './unifiedChatListPanelConstants';
  import { announceToSR } from '@/lib/accessibilityUtils';
  
  // --- Component Props ---
  interface QuestListViewProps {
    panelId: string; // For generating unique ARIA IDs
    listItemData: QuestForListItemAugmented[]; // Data to render
    activeQuestId: string | null; // Currently selected quest
    handleSelectQuest: (id: string) => void; // Callback for selection
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Search input change
    searchQuery: string; // Current search query
    isLoadingBackground: boolean; // For background loading state
    isPendingSearch: boolean; // True if search filter is being applied (React Transition)
    isVtEnabled: boolean; // If View Transitions specific markup should be added
    shouldVirtualize: boolean; // Determines rendering strategy
    quests: Quest[]; // Full list of quests (for finding First Flame, etc.)
  
    // Callbacks for header actions
    onSelectFirstFlameFromHeader: () => void; // Specific for header First Flame button
    handleCreateNewQuest: () => void; // For header "New Quest" button
    handlePinQuest: (id: string, pinState: boolean) => void; // For pinning from QuestListItem
  
    // Refs passed from orchestrator for animation/DOM access
    questsTitleRef: React.RefObject<HTMLHeadingElement>;
    searchBarContainerRef: React.RefObject<HTMLDivElement>;
    headerFirstFlameButtonRef: React.RefObject<HTMLButtonElement>; // For First Flame button
    headerNewQuestButtonRef?: React.RefObject<HTMLButtonElement>; // Optional ref for New Quest button
  }
  
  // --- Data passed to each row in the virtualized list ---
  interface VirtualizedRowData {
    items: QuestForListItemAugmented[];
    activeQuestId: string | null;
    panelId: string;
    isVtEnabled: boolean;
    handleSelectQuest: (id: string) => void;
    handlePinQuest: (id: string, pinState: boolean) => void;
  }
  
  // --- Memoized Row Component for React Window (Virtualized List) ---
  const VirtualizedQuestRow: React.FC<ListChildComponentProps<VirtualizedRowData>> = memo(
    ({ index, style, data }) => {
      const {
        items,
        activeQuestId,
        panelId,
        isVtEnabled,
        handleSelectQuest,
        handlePinQuest,
      } = data;
      const questItem = items[index];
  
      if (!questItem) return null; // Should not happen with correct itemCount
  
      const isActive = activeQuestId === questItem.id;
      const questListItemId = `${panelId}-quest-item-${questItem.id}`;
      const questNameId = `${panelId}-quest-name-${questItem.id}`; // For aria-labelledby on option
  
      const renderContent = () => (
        <QuestListItem
          quest={questItem as QuestForListItemType} // Cast to what QuestListItem expects
          isActive={isActive}
          onClick={() => handleSelectQuest(questItem.id)}
          onPin={!questItem.isFirstFlameRitual ? () => handlePinQuest(questItem.id, !(questItem.metadata?.pinned ?? false)) : undefined}
          isPinned={questItem.metadata?.pinned ?? false}
          isFirstFlameRitual={questItem.isFirstFlameRitual}
          aria-selected={isActive} // Handled by listbox parent
          className={`h-[${ITEM_HEIGHT}px] flex-shrink-0 w-full`}
          data-testid={`quest-item-${questItem.id}`}
          // Pass nameId to QuestListItem so it can set it on its primary text element
          nameId={questNameId}
        />
      );
  
      return (
        // This div receives the style from react-window for positioning
        <div
          style={style}
          role="option"
          id={questListItemId} // Unique ID for this option
          aria-selected={isActive}
          aria-labelledby={questNameId} // Labelled by its own name
          // data-quest-row // Attribute for Flip animations (if Flip targets this directly)
        >
          {isVtEnabled && document.startViewTransition ? (
            <div
              style={{ viewTransitionName: `quest-item-${questItem.id}` }}
              className="h-full w-full"
              // id={questItem.id} // The logical item ID might be better here if different from list item ID
            >
              {renderContent()}
            </div>
          ) : (
            <div className="h-full w-full">
              {renderContent()}
            </div>
          )}
        </div>
      );
    }
  );
  VirtualizedQuestRow.displayName = 'VirtualizedQuestRow';
  
  // === Main List View Component ===
  const QuestListViewComponent: React.FC<QuestListViewProps> = ({
    panelId,
    listItemData,
    activeQuestId,
    handleSelectQuest,
    handleSearchChange,
    searchQuery,
    isLoadingBackground,
    isPendingSearch,
    isVtEnabled,
    shouldVirtualize,
    quests,
    onSelectFirstFlameFromHeader,
    handleCreateNewQuest,
    handlePinQuest,
    questsTitleRef,
    searchBarContainerRef,
    headerFirstFlameButtonRef,
    headerNewQuestButtonRef,
  }) => {
    const listContainerRef = useRef<HTMLDivElement>(null); // For the listbox container
    const fixedListRef = useRef<FixedSizeList>(null); // For react-window API
  
    // State for managing the ARIA active descendant (keyboard focus)
    const [activeDescendantIndex, setActiveDescendantIndex] = useState<number>(-1);
    const hasMounted = useRef(false); // To prevent effects on initial mount if not desired
  
    const firstFlameQuest = useMemo(
      () => quests.find((q) => q.slug === FIRST_FLAME_RITUAL_SLUG),
      [quests]
    );
  
    // --- ARIA Active Descendant ID ---
    const activeDescendantId = useMemo(() => {
      if (activeDescendantIndex >= 0 && activeDescendantIndex < listItemData.length) {
        return `${panelId}-quest-item-${listItemData[activeDescendantIndex].id}`;
      }
      return undefined;
    }, [activeDescendantIndex, listItemData, panelId]);
  
    // --- Effect to Sync Active Descendant with External Active Quest ID ---
    useEffect(() => {
      const currentGlobalActiveIndex = activeQuestId
        ? listItemData.findIndex((item) => item.id === activeQuestId)
        : -1;
  
      if (currentGlobalActiveIndex !== activeDescendantIndex) {
        setActiveDescendantIndex(currentGlobalActiveIndex);
        // Scroll to the newly active item if list is already mounted and visible
        if (hasMounted.current && currentGlobalActiveIndex !== -1 && fixedListRef.current) {
          fixedListRef.current.scrollToItem(currentGlobalActiveIndex, 'smart');
        }
      }
    }, [activeQuestId, listItemData, activeDescendantIndex]); // Removed fixedListRef from deps
  
    // --- Effect to Scroll to Keyboard-Focused Item ---
    useLayoutEffect(() => {
      if (activeDescendantIndex !== -1 && hasMounted.current) {
        if (shouldVirtualize && fixedListRef.current) {
          fixedListRef.current.scrollToItem(activeDescendantIndex, 'smart'); // 'smart' tries to keep it visible
        } else if (!shouldVirtualize && listContainerRef.current) {
          // For static list, scroll the item into view manually
          const activeItemElement = listContainerRef.current.querySelector(
            `#${panelId}-quest-item-${listItemData[activeDescendantIndex]?.id}`
          );
          activeItemElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }, [activeDescendantIndex, shouldVirtualize, listItemData, panelId]); // Re-run if index or virtualization strategy changes
  
    useEffect(() => {
      hasMounted.current = true;
    }, []);
  
    // --- Keyboard Navigation Handler for Listbox ---
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        const itemCount = listItemData.length;
        if (itemCount === 0) return;
  
        let newIndex = activeDescendantIndex;
        let shouldPreventDefault = true;
  
        switch (event.key) {
          case 'ArrowDown':
            newIndex = activeDescendantIndex === -1 ? 0 : Math.min(activeDescendantIndex + 1, itemCount - 1);
            break;
          case 'ArrowUp':
            newIndex = activeDescendantIndex === -1 ? itemCount - 1 : Math.max(activeDescendantIndex - 1, 0);
            break;
          case 'Home':
            newIndex = 0;
            break;
          case 'End':
            newIndex = itemCount - 1;
            break;
          case 'Enter':
          case ' ': // Space also selects
            if (activeDescendantIndex !== -1 && listItemData[activeDescendantIndex]) {
              handleSelectQuest(listItemData[activeDescendantIndex].id);
              // Announcement of selection should be handled by the hook or orchestrator via handleSelectQuest
            } else {
              shouldPreventDefault = false;
            }
            break;
          default:
            shouldPreventDefault = false;
            return; // Don't process other keys
        }
  
        if (shouldPreventDefault) {
          event.preventDefault();
        }
  
        if (newIndex !== activeDescendantIndex && newIndex >= 0 && newIndex < itemCount) {
          setActiveDescendantIndex(newIndex);
          // Announce focus change politely
          announceToSR(`Focused on ${listItemData[newIndex].name}.`, { politeness: 'polite' });
        }
      },
      [activeDescendantIndex, listItemData, handleSelectQuest]
    );
  
    // --- Data for Virtualized List Rows ---
    const virtualizedRowData = useMemo<VirtualizedRowData>(
      () => ({
        items: listItemData,
        activeQuestId,
        panelId,
        isVtEnabled,
        handleSelectQuest,
        handlePinQuest,
      }),
      [listItemData, activeQuestId, panelId, isVtEnabled, handleSelectQuest, handlePinQuest]
    );
  
    const showSearchBar = searchQuery || listItemData.length >= SEARCH_BAR_VISIBILITY_THRESHOLD;
  
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        {/* Header Section */}
        <div
          className="px-3 pt-3 pb-2 border-b border-border flex-shrink-0"
          style={{ minHeight: `${HEADER_MIN_HEIGHT_PX}px` }}
        >
          <div className="flex justify-between items-center mb-2">
            <h2
              ref={questsTitleRef}
              id={`${panelId}-heading`}
              className="text-lg font-semibold tracking-tight text-[var(--text-heading)]"
              data-testid="quest-list-title"
            >
              Quests
            </h2>
            <div className="flex items-center space-x-2">
              {firstFlameQuest && (
                <Button
                  ref={headerFirstFlameButtonRef}
                  variant="ghost"
                  size="sm"
                  onClick={onSelectFirstFlameFromHeader}
                  aria-label={`Begin ${firstFlameQuest.name}`}
                  title={`Begin ${firstFlameQuest.name}`}
                  className="text-primary hover:text-primary/90"
                  data-testid="header-first-flame-button"
                >
                  <FlameIcon className="h-4 w-4 mr-1.5" />
                  First Flame
                </Button>
              )}
              <Button
                  ref={headerNewQuestButtonRef}
                  variant="default"
                  size="sm"
                  onClick={handleCreateNewQuest}
                  aria-label="Start a new quest"
                  title="Start a new quest"
                  data-testid="header-new-quest-button"
              >
                  <PlusCircleIcon className="h-4 w-4 mr-1.5"/>
                  New Quest
              </Button>
            </div>
          </div>
          {showSearchBar && (
            <div ref={searchBarContainerRef} className="relative" data-testid="search-bar-container">
              <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search quests..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8 w-full"
                aria-label="Search quests"
                aria-controls={`${panelId}-listbox`} // Points to the listbox
              />
              {isPendingSearch && (
                <Spinner
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2"
                  size="small"
                  aria-label="Searching"
                />
              )}
            </div>
          )}
        </div>
  
        {/* List Content Section - The Listbox */}
        <div
          id={`${panelId}-listbox`} // ID for the listbox itself
          ref={listContainerRef}
          role="listbox"
          aria-labelledby={`${panelId}-heading`} // Labelled by the main "Quests" heading
          aria-activedescendant={activeDescendantId} // Points to the ID of the focused option
          tabIndex={0} // Makes the listbox container focusable
          onKeyDown={handleKeyDown} // Handles keyboard navigation
          className="flex-1 min-h-0 relative outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-b-md" // Styling for focus
          style={{ overflowY: 'auto' }} // Ensures it's scrollable
          data-testid="quest-list-container"
        >
          {/* Loading Indicator */}
          {isLoadingBackground && !isPendingSearch && (
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10"
              aria-live="polite"
              role="status"
            >
              <Spinner aria-label="Loading more quests" />
            </div>
          )}
  
          {/* Empty States */}
          {!isLoadingBackground && listItemData.length === 0 && (
            <div className="p-6 text-center text-muted-foreground" role="status">
              {searchQuery
                ? `No quests found matching "${searchQuery}".`
                : 'No quests available. Start a new one!'}
            </div>
          )}
  
          {/* Render List: Virtualized or Static */}
          {listItemData.length > 0 && (
            shouldVirtualize ? (
              // --- Virtualized List ---
              <AutoSizer>
                {({ height, width }) => (
                  <FixedSizeList
                    ref={fixedListRef}
                    height={height}
                    width={width}
                    itemCount={listItemData.length}
                    itemSize={ITEM_HEIGHT}
                    itemData={virtualizedRowData}
                    className="custom-scrollbar" // For custom scrollbar styles if any
                  >
                    {VirtualizedQuestRow}
                  </FixedSizeList>
                )}
              </AutoSizer>
            ) : (
              // --- Static List ---
              <div className="p-1 space-y-px">
                {listItemData.map((questItem, index) => {
                  const isActive = activeQuestId === questItem.id;
                  const isFocusedByKeyboard = activeDescendantIndex === index; // For visual keyboard focus indication
                  const questListItemId = `${panelId}-quest-item-${questItem.id}`;
                  const questNameId = `${panelId}-quest-name-${questItem.id}`;
  
                  const renderContent = () => (
                    <QuestListItem
                      quest={questItem as QuestForListItemType}
                      isActive={isActive}
                      // isFocused={isFocusedByKeyboard} // QuestListItem can use this for visual cues
                      onClick={() => handleSelectQuest(questItem.id)}
                      onPin={!questItem.isFirstFlameRitual ? () => handlePinQuest(questItem.id, !(questItem.metadata?.pinned ?? false)) : undefined}
                      isPinned={questItem.metadata?.pinned ?? false}
                      isFirstFlameRitual={questItem.isFirstFlameRitual}
                      className={`h-[${ITEM_HEIGHT}px] flex-shrink-0 w-full`}
                      data-testid={`quest-item-${questItem.id}`}
                      nameId={questNameId}
                    />
                  );
  
                  return (
                    // Each item wrapper in static list follows ARIA option pattern
                    <div
                      key={questItem.id}
                      role="option"
                      id={questListItemId}
                      aria-selected={isActive}
                      aria-labelledby={questNameId}
                      // Apply visual focus style if this item is the active descendant
                      className={cn({
                        'outline-none ring-2 ring-ring ring-offset-1': isFocusedByKeyboard && listContainerRef.current === document.activeElement,
                      })}
                      // data-quest-row // For Flip, if static rows are also targeted
                    >
                      {isVtEnabled && document.startViewTransition ? (
                        <div
                          style={{ viewTransitionName: `quest-item-${questItem.id}` }}
                          className="h-full w-full"
                        >
                          {renderContent()}
                        </div>
                      ) : (
                        <div className="h-full w-full">
                          {renderContent()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    );
  };
  
  QuestListViewComponent.displayName = 'QuestListView';
  export const QuestListView = memo(QuestListViewComponent);