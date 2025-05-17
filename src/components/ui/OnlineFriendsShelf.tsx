/**
 * OnlineFriendsShelf.tsx
 * Displays a horizontal shelf of online users with their status.
 * Uses GSAP for smooth animations and adheres to Asraya OS design system.
 * Corresponds to ticket ASR-224.
 *
 * Assumes necessary CSS variables (--size-*, --spacing-*, --color-*, etc.)
 * and utility classes (.avatar-stack, .focus-ring, etc.) are defined
 * in global.css under the appropriate layers (@theme, @layer components).
 */

import React, { useEffect, useRef, memo, useMemo } from 'react';
// Using Next.js Image. Replace with <img> if not using Next.js.
import Image from 'next/image';
import { usePresenceStore } from '@/lib/state/store';
import { OnlineFriend } from '@/types';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { shallow } from 'zustand/shallow';
// Assuming motionTokens.ts exports MOTION durations/objects and EASE functions/strings
import { durations as MOTION, easings as EASE } from '@/lib/motiontokens';

// Helper for status text (used in aria-label)
const getStatusText = (status: OnlineFriend['status']): string => {
  switch (status) {
    case 'typing':
      return 'typing';
    case 'away':
      return 'away';
    case 'online':
    default:
      return 'online';
  }
};

export interface OnlineFriendsShelfProps {
  maxVisibleAvatars?: number;
  /** Consider extracting onClick logic to Context if shelf is used in many layouts */
  onClick?: (friend: OnlineFriend) => void;
  className?: string;
}

// Memoizing the component handles prop changes.
// The `shallow` selector optimizes the Zustand subscription. No redundant memo needed.
export const OnlineFriendsShelf: React.FC<OnlineFriendsShelfProps> = memo(
  ({ maxVisibleAvatars = 5, onClick, className }) => {
    const onlineFriends = usePresenceStore(
      (state) => Array.from(state.onlineFriends.values()),
      shallow // Prevent re-renders if array ref changes but content is identical
    );

    const shelfRef = useRef<HTMLDivElement>(null);
    const gsapContextRef = useRef<gsap.Context | null>(null);
    // Memoize the selector function creation
    const q = useMemo(() => gsap.utils.selector(shelfRef), []);

    // Set up GSAP animations for avatar entrance
    useEffect(() => {
      // Exit early if reduced motion is preferred - W3C C39 / GSAP guidance
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (prefersReducedMotion) {
        return;
      }

      // Exit early if no friends or element not ready
      if (onlineFriends.length === 0 || !shelfRef.current) {
        // Ensure any previous GSAP contexts are cleaned up if friends list becomes empty
        if (gsapContextRef.current) {
          gsapContextRef.current.revert();
          gsapContextRef.current = null;
        }
        return;
      }

      // Create a new GSAP context scoped to the shelfRef
      gsapContextRef.current = gsap.context(() => {
        // Animate avatars using tokens from motionTokens.ts
        gsap.fromTo(
          q('.avatar-button'), // Target the button element using the memoized selector
          {
            // Use MOTION.avatarEnter object from motionTokens.ts
            opacity: MOTION.avatarEnter?.opacity ?? 0,
            scale: MOTION.avatarEnter?.scale ?? 0.8, // Use tokenized scale
            // Use tokenized translate-y (maps to CSS var like --spacing-2)
            y: MOTION.avatarEnter?.y ?? 'var(--spacing-2)',
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: MOTION.fast,
            ease: EASE.emphasizedOut,
            stagger: MOTION.microStagger,
            delay: MOTION.shortDelay, // Apply only if needed, e.g., after shelf appears
          }
        );
      }, shelfRef); // Scope context to the shelf

      // Cleanup function for the effect
      return () => {
        if (gsapContextRef.current) {
          gsapContextRef.current.revert(); // Clean up animations and styles
          gsapContextRef.current = null;
        }
      };
      // Rerun effect if the number of friends changes (triggers enter animation)
    }, [onlineFriends.length, q]); // Include q in dependency array

    // Handle window visibility changes & reduced motion preference changes at runtime
    useEffect(() => {
      // No need to run listeners if animations are disabled initially
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
          return;
      }

      const handleVisibilityChange = () => {
        // Only pause/resume if animations are active (context exists)
        if (!gsapContextRef.current) return;
        gsap.globalTimeline.paused(document.visibilityState === 'hidden');
      };

      const handleReducedMotionChange = (event: MediaQueryListEvent) => {
        if (!gsapContextRef.current) return;
        if (event.matches) {
          // Reduced motion enabled: Complete animations quickly
          gsap.globalTimeline.timeScale(100); // Speed up intensely
          // Reset timescale after a short delay to allow completion
          setTimeout(() => gsap.globalTimeline.timeScale(1), 100);
        } else {
          // Reduced motion disabled: Restore normal speed (optional, GSAP default is 1)
          // gsap.globalTimeline.timeScale(1);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      mediaQuery.addEventListener('change', handleReducedMotionChange);

      // Cleanup listeners on component unmount
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        mediaQuery.removeEventListener('change', handleReducedMotionChange);
        // Ensure timescale is reset if component unmounts while sped up
        gsap.globalTimeline.timeScale(1);
      };
    }, []); // Run listeners management only once on mount

    // Render empty state if no friends are online
    if (onlineFriends.length === 0) {
      return (
        // Assumes .online-friends-shelf base styles defined in global.css
        <div className={cn('online-friends-shelf', className)}>
          {/* Use theme variables for text color */}
          <p role="status" className="text-sm text-[var(--text-muted)] italic">
            No one is online
          </p>
        </div>
      );
    }

    // Calculate visible avatars and overflow count
    const visibleFriends = onlineFriends.slice(0, maxVisibleAvatars);
    const hiddenFriendsCount = Math.max(
      0,
      onlineFriends.length - maxVisibleAvatars
    );
    const moreCountDisplay =
      hiddenFriendsCount > 99 ? '99+' : `+${hiddenFriendsCount}`;

    return (
      // Assumes .online-friends-shelf base styles defined in global.css
      <div ref={shelfRef} className={cn('online-friends-shelf', className)}>
        <span className="sr-only">Online friends:</span>

        {/* Assumes .avatar-stack styles (flex, negative margins via CSS vars) defined in global.css */}
        <div className="avatar-stack" role="list">
          {visibleFriends.map((friend) => (
            // Use a semantic <button> for accessibility and interaction
            <button
              key={friend.id}
              type="button" // Explicit type="button" for clarity
              // Announce name and dynamic status via aria-label
              aria-label={`${friend.name} (${getStatusText(friend.status)})`}
              // Base + interaction classes. Size uses CSS vars via Tailwind arbitrary values.
              className={cn(
                'avatar-button relative focus-ring', // Base class + global focus styles
                'w-[var(--size-avatar-sm)] h-[var(--size-avatar-sm)]', // Size via CSS var
                'rounded-full', // Ensure button shape matches avatar if needed
                !onClick && 'cursor-default', // Adjust cursor if not clickable
                'appearance-none text-left p-0 border-none bg-transparent' // Button resets
              )}
              onClick={onClick ? () => onClick(friend) : undefined}
              disabled={!onClick} // Disable button if no onClick handler provided
              role="listitem" // Explicit role within the avatar-stack list
            >
              {/* Avatar container - assumes .avatar class defines base styles like bg */}
              <div
                className={cn(
                  'avatar w-full h-full rounded-full overflow-hidden relative' // Relative for Image fill
                  // Add base .avatar class if it defines specific styles like background-color for fallback
                  // 'avatar' // Uncomment if .avatar class exists and is needed
                )}
              >
                {friend.avatarUrl ? (
                  <Image
                    src={friend.avatarUrl}
                    // Alt text is empty: parent button provides the label (name + status).
                    // This prevents redundant announcements by screen readers.
                    alt=""
                    fill // Requires parent with relative positioning and dimensions
                    sizes="var(--size-avatar-sm)" // Optimize image loading via CSS var
                    className="object-cover" // Ensure image covers the area
                    loading="lazy" // Defer loading offscreen images
                  />
                ) : (
                  // Fallback initials display
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                    {/* Safely access first initial */}
                    {friend.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Status indicator dot */}
              {/* Assumes .presence-dot-outline provides positioning context if needed */}
              <div
                className={cn(
                  'presence-dot-outline absolute rounded-full z-10 pointer-events-none', // Base, stack order, ignore clicks
                  'w-[var(--size-indicator)] h-[var(--size-indicator)]', // Size via CSS var
                  // Position using CSS variable defined in theme
                  'right-[var(--spacing-micro)] bottom-[var(--spacing-micro)]',
                  // Border using CSS variables for width and color (contrasting background)
                  'border-[var(--border-width-hairline)] border-[var(--bg-surface)]',
                  {
                    // Status specific colors using theme variables
                    'bg-[var(--color-success-fg)]': friend.status === 'online',
                    // Use specific Amber token from design system via CSS var
                    'bg-[var(--color-value-amber-500)]': friend.status === 'away',
                    // Use agent primary color + animation class (defined globally, respects reduced motion)
                    'bg-[var(--agent-color-primary)] animate-typing-pulse':
                      friend.status === 'typing',
                  }
                )}
                aria-hidden="true" // Decorative element, ignored by screen readers
              />
              {/* Status text is included in the parent button's aria-label */}
            </button>
          ))}

          {/* More count indicator */}
          {hiddenFriendsCount > 0 && (
            // Assumes .more-count styles define layout/appearance in global.css
            <div
              className={cn(
                'more-count flex items-center justify-center rounded-full', // Base layout
                'w-[var(--size-avatar-sm)] h-[var(--size-avatar-sm)]', // Size matches avatar via CSS var
                'bg-[var(--bg-muted)] text-[var(--text-muted)] text-xs font-medium' // Appearance via CSS vars
              )}
              role="listitem" // Part of the list
              aria-label={`${hiddenFriendsCount} more friends online`}
            >
              {moreCountDisplay}
            </div>
          )}
        </div>
      </div>
    );
  }
);

OnlineFriendsShelf.displayName = 'OnlineFriendsShelf';

export default OnlineFriendsShelf;