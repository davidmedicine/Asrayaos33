// === File: src/features/chat/components/ConversationsPanel.tsx ===
// Description: Refactored conversation panel with virtualized list,
//  tabs and search, incorporating ultrathink QA pass 001 feedback.
// ===

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { shallow } from 'zustand/shallow';
import debounce from 'lodash.debounce'; // Import lodash debounce
import * as Tabs from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';
import { Panel } from '@/components/panels/Panel';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ConversationListItem,
  ConversationForListItem,
} from '../../hub/components/ConversationListItem';
// REMINDER: Ensure ConversationListItem is memoized, has role="listitem",
//           and its prop comments (esp. for isPinned) are up-to-date.
import { ConversationTabs } from './ConversationTabs';
import { SearchIcon } from '@/components/icons/SearchIcon';
import { OnlineFriendsShelf } from '@/components/ui/OnlineFriendsShelf';
import { ChannelListVirtuoso } from '@/features/channels/components/ChannelListVirtuoso';
import { durations, easings } from '@/lib/motiontokens'; // Import moved to top

// Hooks
import { useChatStore, useStore } from '@/lib/state/store';

// Types
import type { ConversationTabType } from '@/types/chat';
import type { Conversation } from '@/types'; // Use this strong type

// Placeholder for a toast notification system (e.g., react-hot-toast, react-toastify)
// import { toast } from 'react-hot-toast';
const toast = {
  error: (message: string) => console.error("Toast Error:", message), // Placeholder implementation
};


// --- Empty State Component ---
interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  isActionDisabled?: boolean;
  role?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  actionLabel,
  onAction,
  isActionDisabled = false,
  ...ariaProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // GSAP context for scoped animations and cleanup
    const ctx = gsap.context(() => {
      // Use matchMedia for respecting motion preferences
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: durations.normal,
            ease: easings.out,
          }
        );
      });
    }, containerRef);
    return () => ctx.revert(); // Cleanup GSAP animations on unmount
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center h-full text-center p-4"
      data-testid="empty-state"
      {...ariaProps} // Apply role="status", role="alert" etc.
    >
      {icon && (
        <div className="mb-3 text-[var(--text-muted)]">{icon}</div>
      )}
      <p className="text-sm text-[var(--text-muted)] mb-3">{message}</p>
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAction}
          disabled={isActionDisabled}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

// --- Main Component Props ---
interface ConversationsPanelProps {
  id: string;
  instanceId: string;
  className?: string;
}

// --- Main Component ---
export const ConversationsPanel = ({
  id,
  instanceId,
  className,
}: ConversationsPanelProps) => {
  const panelMeta = getPanelMeta('ConversationsPanel');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Get tab state directly from the store
  const selectedTab = useStore(state => state.selectedConversationTab);
  // Create a safe setter function that handles errors
  const setSelectedTab = useCallback((value: ConversationTabType) => {
    const setterFn = useStore.getState().setSelectedConversationTab;
    if (typeof setterFn !== 'function') {
      console.error('[ConversationsPanel] uiSlice is missing `setSelectedConversationTab`');
      return;
    }
    setterFn(value);
  }, []);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Debounce search query update using lodash.debounce (trailing edge)
  const debouncedSetSearchQuery = useMemo(
    () =>
      debounce((value: string) => {
        setSearchQuery(value);
      }, 150), // 150ms delay
    [] // Create debounce function once
  );

  useEffect(() => {
    debouncedSetSearchQuery(searchInputValue.trim());
    // Cleanup function: cancel pending debounced call if component unmounts or input changes again quickly
    return () => {
      debouncedSetSearchQuery.cancel();
    };
  }, [searchInputValue, debouncedSetSearchQuery]);

  // State from Zustand store - using shallow comparison
  const {
    activeChatId,
    conversations,
    isLoadingConversations,
    setActiveChatId,
    createConversation,
    error: chatError,
  } = useChatStore(
    (state) => ({
      activeChatId: state.activeChatId,
      conversations: state.conversations,
      isLoadingConversations: state.isLoadingConversations,
      setActiveChatId: state.setActiveChatId,
      createConversation: state.createConversation,
      error: state.error,
    }),
    shallow // Use shallow comparison for object selection
  );

  // Handle conversation selection
  const handleConversationSelect = useCallback(
    (conversationId: string) => {
      setActiveChatId(conversationId);
    },
    [setActiveChatId]
  );

  // Handle creating a new chat
  const handleCreateNewChat = useCallback(async () => {
    if (isCreatingChat) return;

    setIsCreatingChat(true);
    try {
      const newChatId = await createConversation({
        name: 'New Conversation',
        type: 'agent',
        // Assuming timestamp is set server-side or in createConversation
      });

      if (newChatId) {
        setActiveChatId(newChatId);
        if (selectedTab !== 'chats') {
          setSelectedTab('chats');
        }
        // Scroll to the newly created chat after state updates and render
        // Use setTimeout to defer until after the render cycle
        setTimeout(() => {
            virtuosoRef.current?.scrollToIndex({ index: 0, align: 'start' });
        }, 0);
      } else {
        console.warn('createConversation did not return a new chat ID.');
        // Use toast for user feedback on failure
        toast.error('Failed to create new chat. Please try again.');
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      // Use toast for user feedback on failure
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`Error creating chat: ${errorMessage}`);
    } finally {
      setIsCreatingChat(false);
    }
  }, [
    isCreatingChat,
    createConversation,
    setActiveChatId,
    selectedTab,
    setSelectedTab,
  ]);

  // Filter conversations based on the debounced search query and selected tab
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.name.toLowerCase().includes(lowercaseQuery) ||
          (conv.lastMessagePreview &&
            conv.lastMessagePreview.toLowerCase().includes(lowercaseQuery))
      );
    }

    // In the new tab structure, all conversations are shown in 'chats' tab
    // This filtering based on isPinned is no longer needed
    // We could add it back later if needed
    switch (selectedTab) {
      case 'chats':
      case 'channels':
      case 'online':
      default:
        break;
    }
    return filtered; // Sorting happens separately
  }, [conversations, searchQuery, selectedTab]);

  // Sort conversations by timestamp (newest first)
  const sortedConversations = useMemo(() => {
    // ASSUMPTION: Conversation.timestamp is consistently a number (epoch ms).
    // If it can be Date or null/undefined, add defensive checks back.
    return [...filteredConversations].sort((a, b) => {
      // Always keep pinned conversations at the top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Sort descending (newest first) based on numeric timestamp
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [filteredConversations]);


  // Compute counts for tab badges
  const tabCounts = useMemo(() => ({
    chats: conversations.length,
    channels: 0, // Will be populated from channelSlice in future
    online: 0, // Will be populated from presenceSlice in future
  }), [conversations]);

  // Handle tab changes
  const handleTabChange = useCallback((tab: ConversationTabType) => {
    setSelectedTab(tab);
  }, [setSelectedTab]);

  // Map sorted conversations to the format needed by ConversationListItem
  const listItemConversations: ConversationForListItem[] = useMemo(() => {
    return sortedConversations.map((conv: Conversation) => ({
      id: conv.id,
      name: conv.name,
      type: conv.type,
      timestamp: conv.timestamp,
      lastMessagePreview: conv.lastMessagePreview,
      unreadCount: conv.unreadCount,
      agentId: conv.agentId,
      isGroup: conv.type === 'community',
      isPinned: conv.isPinned,
      isSomeoneOnline: false, // Placeholder
    }));
  }, [sortedConversations]);

  // Render item function for Virtuoso
  const renderItem = useCallback((index: number) => {
    const conversation = listItemConversations[index];
    return (
      <ConversationListItem
        conversation={conversation}
        isActive={activeChatId === conversation.id}
        onClick={() => handleConversationSelect(conversation.id)}
      />
    );
  }, [listItemConversations, activeChatId, handleConversationSelect]);


  // Determine props for the EmptyState component
  const getEmptyStateProps = (): EmptyStateProps | null => {
    if (isLoadingConversations) {
      return { message: 'Loading conversations...', icon: <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--agent-color-primary)] border-t-transparent" />, role: 'status' };
    }
    if (chatError) {
      return { message: `Error loading conversations: ${chatError}`, actionLabel: 'Retry', onAction: () => window.location.reload(), role: 'alert' };
    }
    if (listItemConversations.length === 0) {
      if (searchQuery) {
        return { message: 'No conversations match your search.', icon: <SearchIcon className="h-6 w-6" aria-hidden="true" /> };
      }
      
      // Only show empty state for the 'chats' tab
      if (selectedTab === 'chats') {
        return { 
          message: 'You have no conversations yet.', 
          actionLabel: 'Start a new conversation', 
          onAction: handleCreateNewChat, 
          isActionDisabled: isCreatingChat 
        };
      }
    }
    return null; // Not empty
  };

  const emptyStateProps = getEmptyStateProps();
  // Determine if the empty state is specifically due to search results
  const isListEmptyDueToSearch = listItemConversations.length === 0 && !!searchQuery && !isLoadingConversations && !chatError;

  return (
    <Panel
      id={id}
      instanceId={instanceId}
      panelMeta={panelMeta}
      className={cn('flex flex-col h-full', className)}
      data-testid="conversations-panel"
      data-command-key="chat.conversations"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-muted)] flex-shrink-0">
        <h2 id="conversation-list-heading" className="text-sm font-medium text-[var(--text-heading)] truncate">
          {panelMeta?.title || 'Conversations'}
        </h2>
        <Button
          variant="default"
          size="sm"
          onClick={handleCreateNewChat}
          disabled={isCreatingChat || isLoadingConversations}
          title="Start a new conversation"
          aria-label="Start a new conversation"
        >
          {isCreatingChat ? 'Creating...' : 'New Chat'}
        </Button>
      </div>

      {/* Tabs Navigation using Radix UI Tabs */}
      <ConversationTabs
        counts={tabCounts}
      />

      {/* Search Input */}
      <div className="p-2 border-b border-[var(--border-muted)]">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            className="w-full pl-9 pr-8" // Space for icon and clear button
            aria-label="Search conversations"
            aria-controls="conversation-list-region" // Points to the list container
          />
          <SearchIcon
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] h-4 w-4 pointer-events-none"
            aria-hidden="true"
          />
          {searchInputValue && (
            <button
              type="button" // Crucial for non-submit buttons
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-default)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded" // Added focus-visible style (ensure --focus-ring-color is defined)
              onClick={() => setSearchInputValue('')}
              aria-label="Clear search"
            >
              {/* Use multiplication sign, hide from SR, make non-focusable */}
              <span className="text-lg pointer-events-none" aria-hidden="true" tabIndex={-1}>
                ×
              </span>
            </button>
          )}
        </div>
      </div>

       {/* Screen reader announcement region - Placed *outside* the list region */}
       {/* This placement avoids potential nested landmark issues */}
      <div
        aria-live="polite"
        className="sr-only" // Visually hidden
      >
        {isListEmptyDueToSearch && "No conversations match your search."}
        {/* Could add other announcements, e.g., "List updated." if needed */}
      </div>


      {/*
         Tailwind Tokens Audit Note:
         Verify custom tokens (like potential `ml-space-1.5`, `px-space-1.5`, `ring-offset-token`, `focus-visible:ring-focus-visible`)
         used within this component or its children (Button, Input, ConversationListItem) are defined
         in `tailwind.config.js` under `theme.extend.spacing`, `theme.extend.ringOffsetWidth`, etc.
         See Tailwind CSS documentation for examples.
      */}
      {/*
         Accessibility QA Note:
         Validate focus appearance (e.g., `focus-visible:ring-focus-visible` or other focus styles)
         meets WCAG 2.4.11 (Focus Appearance): minimum 2px thickness and ≥ 3:1 contrast ratio
         against adjacent colors in both light and dark themes.
      */}
      <Tabs.Root 
        value={selectedTab} 
        onValueChange={setSelectedTab} 
        className="flex flex-col h-full flex-grow"
      >
        {/* Tabs content panels */}
        <Tabs.Content 
          value="chats" 
          className="flex-grow h-full overflow-hidden"
          id="conversation-list-region"
          role="region"
          aria-labelledby="conversation-list-heading"
        >
          {emptyStateProps === null ? (
            // Wrap Virtuoso in div with role="list" if Virtuoso itself doesn't provide it.
            <div role="list" className="h-full">
              {/*
                Accessibility QA Note - Custom Scrollbar:
                Verify `.custom-scrollbar` styles meet WCAG 1.4.11 (Non-text Contrast):
                The scrollbar thumb must have at least a 3:1 contrast ratio against the track.
                Ensure keyboard scrollability (arrow keys, pgUp/Down) is not broken by CSS.
              */}
              <Virtuoso
                ref={virtuosoRef}
                style={{ height: '100%' }}
                data={listItemConversations} // Pass data directly
                computeItemKey={(_index, item) => item.id} // Use stable ID for keys
                itemContent={renderItem}
                overscan={{ main: 200, reverse: 100 }} // Pixel-based overscan
                className="custom-scrollbar p-2" // Apply custom scrollbar style
                data-testid="virtualized-conversation-list"
              />
            </div>
          ) : (
            <EmptyState {...emptyStateProps} />
          )}
        </Tabs.Content>

        <Tabs.Content 
          value="channels" 
          className="flex-grow h-full overflow-hidden"
        >
          {/* Use the new ChannelListVirtuoso component */}
          <ChannelListVirtuoso />
        </Tabs.Content>

        <Tabs.Content 
          value="online" 
          className="flex-grow h-full overflow-hidden p-4"
        >
          {/* Use the existing OnlineFriendsShelf component */}
          <OnlineFriendsShelf />
        </Tabs.Content>
      </Tabs.Root>
    </Panel>
  );
};

ConversationsPanel.displayName = 'ConversationsPanel';