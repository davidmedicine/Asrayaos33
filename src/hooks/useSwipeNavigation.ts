import { useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react'; // Import RefObject type
import { Observer, ObserverInstance } from '@/lib/gsapSetup'; // Assuming types are exported from setup
import type { WorldDirection, NavItemData } from './CompassNavMobile'; // Assuming types are exported from the component file or a shared types file

// --- Hook Arguments Interface ---

/**
 * Arguments for the useSwipeNavigation hook.
 */
interface UseSwipeNavigationArgs {
  /** Ref object pointing to the DOM element that should detect swipe gestures. */
  targetRef: RefObject<HTMLDivElement>;
  /** The ordered array of navigation items. */
  navItems: readonly NavItemData[];
  /** The ID of the currently selected navigation item. */
  currentWorld: WorldDirection;
  /** Callback function invoked when a valid swipe gesture triggers navigation. */
  onSwipeNavigate: (newWorldId: WorldDirection) => void;
  /** Flag to enable or disable the swipe detection. Set to false for reduced motion. */
  isEnabled: boolean;
  /** Optional: Minimum horizontal velocity threshold to trigger navigation. Defaults to 0.3. */
  velocityThreshold?: number;
  /** Optional: Minimum horizontal distance threshold for drag detection by GSAP. Defaults to 30. */
  dragMinimum?: number;
  /** Optional: Pixel tolerance before GSAP drag detection starts. Defaults to 20. */
  tolerance?: number;
}

// --- Custom Hook Implementation ---

/**
 * Custom React hook to manage horizontal swipe gesture navigation using GSAP Observer.
 *
 * Encapsulates the setup, teardown, and logic for detecting swipes on a target element
 * and translating them into navigation actions via a callback.
 * Designed to be disabled based on the `isEnabled` flag (e.g., for prefers-reduced-motion).
 *
 * @param args - Configuration options for the swipe navigation hook.
 */
export const useSwipeNavigation = ({
  targetRef,
  navItems,
  currentWorld,
  onSwipeNavigate,
  isEnabled,
  velocityThreshold = 0.3, // Default velocity threshold
  dragMinimum = 30,        // Default drag minimum distance
  tolerance = 20,          // Default tolerance
}: UseSwipeNavigationArgs): void => { // Explicitly void return type
  const observerRef = useRef<ObserverInstance | null>(null);

  // Memoize the provided callback to ensure stability if the parent component
  // potentially provides a new function identity on each render (though using useCallback in parent is preferred).
  // This prevents unnecessary observer re-creation if only the callback identity changes.
  const stableOnSwipeNavigate = useCallback(onSwipeNavigate, [onSwipeNavigate]);

  useEffect(() => {
    const targetElement = targetRef.current;

    // --- Effect Guards ---
    // 1. Ensure the target element exists in the DOM.
    if (!targetElement) {
      // console.debug('Swipe hook: Target element not found.');
      return;
    }

    // 2. Handle the 'disabled' state: If not enabled, ensure any existing observer is killed.
    if (!isEnabled) {
      if (observerRef.current) {
        // console.debug('Swipe hook: Disabling - Killing existing observer.');
        observerRef.current.kill();
        observerRef.current = null;
      }
      // console.debug('Swipe hook: Observer disabled.');
      return; // Exit effect if disabled
    }

    // 3. Handle the 'already enabled' state: If enabled and observer exists, do nothing more.
    if (observerRef.current) {
        // console.debug('Swipe hook: Observer already active.');
        return; // Prevent creating duplicate observers
    }

    // --- Observer Creation ---
    // console.debug('Swipe hook: Setting up GSAP Observer...');
    const newObserver = Observer.create({
      target: targetElement,          // The element to observe gestures on
      type: 'touch,pointer',          // Observe touch and pointer events
      axis: 'x',                      // Detect horizontal movement only
      lockAxis: true,                 // Prevent vertical scroll during horizontal gesture detection
      tolerance: tolerance,           // Pixels finger can move before detection starts
      dragMinimum: dragMinimum,       // Minimum pixels dragged distance to potentially trigger swipe
      eventPassThrough: "vertical",   // Allow native vertical scrolling/gestures to pass through
      preventDefault: false,          // Don't prevent default actions (like pinch zoom); rely on lockAxis/eventPassThrough
      onDragEnd: (self) => {          // Callback executed when a drag/swipe gesture ends
        const velocityX = self.velocityX; // Horizontal velocity at the end of the drag

        // Find the index of the currently active world/tab
        const currentIndex = navItems.findIndex(item => item.id === currentWorld);
        const numItems = navItems.length;

        // Guard against edge case where currentWorld isn't found or no items exist
        if (currentIndex === -1 || numItems === 0) {
          console.warn('Swipe hook: Could not determine current index or no items.');
          return;
        }

        let nextIndex = currentIndex; // Initialize next index to current

        // --- Swipe Logic ---
        // Swipe Left (Finger moves left, negative velocity) -> Navigate to next item visually (e.g., West -> North -> Center...)
        if (velocityX < -velocityThreshold) {
          // console.debug(`Swipe Left detected (v=${velocityX.toFixed(2)}), navigating to next item.`);
          nextIndex = (currentIndex + 1) % numItems; // Wrap around using modulo
          stableOnSwipeNavigate(navItems[nextIndex].id); // Trigger navigation callback
        }
        // Swipe Right (Finger moves right, positive velocity) -> Navigate to previous item visually (e.g., Center -> North -> West...)
        else if (velocityX > velocityThreshold) {
          // console.debug(`Swipe Right detected (v=${velocityX.toFixed(2)}), navigating to previous item.`);
          nextIndex = (currentIndex - 1 + numItems) % numItems; // Wrap around using modulo (handle negative result)
          stableOnSwipeNavigate(navItems[nextIndex].id); // Trigger navigation callback
        }
        // Else: Drag was too slow (below velocity threshold) or potentially just a tap -> Do nothing, let onClick handle taps.
      },
    });

    // Store the newly created observer instance in the ref
    observerRef.current = newObserver;
    // console.debug('Swipe hook: GSAP Observer created and active.');

    // --- Cleanup Function ---
    // This function runs when the component unmounts or when dependencies change before the effect re-runs.
    return () => {
      // console.debug('Swipe hook: Cleaning up observer.');
      observerRef.current?.kill(); // Kill the observer to remove listeners and free resources
      observerRef.current = null;  // Clear the ref
    };
  }, [
      // --- Effect Dependencies ---
      targetRef,             // Re-run if the target element ref changes (unlikely but possible)
      navItems,              // Re-run if the list of items changes (affects index calculation)
      currentWorld,          // Re-run if the current world changes (affects index calculation)
      stableOnSwipeNavigate, // Re-run if the navigation callback changes (stability ensured by useCallback)
      isEnabled,             // Re-run if the enabled state toggles (to create/destroy observer)
      velocityThreshold,     // Re-run if thresholds change
      dragMinimum,
      tolerance,
  ]);

  // This hook primarily manages side effects (the Observer) and doesn't need to return a value.
};