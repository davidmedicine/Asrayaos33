import React, {
    useRef,
    useEffect,
    useCallback,
    useLayoutEffect,
    useImperativeHandle,
    RefObject,
    MutableRefObject,
  } from 'react';
  
  // --- Constants ---
  const IS_BROWSER = typeof window !== 'undefined';
  const STORAGE_PREFIX = 'scroll-restoration';
  const STORAGE_VERSION = 'v1'; // Increment to invalidate old keys on schema changes
  const DEFAULT_DEBOUNCE_DELAY = 150; // ms, aligns with RAIL guidelines
  const MEMORY_CACHE_MAX_SIZE = 50; // Max items in memory LRU cache
  
  // --- Types ---
  interface ScrollPosition {
    x: number;
    y: number;
  }
  
  interface UseScrollRestorationProps<T extends Element> {
    /** Unique identifier for the scrollable area/route. */
    id: string;
    /** If true, the hook is active. Set to false to disable listeners and restoration. */
    enabled?: boolean;
    /** Provide a ref to a specific scrollable element. If omitted, defaults to window scroll. */
    elementRef?: RefObject<T>;
    /** Debounce delay in ms for saving scroll position during scrolling. */
    debounceDelay?: number;
    /** If true, delays restoration until the element is at least partially visible (threshold 0.01). Ignored for window scroll. */
    delayRestoreUntilVisible?: boolean;
    /** Callback fired after scroll and focus restoration attempt. */
    onRestorationComplete?: () => void;
    /** Optional ref for imperative access (e.g., manually trigger save). */
    ref?: React.Ref<ScrollRestorationHandle>;
  }
  
  interface ScrollRestorationHandle {
    /** Manually trigger an immediate save of the current scroll position. */
    flushSave: () => void;
    /** Clear the stored scroll position for the current ID. */
    clearStoredPosition: () => void;
  }
  
  // --- Utilities ---
  
  /** Use layout effect on client, effect on server (for SSR compatibility) */
  const useIsomorphicLayoutEffect = IS_BROWSER ? useLayoutEffect : useEffect;
  
  /** Debounce function using requestIdleCallback with setTimeout fallback */
  const rafDebounce = (fn: () => void, delay = DEFAULT_DEBOUNCE_DELAY) => {
    let timeoutId: number | undefined = undefined;
    let idleCallbackId: number | undefined = undefined;
  
    const debouncedFn = () => {
      if (IS_BROWSER) {
        if (window.requestIdleCallback) {
            if (idleCallbackId !== undefined) window.cancelIdleCallback(idleCallbackId);
            idleCallbackId = window.requestIdleCallback(fn, { timeout: delay });
        } else {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
            timeoutId = window.setTimeout(fn, delay);
        }
      }
    };
  
    debouncedFn.cancel = () => {
      if (IS_BROWSER) {
         if (idleCallbackId !== undefined && window.cancelIdleCallback) {
             window.cancelIdleCallback(idleCallbackId);
             idleCallbackId = undefined;
         }
         if (timeoutId !== undefined) {
             clearTimeout(timeoutId);
             timeoutId = undefined;
         }
      }
    };
  
    debouncedFn.flush = () => {
       debouncedFn.cancel();
       fn();
    };
  
    return debouncedFn;
  };
  
  
  /** Simple O(1) LRU Cache using Map */
  class LruCache<K, V> {
    private maxSize: number;
    private cache: Map<K, V>;
  
    constructor(maxSize: number) {
      this.maxSize = maxSize;
      this.cache = new Map<K, V>();
    }
  
    has(key: K): boolean {
      return this.cache.has(key);
    }
  
    get(key: K): V | undefined {
      if (!this.cache.has(key)) {
        return undefined;
      }
      // Move accessed item to the end (most recently used)
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
  
    set(key: K, value: V): void {
      // Delete to re-insert if exists (updates position)
      if (this.cache.has(key)) {
        this.cache.delete(key);
      }
      this.cache.set(key, value);
  
      // Evict least recently used if over size
      if (this.cache.size > this.maxSize) {
        const leastRecentlyUsedKey = this.cache.keys().next().value;
        this.cache.delete(leastRecentlyUsedKey);
      }
    }
  
    delete(key: K): void {
        this.cache.delete(key);
    }
  
    clear(): void {
      this.cache.clear();
    }
  
    size(): number {
        return this.cache.size;
    }
  }
  
  // --- The Hook ---
  
  /**
   * A React hook to save and restore scroll position for an element or the window,
   * with SSR safety, debounced saving, optional visibility delay, focus management,
   * and reduced motion support.
   */
  export function useScrollRestoration<T extends Element = HTMLElement>(
    props: UseScrollRestorationProps<T>
  ): RefObject<T> {
    const {
      id,
      enabled = true,
      elementRef: propsElementRef,
      debounceDelay = DEFAULT_DEBOUNCE_DELAY,
      delayRestoreUntilVisible = false,
      onRestorationComplete,
      ref: imperativeRef, // Renamed to avoid conflict
    } = props;
  
    // Internal ref for element targeting if propsElementRef is not provided
    const internalRef = useRef<T>(null);
    const targetRef = propsElementRef ?? internalRef;
  
    // Refs for state that shouldn't trigger re-renders but need to be accessed in callbacks/effects
    const enabledRef = useRef(enabled);
    const prevFocusRef = useRef<Element | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const debounceSaveFnRef = useRef<ReturnType<typeof rafDebounce> | null>(null);
    const memoryCacheRef = useRef<LruCache<string, ScrollPosition>>(new LruCache(MEMORY_CACHE_MAX_SIZE));
    const isUsingMemoryCacheRef = useRef(false); // Flag if sessionStorage failed
  
    // --- Storage Logic ---
  
    const getStorageKey = useCallback((): string => {
        return `${STORAGE_PREFIX}-${STORAGE_VERSION}-${id}`;
    }, [id]);
  
    const getStoredScrollPosition = useCallback((): ScrollPosition | null => {
      if (!IS_BROWSER || !enabledRef.current) return null;
  
      const key = getStorageKey();
  
      // Try memory cache first if fallback is active
      if (isUsingMemoryCacheRef.current && memoryCacheRef.current.has(key)) {
          return memoryCacheRef.current.get(key) ?? null;
      }
      // If not using memory cache, or key not found there, try sessionStorage
      if (!isUsingMemoryCacheRef.current) {
          try {
              const storedValue = sessionStorage.getItem(key);
              if (storedValue) {
                  return JSON.parse(storedValue) as ScrollPosition;
              }
          } catch (error) {
              console.error(`[useScrollRestoration] Error reading sessionStorage for key "${key}":`, error);
              // Fallback to memory cache if reading fails (though setting caused the initial fallback)
              isUsingMemoryCacheRef.current = true;
          }
      }
      return null;
    }, [getStorageKey]);
  
    const setStoredScrollPosition = useCallback((position: ScrollPosition): void => {
      if (!IS_BROWSER || !enabledRef.current) return;
  
      const key = getStorageKey();
  
      // Try sessionStorage first, unless already failed
      if (!isUsingMemoryCacheRef.current) {
          try {
              sessionStorage.setItem(key, JSON.stringify(position));
              // If successful, ensure memory cache doesn't contain stale data for this key
               memoryCacheRef.current.delete(key);
              return; // Success
          } catch (error: any) {
              console.warn(`[useScrollRestoration] Error writing to sessionStorage for key "${key}", falling back to in-memory cache:`, error);
              // Check for QuotaExceededError specifically
              if (error?.name === 'QuotaExceededError') {
                  isUsingMemoryCacheRef.current = true;
                  console.warn(`[useScrollRestoration] SessionStorage quota exceeded. Using in-memory cache for ID: ${id}`);
              } else {
                   // Don't fallback for other errors, just log
                   console.error(`[useScrollRestoration] Unknown sessionStorage error:`, error);
                   return;
              }
          }
      }
  
      // If sessionStorage failed or is bypassed, use memory cache
      if (isUsingMemoryCacheRef.current) {
          memoryCacheRef.current.set(key, position);
      }
  
    }, [getStorageKey, id]);
  
    const clearStoredPosition = useCallback(() => {
      if (!IS_BROWSER) return;
      const key = getStorageKey();
      try {
          sessionStorage.removeItem(key);
      } catch (error) {
          console.error(`[useScrollRestoration] Error removing sessionStorage key "${key}":`, error);
      }
      memoryCacheRef.current.delete(key);
      // console.log(`[useScrollRestoration] Cleared stored position for ID: ${id}`);
    }, [getStorageKey, id]);
  
  
    // --- Core Logic ---
  
    const getCurrentScrollPosition = useCallback((): ScrollPosition => {
      if (!IS_BROWSER) return { x: 0, y: 0 };
      const targetElement = targetRef.current;
      if (targetElement) {
        // Specific element scroll
        return { x: targetElement.scrollLeft, y: targetElement.scrollTop };
      } else {
        // Window scroll
        return { x: window.scrollX, y: window.scrollY };
      }
    }, [targetRef]);
  
    const saveScrollPosition = useCallback(() => {
        setStoredScrollPosition(getCurrentScrollPosition());
    }, [getCurrentScrollPosition, setStoredScrollPosition]);
  
    // Store the debounced function in a ref to keep it stable
    useEffect(() => {
        debounceSaveFnRef.current = rafDebounce(saveScrollPosition, debounceDelay);
        // Cleanup function for the debouncer itself when delay changes
        return () => {
            debounceSaveFnRef.current?.cancel();
        };
    }, [saveScrollPosition, debounceDelay]);
  
  
    const handleScroll = useCallback(() => {
        // Early exit if disabled
        if (!enabledRef.current) {
            return;
        }
        debounceSaveFnRef.current?.();
    }, [/* enabledRef is checked inside */]);
  
    // Flush save immediately (e.g., for pagehide)
    const flushSave = useCallback(() => {
        if (!enabledRef.current || !IS_BROWSER) return;
        debounceSaveFnRef.current?.flush();
    }, [/* enabledRef checked inside */]);
  
  
    const restoreFocus = useCallback(() => {
        if (!IS_BROWSER || !enabledRef.current) return;
  
        const elementToFocus = prevFocusRef.current;
        // Only restore if focus is currently on the body AND the previous element still exists
        if (elementToFocus && elementToFocus.isConnected && document.activeElement === document.body) {
            // Check if elementToFocus is actually focusable (basic check)
            if (typeof (elementToFocus as HTMLElement).focus === 'function') {
                 try {
                     (elementToFocus as HTMLElement).focus({ preventScroll: true }); // Prevent scroll jump on focus
                 } catch (e) {
                     console.warn('[useScrollRestoration] Failed to restore focus:', e);
                 }
            }
        }
        prevFocusRef.current = null; // Clear after attempt
    }, [/* enabledRef checked inside */]);
  
  
    const restoreScrollPosition = useCallback(() => {
        if (!IS_BROWSER || !enabledRef.current) return false; // Indicate restoration was skipped
  
        const storedPosition = getStoredScrollPosition();
        if (!storedPosition || (storedPosition.x === 0 && storedPosition.y === 0)) {
            // No position stored, or it's already at top-left, no restore needed
            // Still potentially restore focus if applicable (e.g. navigating back to a page already at 0,0)
            restoreFocus();
            onRestorationComplete?.();
            return false; // Indicate restoration didn't happen
        }
  
        // Save current focus BEFORE potential scroll changes
        if (document.activeElement !== document.body) {
             prevFocusRef.current = document.activeElement;
        } else {
             prevFocusRef.current = null;
        }
  
        const targetElement = targetRef.current;
        const performScroll = () => {
            // Check if reduced motion is preferred
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const behavior: ScrollBehavior = prefersReducedMotion ? 'instant' : 'auto'; // 'auto' is often instant anyway
  
            try {
                if (targetElement) {
                    // Element scroll: Check element still exists before scrolling
                    if(targetElement.isConnected) {
                       targetElement.scrollTo({ top: storedPosition.y, left: storedPosition.x, behavior });
                    }
                } else {
                    // Window scroll
                    window.scrollTo({ top: storedPosition.y, left: storedPosition.x, behavior });
                }
            } catch (error) {
                console.error('[useScrollRestoration] Error during scrollTo:', error);
            } finally {
                 // Attempt focus restore AFTER scroll attempt
                 restoreFocus();
                 // Signal completion
                 onRestorationComplete?.();
            }
        };
  
        // Execute scroll within requestAnimationFrame to avoid layout thrashing
        window.requestAnimationFrame(performScroll);
        return true; // Indicate restoration was attempted
  
    }, [getStoredScrollPosition, targetRef, restoreFocus, onRestorationComplete /* enabledRef checked inside */]);
  
  
    // --- Effects ---
  
    // Update enabledRef when prop changes
    useEffect(() => {
      enabledRef.current = enabled;
    }, [enabled]);
  
    // Warn if both elementRef and internalRef are used and different
    useIsomorphicLayoutEffect(() => {
        if (propsElementRef?.current && internalRef.current && propsElementRef.current !== internalRef.current) {
            console.warn('[useScrollRestoration] Both `elementRef` prop and the hook\'s returned ref seem to be attached to different elements. Ensure only one is used for the intended scroll container, preferably the `elementRef` prop.');
        }
    }, [propsElementRef]);
  
  
    // Main effect for setting up restoration, listeners, and cleanup
    useIsomorphicLayoutEffect(() => {
      if (!IS_BROWSER || !enabled || !id) {
        return; // Do nothing if disabled, SSR, or no ID
      }
  
      const targetElement = targetRef.current; // Element or null (implies window)
      const scrollTarget = targetElement ?? window;
  
      // --- Restoration ---
      let restorationAttempted = false;
      const requiresIntersectionObserver = delayRestoreUntilVisible && targetElement;
  
      if (requiresIntersectionObserver) {
          // Use Intersection Observer to delay restore
          observerRef.current = new IntersectionObserver(
              (entries) => {
                  entries.forEach((entry) => {
                      if (entry.isIntersecting && entry.target === targetElement) {
                           // Debounce slightly to handle rapid visibility changes (e.g., cached images)
                           const intersectionTimeout = setTimeout(() => {
                              if (observerRef.current) { // Check if still mounted/enabled
                                  // Restore scroll FIRST
                                  restorationAttempted = restoreScrollPosition();
                                  // Stop observing once visible and restored
                                  observerRef.current.unobserve(targetElement);
                                  observerRef.current.disconnect();
                                  observerRef.current = null; // Clear ref
                              }
                           }, 50); // Small debounce
  
                           // Clear timeout on cleanup if component unmounts before timeout fires
                           return () => clearTimeout(intersectionTimeout);
                      }
                  });
              },
              { threshold: 0.01 } // Trigger when even a tiny bit is visible
          );
          observerRef.current.observe(targetElement);
  
      } else {
          // Restore immediately (or if target is window, delay flag is ignored)
          restorationAttempted = restoreScrollPosition();
      }
  
  
      // --- Event Listeners ---
      scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('pagehide', flushSave); // Use pagehide for BFCache compatibility
  
      // --- Cleanup ---
      return () => {
        scrollTarget.removeEventListener('scroll', handleScroll);
        window.removeEventListener('pagehide', flushSave);
        observerRef.current?.disconnect(); // Disconnect observer if it exists
        observerRef.current = null;
        debounceSaveFnRef.current?.cancel(); // Cancel any pending debounced save
  
        // If restoration was never attempted (e.g., unmounted before visible),
        // or if save wasn't flushed by pagehide, save current position on unmount/disable.
        // This covers cases like navigating away *before* element becomes visible.
        if (enabledRef.current) { // Only save if it was enabled before cleanup
           flushSave();
        }
      };
  
      // Dependencies: Re-run effect if ID, target element, enabled state, or delay strategy changes.
    }, [
        id,
        enabled,
        targetRef, // Changes if propsElementRef changes or internalRef gets attached
        delayRestoreUntilVisible,
        handleScroll,
        flushSave,
        restoreScrollPosition // Include restore function as it depends on callbacks/refs
     ]);
  
  
     // --- HMR Cleanup (Optional, depends on bundler) ---
     useEffect(() => {
          // This runs once on mount
          // @ts-ignore: Check for HMR API
          if (import.meta.hot) {
              // @ts-ignore
              import.meta.hot.dispose(() => {
                  // console.log(`[useScrollRestoration HMR] Clearing storage for ID: ${id}`);
                  clearStoredPosition(); // Clear storage on hot reload to prevent stale positions
              });
          }
     }, [id, clearStoredPosition /* Run only once per ID essentially */]);
  
  
    // --- Imperative Handle ---
    useImperativeHandle(imperativeRef, (): ScrollRestorationHandle => ({
        flushSave,
        clearStoredPosition,
    }), [flushSave, clearStoredPosition]);
  
  
    // Return the internal ref primarily for cases where no elementRef prop is provided
    return internalRef; // User attaches this ref if they didn't provide props.elementRef
  }