/**
 * Animation Utilities for AsrayaOS
 * Provides helper functions for animations that respect prefers-reduced-motion
 */

import { useEffect, useState } from 'react';

/**
 * Hook to check if the user prefers reduced motion
 * @returns {boolean} Whether reduced motion is preferred
 */
export function usePrefersReducedMotion(): boolean {
  // Default to false (not reducing motion) server-side
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check the prefers-reduced-motion media query
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(query.matches);

    // Update the preference if it changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add the listener for future changes
    query.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Generates animation config based on user's motion preferences
 * @param standardConfig - The standard animation configuration
 * @param reducedConfig - Optional reduced motion configuration (defaults to no animation)
 * @returns Animation configuration based on user preference
 */
export function getMotionConfig<T extends Record<string, any>>(
  standardConfig: T,
  reducedConfig: Partial<T> = {}
): T {
  // The CSS will handle this, but we provide a JS version for programmatic use
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // Return reduced motion config with standard config as fallback
      return {
        ...standardConfig,
        ...reducedConfig,
      };
    }
  }
  
  return standardConfig;
}

/**
 * Default animation duration multipliers based on motion preference
 */
export const motionDuration = {
  // Use these to adjust animation durations based on preference
  get standard() {
    return 1;
  },
  get reduced() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 1;
    }
    return 1;
  }
};