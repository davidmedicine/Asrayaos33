// === File: src/features/channels/components/ChannelListItem.tsx ===
// ▲ File placement: Moved from /features/chat/components based on v4 feedback.
// Description: List item component for displaying a single channel using v4 patterns.

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button'; // Assuming this exists

/*
---------------------------------------------------------------------
ChannelListItem v4 Refactor Notes (incorporating previous feedback)
---------------------------------------------------------------------
Applied v4 feedback on top of existing Round 2 implementations:
1.  Interactive `<li>`: The <li> is now the button when `isMember`.
2.  Layout: Switched to 3-column CSS Grid.
3.  Height: Using `h-[var(--list-item-height)]`.
4.  Active State: Using color-mix() and shadow token.
5.  Join Cell Width: Applied min-width to the last grid column.
6.  Focus Ring: Using unified focus ring const.
7.  Memoization: Removed custom `arePropsEqual`.
8.  ARIA Label: Added to Join button.
9.  File Path: Updated.
---------------------------------------------------------------------
*/

// Define the channel data structure expected by this component
export interface ChannelData {
  id: string;
  name: string;
  type: 'public' | 'private' | 'secret';
  description?: string;
  memberCount?: number;
  unreadCount?: number;
  coherence?: number; // Coherence value for visual effect (0-100)
}

// Define the component props
export interface ChannelListItemProps {
  channel: ChannelData;
  isActive?: boolean;
  membershipStatus: 'member' | 'pending' | 'not_member';
  onClick?: (id: string) => void;
  onJoin?: (id: string) => void;
  className?: string;
}

// Use forwardRef to correctly handle refs passed from virtualization libraries or parents
// Ref type is always HTMLLIElement because the root is always <li>
const ChannelListItemComponent = React.forwardRef<HTMLLIElement, ChannelListItemProps>(
  (props, ref) => {
    const {
      channel,
      isActive = false,
      membershipStatus,
      onClick,
      onJoin,
      className
    } = props;

    const {
      id,
      name,
      type,
      description,
      memberCount = 0,
      unreadCount = 0,
      coherence = 0
    } = channel;

    const isMember = membershipStatus === 'member';

    // Handler for clicking the item (now directly on the li when member)
    const handleItemClick = useCallback(() => {
      if (isMember) { // Ensure click only happens when it's meant to be interactive
        onClick?.(id);
      }
    }, [onClick, id, isMember]);

    // Handler for the "Join" button specifically
    const handleJoin = useCallback((e: React.MouseEvent) => {
      // Stop propagation prevents the potential li click handler (if any)
      // Though currently, the li isn't clickable when the Join button is shown.
      e.stopPropagation();
      onJoin?.(id);
    }, [onJoin, id]);

    // Determine channel type icon and screen reader text
    const channelTypeInfo = (() => {
      switch (type) {
        case 'public':
          return { icon: '#', srText: 'Public channel' };
        case 'private':
          return { icon: '🔒', srText: 'Private channel' };
        case 'secret':
          return { icon: '🔐', srText: 'Secret channel' };
        default:
          return { icon: '#', srText: 'Channel' };
      }
    })();

    // --- CSS Class Definitions ---

    // #6 v4: One reusable focusRing const (using v4 suggestion)
    const focusRingClasses = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-body)] rounded-md';

    // #2 v4: Base classes using 3-column grid layout, gap, padding, height token.
    // Note: Using 40px for first column based on icon size w-10.
    // #3 v4: Using dynamic height token and overflow-clip.
    const baseClasses = cn(
        'grid grid-cols-[40px_1fr_auto] items-center gap-2 px-3 h-[var(--list-item-height)] overflow-clip',
        'relative group w-full text-left rounded-md transition-colors', // Added rounded-md back
        // #1 v4: Make LI interactive or not based on membership
        isMember ? 'cursor-pointer' : 'cursor-default select-none',
    );

    // Visual state classes for the list item
    const stateClasses = cn(
      // #4 v4: Active state using color-mix and shadow token
      isActive && 'bg-[color-mix(in_oklch,var(--agent-color-primary)_20%,transparent)] shadow-row-active',
      // Hover state (only when interactive and not active)
      isMember && !isActive && 'hover:bg-[var(--bg-hover, theme(colors.muted/10%))]', // Kept existing hover
    );

    // Coherence glow effect (same as before)
    const coherenceGlow = coherence > 80 ? 'shadow-[var(--glow-fire-medium)]' : '';

    // --- Render ---
    return (
      <li
        ref={ref}
        className={cn(
          baseClasses,
          stateClasses,
          coherenceGlow,
          // #1 v4: Apply focus ring directly to LI only when interactive
          isMember && focusRingClasses,
          className
        )}
        // #1 v4: Make list item focusable and clickable only when member
        tabIndex={isMember ? 0 : -1}
        onClick={handleItemClick}
        // Conditionally set role based on interactivity
        role={isMember ? 'button' : 'listitem'} // Or 'option' depending on parent context
        // Use aria-current for active state semantics (same as before)
        aria-current={isActive ? 'true' : undefined}
        data-channel-id={id}
        data-channel-type={type}
        // Add aria-label if it's acting as a button for better screen reader experience
        aria-label={isMember ? `Select channel ${name}` : undefined}
      >
        {/* Grid Column 1: Channel Icon/Type Indicator */}
        {/* Note: This div is 40px wide, placed in a 40px grid column */}
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[var(--bg-subtle, theme(colors.muted))] text-[var(--text-default)]">
          <span className="sr-only">{channelTypeInfo.srText}</span>
          <span title={`${type.charAt(0).toUpperCase() + type.slice(1)} Channel`} aria-hidden="true">
            {channelTypeInfo.icon}
          </span>
        </div>

        {/* Grid Column 2: Content Section (Name, Desc, Unread) */}
        <div className="min-w-0"> {/* min-w-0 prevents overflow issues in flex/grid children */}
          <div className="flex justify-between items-baseline">
            <h3 className={cn(
              'font-medium text-sm truncate',
              isActive ? 'text-[var(--text-heading)] font-semibold' : 'text-[var(--text-default)]'
            )}>
              {name}
            </h3>
            {memberCount > 0 && (
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-1">
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            )}
          </div>

          {description && (
            <p className={cn(
              "text-xs truncate mt-0.5",
              isActive ? 'text-[var(--text-heading)]' : 'text-[var(--text-muted)]'
            )}>
              {description}
            </p>
          )}

          {/* Unread Indicator */}
          {unreadCount > 0 && isMember ? (
              <div className="inline-flex items-center mt-1" aria-label={`${unreadCount} unread messages`}>
                <span className="w-2 h-2 rounded-full bg-[var(--agent-color-primary)]"></span>
                <span className="ml-1.5 text-xs font-medium text-[var(--agent-color-primary)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
          ) : (
             // Spacer needed if no unread indicator to maintain alignment/height?
             // If grid items-center handles alignment, this might not be strictly needed,
             // but kept for consistency if description is short or absent.
             <span aria-hidden="true" role="presentation" className="inline-block min-h-[1rem] mt-1"></span> // Adjusted min-h, added mt-1
          )}
        </div>

        {/* Grid Column 3: Join Button / Pending Badge Section */}
        {/* #5 v4: Reserve min-width and align text */}
        <div className="min-w-[64px] text-end relative z-10">
          {type === 'private' && membershipStatus === 'not_member' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleJoin}
              // #8 v4: Add aria-label
              aria-label={`Join channel ${name}`}
              // Apply focus ring to the button itself
              className={cn("text-xs py-1", focusRingClasses)}
            >
              Join
            </Button>
          )}
          {membershipStatus === 'pending' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-muted)] font-medium">
              PENDING
            </span>
          )}
        </div>
      </li>
    );
  }
);

// Assign display name for DevTools, important for forwardRef components
ChannelListItemComponent.displayName = 'ChannelListItem';

// #7 v4: Export the memoized component using default shallow comparison
export const ChannelListItem = React.memo(ChannelListItemComponent);