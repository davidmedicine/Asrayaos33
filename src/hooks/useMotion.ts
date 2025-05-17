// src/hooks/useMotion.ts

import { useSyncExternalStore } from 'react';
import {
    // Import the new canonical names
    prefersReducedMotionStore,
    prefersReducedMotionInitial,
    // Keep type import if defined and needed from motionTokens.ts
    MotionPreferenceObservable // Verify this type exists in motionTokens.ts
} from '@/lib/motiontokens'; // Verify path is correct

/**
 * @module useMotion
 */

// Define getServerSnapshot outside the hook for referential stability.
// Uses the static initial value from motionTokens.ts for SSR snapshot.
const getServerSnapshot = (): boolean => prefersReducedMotionInitial;

/**
 * @typedef {object} MotionPreferences
 * @property {boolean} prefersReduced - True if the user prefers reduced motion.
 * // Add other preferences like reducedTransparency here in the future.
 */

/**
 * React hook providing user motion preferences (currently `prefersReduced`).
 *
 * Subscribes to the operating system's preferences via the centralized `prefersReducedMotionStore`.
 * Uses `useSyncExternalStore` for React 18+ concurrent safety and optimized hydration.
 *
 * **Key Features & Considerations:**
 * - **Centralized Store:** Relies on the stable `prefersReducedMotionStore` ({ subscribe, getSnapshot })
 * imported from `@/lib/motionTokens`. This ensures a single source of truth and
 * correctness with `useSyncExternalStore`.
 * - **SSR & Hydration:** Uses a static `prefersReducedMotionInitial` value (defined in
 * `@/lib/motionTokens`) for the server snapshot. This aims to match the initial server
 * render with the most likely client value, minimizing hydration layout shifts (CLS).
 * See: https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering
 * See: https://web.dev/articles/cls
 * - **Accessibility (WCAG 2.3.3 & Beyond):**
 * - Provides the `prefersReduced` flag to help satisfy WCAG 2.3.3 (Animation
 * from Interactions) for non-essential motion.
 * - **Design Guidance:** When reducing motion, prefer providing alternative visual
 * cues (fade, scale, outline) over simply removing feedback (WAI-ARIA).
 * - **Focus Visibility:** Ensure focus indicators remain prominent and clear if
 * global animations are paused or slowed via `prefersReducedMotionStore` subscription.
 * - **WCAG Scope:** Respecting `prefersReduced` primarily applies to automatic or
 * ambient animations; user-triggered animations might still be acceptable if essential
 * or if control is provided.
 * See: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interaction.html
 * See: https://www.w3.org/WAI/ARIA/apg/practices/responsive-design-and-accessibility/
 * - **Browser Quirks & Edge Cases:**
 * - This hook consumes data from `prefersReducedMotionStore`. The store implementation in
 * `@/lib/motionTokens` is responsible for handling browser/platform complexities:
 * - BFCache restoration (`pageshow` event checks).
 * - Background tab updates (`visibilitychange` checks).
 * - Initial value stabilization/debouncing (`requestAnimationFrame`).
 * - Cross-tab synchronization (`storage` event).
 * - `matchMedia` listener cleanup (when subscriber count is zero).
 * - **Global Animation Coordination (e.g., GSAP):**
 * - Use `prefersReducedMotionStore.subscribe` directly for immediate reactions in animation systems.
 * - **GSAP Example:**
 * ```javascript
 * // Import directly from the source for clarity
 * import { prefersReducedMotionStore } from '@/lib/motionTokens';
 * import { gsap } from 'gsap';
 *
 * // Subscribe once globally
 * const unsubscribe = prefersReducedMotionStore.subscribe(() => {
 * const prefersReduced = prefersReducedMotionStore.getSnapshot();
 * prefersReduced ? gsap.ticker.sleep() : gsap.ticker.wake();
 * // Note: Check plugins like ScrollTrigger for separate handling.
 * });
 *
 * // Initial state check
 * if (prefersReducedMotionStore.getSnapshot()) gsap.ticker.sleep();
 *
 * // Call unsubscribe() on cleanup.
 * ```
 *
 * @returns {MotionPreferences} An object: `{ prefersReduced: boolean }`. Allows future expansion.
 *
 * @example
 * import { useMotion } from '@/hooks/useMotion';
 *
 * function MyComponent() {
 * const { prefersReduced } = useMotion();
 * return (
 * <div className={prefersReduced ? 'reduced-motion-styles' : 'full-motion-styles'}>
 * Content
 * </div>
 * );
 * }
 *
 * @example
 * // CodeSandbox Link: [Placeholder - Add relevant CodeSandbox URL here]
 */
export function useMotion(): { prefersReduced: boolean } {
    // useSyncExternalStore consumes the stable methods from the store
    // and the stable getServerSnapshot function defined above.
    const prefersReduced = useSyncExternalStore(
        prefersReducedMotionStore.subscribe,    // Stable function from store (new name)
        prefersReducedMotionStore.getSnapshot,  // Stable function from store (new name)
        getServerSnapshot                       // Stable function defined locally using static initial value (new name)
    );

    // Return object structure allows future expansion (e.g., reducedTransparency)
    // No change needed here, signature remains the same.
    return {
        prefersReduced,
    };
}

// Removed the re-exports of 'motionStore' and 'MotionPreferenceObservable'.
// Consumers should import these directly from '@/lib/motiontokens' if needed.
// This encourages using the canonical source and avoids confusion.