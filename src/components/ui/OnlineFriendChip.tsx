/**
 * OnlineFriendChip.tsx
 * A clickable chip displaying an online user with their status indicator
 * Supports keyboard accessibility, high contrast mode, and theming.
 */

import React, { forwardRef } from 'react';
import Image from 'next/image';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
// 🛠️ #2 Removed unused PresenceKind import
import { OnlineFriend } from '@/types/presence';
// 🛠️ #3 Import presence map - path assumed correct, ensure file/export exists
import { KIND_CLASS_MAP } from '@/styles/presenceClassMap';

// Define size types for clarity
type ChipSize = 'sm' | 'md' | 'lg';

export interface OnlineFriendChipProps extends React.HTMLAttributes<HTMLDivElement> {
  friend: OnlineFriend;
  // 🛠️ #1 Status is now required to ensure source of truth comes from parent
  status: 'online' | 'typing' | 'away';
  showStatus?: boolean;
  showTooltip?: boolean;
  size?: ChipSize;
  onClick?: (friend: OnlineFriend) => void;
}

/**
 * A component that displays an online user with avatar and status indicator.
 * Includes accessibility support, handles different presence statuses,
 * and adapts styling based on interaction and user kind.
 */
export const OnlineFriendChip = forwardRef<HTMLDivElement, OnlineFriendChipProps>(
  ({
    friend,
    status, // Required status prop
    showStatus = true,
    showTooltip = true,
    size = 'md',
    onClick,
    className,
    ...props
  }, ref) => {

    // Status is now required, no default needed.
    const currentStatus = status;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      onClick?.(friend);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(friend);
      }
    };

    // Explicit typing for avatarSize object
    const avatarSizeMap: Record<ChipSize, number> = {
      sm: 24,
      md: 32,
      lg: 40,
    };
    const avatarSize = avatarSizeMap[size];

    // Size classes for fallback avatar
    const sizeClasses: Record<ChipSize, string> = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-10 h-10 text-base'
    };

    // Determine status class based on required currentStatus
    const statusClass = currentStatus === 'typing'
      ? 'typing' // This class might be used for base typing styles OR just as a marker
      : currentStatus === 'away'
        ? 'away'
        : '';

    // Generate tooltip content based on required currentStatus
    const tooltipContent = currentStatus === 'typing'
      ? `${friend.name} is typing...`
      : currentStatus === 'away'
        ? `${friend.name} is away`
        : `${friend.name} is online`;

    const friendChipContent = (
      <div
        ref={ref}
        className={cn(
          'online-friend-chip flex items-center gap-2 p-1 rounded-full', // Base layout
          // Base border state (transparent)
          'border border-transparent',
          // Conditionally apply interactive styles and visible border
          onClick && [
            'cursor-pointer',
            // 🛠️ #11 Add visible border when interactive for focus offset visibility
            'border-[var(--border-default)]', // Use a default/subtle border color variable
            // 🛠️ #6 Use a defined CSS variable for hover background
            'hover:bg-[var(--bg-muted)]', // Assuming --bg-muted is defined and suitable for hover
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)]',
          ],
          className,
          // 🛠️ #3 / #8 / #12 Use safer map access with fallback for kind-specific class
          // Ensure KIND_CLASS_MAP and friend.kind are compatible types
          KIND_CLASS_MAP?.[friend.kind as keyof typeof KIND_CLASS_MAP] ?? ''
        )}
        // Conditionally apply button role, tabIndex, and event handlers
        {...(onClick
          ? {
              role: 'button',
              tabIndex: 0,
              onClick: handleClick,
              onKeyDown: handleKeyDown,
            }
          : { tabIndex: -1 })}
        aria-label={tooltipContent}
        {...props}
      >
        <div className="relative flex-shrink-0">
          {friend.avatarUrl ? (
            <Image
              src={friend.avatarUrl}
              // 🛠️ #5 Improved alt text for accessibility, handles empty names
              alt={friend.name ? `${friend.name}'s avatar` : 'User avatar'}
              width={avatarSize}
              height={avatarSize}
              className="rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            // Fallback avatar with cleaner class definition
            <div
              className={cn(
                'rounded-full flex items-center justify-center bg-[var(--bg-muted)] text-[var(--text-default)] font-medium',
                sizeClasses[size]
              )}
            >
              {(friend.name?.[0] ?? '').toUpperCase()}
            </div>
          )}

          {/* Status indicator dot */}
          {showStatus && (
            <div
              className={cn(
                // ⚠️ #9 Removed potentially undefined 'presence-dot-outline' class
                "presence-dot", // Base styles for the dot
                statusClass, // Apply 'typing' or 'away' class if applicable
                // 🛠️ #4 Use correct animation name and CSS vars as per feedback's patch suggestion
                // Ensure 'asr-typing-pulse' keyframes and CSS variables are defined globally.
                currentStatus === 'typing' && 'animate-[asr-typing-pulse_var(--asr-typing-pulse-duration)_var(--asr-typing-pulse-timing)_infinite]'
              )}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Display name - truncated */}
        <span className={cn(
            "text-sm truncate pr-1",
            // ⚠️ #10 Use 'ch' units for max-width to better handle varying name lengths
            "max-w-[15ch]" // Approx 15 characters wide
          )}
        >
          {friend.name}
        </span>
      </div>
    );

    // Wrap in tooltip provider/root only if enabled
    if (showTooltip) {
      return (
        <Tooltip.Provider delayDuration={300}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              {friendChipContent}
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="z-50 px-3 py-1.5 text-xs rounded-md bg-[var(--bg-surface)] text-[var(--text-on-surface)] border border-[var(--border-muted)] shadow-md select-none"
                sideOffset={5}
              >
                {tooltipContent}
                <Tooltip.Arrow className="fill-[var(--bg-surface)]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      );
    }

    // Return the plain chip if tooltip is disabled
    return friendChipContent;
  }
);

OnlineFriendChip.displayName = 'OnlineFriendChip';

export default OnlineFriendChip;