// === File: src/hooks/useMediaQuery.ts ===
import { useState, useEffect } from 'react';

/**
 * Hook that returns true if the provided media query matches,
 * stabilized for SSR and CSR consistency.
 *
 * @param query CSS media query string (e.g., "(max-width: 768px)")
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Get the initial match state. Handles SSR by returning false.
  const getMatches = (): boolean => {
    // Check if we're in a browser environment BEFORE accessing window
    return typeof window !== 'undefined' ? window.matchMedia(query).matches : false;
  };

  // useState always runs, using getMatches for initial state (SSR/CSR consistent call)
  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    // --- Effect runs on client-side only ---
    // Guard clause: Don't run the rest of the effect logic on the server
    if (typeof window === 'undefined') {
      return;
    }

    // We are now definitely on the client
    const mediaQueryList = window.matchMedia(query);

    // Event handler
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Ensure initial client-side state is correct *after* hydration,
    // though getMatches() should handle this most of the time.
    // This addresses potential edge cases if the initial state differs post-hydration.
    setMatches(mediaQueryList.matches);

    // Add the event listener
    // Using addEventListener for modern browsers, addListener for older ones
    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', handleChange);
      // Cleanup function
      return () => mediaQueryList.removeEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(handleChange); // Deprecated but needed for fallback
      // Cleanup function
      return () => mediaQueryList.removeListener(handleChange); // Deprecated but needed for fallback
    }
  }, [query]); // Re-run effect only if query string changes

  return matches;
}