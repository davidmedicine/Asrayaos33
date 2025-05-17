// src/app/(main)/layout.tsx
'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  startTransition,
  useCallback,
  type ReactNode,
  useState, // Added for stable callback pattern if needed
} from 'react';
// Import Activity API (assuming @types/react@experimental is installed)
import {
  // unstable_Activity as Activity, // Keep Activity for potential future use in child pages
  unstable_startActivity as startActivity,
} from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  useActiveContextKey,
  useCycleSidebarState,
  useIsSidebarOpen,
  useIsLoading,
  useLayoutError,
  usePanelLayoutDefinition,
  useLoadLayoutState,
} from '@/lib/state/selectors/layout';
import { setActiveContextKey } from '@/lib/state/actions/layout';
import { resolveContextKey, DEFAULT_COMPASS_KEY } from '@/lib/core/layoutRegistry';
import { useMotion } from '@/hooks/useMotion';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import '@/lib/gsapSetup'; // Ensure GSAP setup runs (includes SSR guard)

// --- Static Imports ---
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// --- Constants ---
const SCROLL_RESTORATION_PREFIX = 'scrollRestoration_panel-cache-';
const DEV = process.env.NODE_ENV !== 'production'; // Consistent DEV check

// --- Feature Detection ---
const VTA_SUPPORTED =
  typeof document !== 'undefined' && 'startViewTransition' in document;
// Check if the Activity API function exists (requires react@experimental)
const ACTIVITY_API_SUPPORTED = typeof startActivity === 'function';

if (DEV) {
  console.log('[Layout Features]', {
    VTA_SUPPORTED,
    ACTIVITY_API_SUPPORTED,
    REACT_VERSION: React.version,
    // Current Date: Sunday, April 27, 2025 (Note: Date from prompt, not dynamic)
  });
}

// --- Helper for Development Error Display ---
const DevDynamicImportError = ({
  componentName,
  error,
}: {
  componentName: string;
  error?: string;
}) => (
  <div
    style={{
      border: '2px solid red',
      padding: '1em',
      margin: '0.5em',
      color: 'red',
      backgroundColor: '#fff0f0',
    }}
  >
    <strong>Dynamic Import Error (Dev):</strong> Failed to load '{componentName}'.
    {error && (
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: '0.8em',
          marginTop: '0.5em',
        }}
      >
        {error}
      </pre>
    )}
    Check console for more details.
  </div>
);

// --- Dynamic Imports (Directly using next/dynamic with literal options) ---

// TooltipProvider (Handles named export)
const TooltipProvider = dynamic(
  async () => {
    const componentName = 'TooltipProvider';
    try {
      const mod = await import('@/components/ui/Tooltip');
      const Component = mod.TooltipProvider;
      if (
        !Component ||
        (typeof Component !== 'function' && typeof Component !== 'object')
      ) {
        const available = mod ? Object.keys(mod).join(', ') : 'module load failed';
        const errorMsg = `Named export '${componentName}' not found or invalid. Available: ${available}`;
        console.error(`[Layout] ${errorMsg}`, mod);
        return {
          default: () => (
            <DevDynamicImportError
              componentName={componentName}
              error={errorMsg}
            />
          ),
        };
      }
      // next/dynamic requires the component under the 'default' key
      return { default: Component };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[Layout] Failed to load ${componentName}:`, err);
      return {
        default: () => (
          <DevDynamicImportError componentName={componentName} error={error} />
        ),
      };
    }
  },
  // --- Options must be an object literal ---
  { ssr: false },
);

// Topbar
const Topbar = dynamic(
  async () => {
    const componentName = 'Topbar';
    try {
      // Assuming Topbar has a default export
      const mod = await import('@/components/layout/Topbar');
      if (
        DEV &&
        (!mod || (typeof mod.default !== 'function' && typeof mod.default !== 'object'))
      ) {
        console.error(
          `[Layout] Dynamic import error: ${componentName} is missing a 'default' export.`,
          mod,
        );
        return {
          default: () => (
            <DevDynamicImportError
              componentName={componentName}
              error="Missing default export"
            />
          ),
        };
      }
      return mod; // Contains default export
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[Layout] Failed to load ${componentName}:`, err);
      return {
        default: () => (
          <DevDynamicImportError componentName={componentName} error={error} />
        ),
      };
    }
  },
  // --- Options must be an object literal ---
  { ssr: true },
);

// Sidebar
const Sidebar = dynamic(
  async () => {
    const componentName = 'Sidebar';
    try {
      const mod = await import('@/components/layout/Sidebar');
      if (
        DEV &&
        (!mod || (typeof mod.default !== 'function' && typeof mod.default !== 'object'))
      ) {
        console.error(
          `[Layout] Dynamic import error: ${componentName} is missing a 'default' export.`,
          mod,
        );
        return {
          default: () => (
            <DevDynamicImportError
              componentName={componentName}
              error="Missing default export"
            />
          ),
        };
      }
      return mod;
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[Layout] Failed to load ${componentName}:`, err);
      return {
        default: () => (
          <DevDynamicImportError componentName={componentName} error={error} />
        ),
      };
    }
  },
  // --- Options must be an object literal ---
  { ssr: true },
);

// Loading component for PanelGroup
const PanelGroupLoading = () => (
  <div
    className="flex h-full w-full items-center justify-center"
    role="status"
    aria-live="polite"
  >
    <LoadingSpinner size="lg" aria-label="Loading content panels..." />
  </div>
);

// PanelGroup
const PanelGroup = dynamic(
  async () => {
    const componentName = 'PanelGroup';
    try {
      const mod = await import('@/components/panels/PanelGroup');
      if (
        DEV &&
        (!mod || (typeof mod.default !== 'function' && typeof mod.default !== 'object'))
      ) {
        console.error(
          `[Layout] Dynamic import error: ${componentName} is missing a 'default' export.`,
          mod,
        );
        return {
          default: () => (
            <DevDynamicImportError
              componentName={componentName}
              error="Missing default export"
            />
          ),
        };
      }
      return mod;
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[Layout] Failed to load ${componentName}:`, err);
      return {
        default: () => (
          <DevDynamicImportError componentName={componentName} error={error} />
        ),
      };
    }
  },
  // --- Options must be an object literal ---
  {
    ssr: false,
    loading: PanelGroupLoading, // Reference the loading component function
  },
);

// CompassNav (Mobile)
const CompassNav = dynamic(
  async () => {
    const componentName = 'CompassNavMobile';
    try {
      const mod = await import('@/components/navigation/CompassNavMobile');
      if (
        DEV &&
        (!mod || (typeof mod.default !== 'function' && typeof mod.default !== 'object'))
      ) {
        console.error(
          `[Layout] Dynamic import error: ${componentName} is missing a 'default' export.`,
          mod,
        );
        return {
          default: () => (
            <DevDynamicImportError
              componentName={componentName}
              error="Missing default export"
            />
          ),
        };
      }
      return mod;
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[Layout] Failed to load ${componentName}:`, err);
      return {
        default: () => (
          <DevDynamicImportError componentName={componentName} error={error} />
        ),
      };
    }
  },
  // --- Options must be an object literal ---
  { ssr: false },
);

// CompassDPad (Desktop)
const CompassDPad = dynamic(
  async () => {
    const componentName = 'CompassDPadDesktop';
    try {
      const mod = await import('@/components/navigation/CompassDPadDesktop');
      if (
        DEV &&
        (!mod || (typeof mod.default !== 'function' && typeof mod.default !== 'object'))
      ) {
        console.error(
          `[Layout] Dynamic import error: ${componentName} is missing a 'default' export.`,
          mod,
        );
        return {
          default: () => (
            <DevDynamicImportError
              componentName={componentName}
              error="Missing default export"
            />
          ),
        };
      }
      return mod;
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[Layout] Failed to load ${componentName}:`, err);
      return {
        default: () => (
          <DevDynamicImportError componentName={componentName} error={error} />
        ),
      };
    }
  },
  // --- Options must be an object literal ---
  { ssr: false },
);

// WorldSceneOverlay
const WorldSceneOverlay = dynamic(
  async () => {
    const componentName = 'WorldSceneOverlay';
    try {
      const mod = await import('@/components/world/WorldSceneOverlay');
      if (
        DEV &&
        (!mod || (typeof mod.default !== 'function' && typeof mod.default !== 'object'))
      ) {
        console.error(
          `[Layout] Dynamic import error: ${componentName} is missing a 'default' export.`,
          mod,
        );
        return {
          default: () => (
            <DevDynamicImportError
              componentName={componentName}
              error="Missing default export"
            />
          ),
        };
      }
      return mod;
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[Layout] Failed to load ${componentName}:`, err);
      return {
        default: () => (
          <DevDynamicImportError componentName={componentName} error={error} />
        ),
      };
    }
  },
  // --- Options must be an object literal ---
  {
    ssr: false,
    loading: () => null, // No visual loader
  },
);

// --- LRU Cache for Panels ---
type CacheEntry = { node: ReactNode; ts: number };
// LRUCacheRecord class remains the same as provided previously...
class LRUCacheRecord<K extends string, V extends CacheEntry> {
  private maxSize: number;
  private cache: Map<K, V>;
  private scrollRestorationPrefix = SCROLL_RESTORATION_PREFIX;

  constructor(maxSize: number = 10) {
    if (maxSize < 1) throw new Error('LRUCache max size must be >= 1');
    this.maxSize = maxSize;
    this.cache = new Map<K, V>();
  }

  get(key: K): V['node'] | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      entry.ts = Date.now();
      this.cache.set(key, entry);
      return entry.node;
    }
    return undefined;
  }

  set(key: K, value: V['node']): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this._clearScrollRestoration(oldestKey);
      }
    }
    this.cache.set(key, { node: value, ts: Date.now() } as V);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith(this.scrollRestorationPrefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
        if (DEV) console.log('[LRUCacheRecord] Cleared panel cache and related scroll positions.');
      } catch (e) {
        console.warn(
          `[LRUCacheRecord] Failed to clear all scroll restoration entries:`,
          e,
        );
      }
    }
  }

  private _clearScrollRestoration(key: K): void {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined')
      return;
    try {
      sessionStorage.removeItem(`${this.scrollRestorationPrefix}${key}`);
    } catch (e) {
      console.warn(
        `[LRUCacheRecord] Failed to clear scroll restoration for key "${key}":`,
        e,
      );
    }
  }
}
// Create a single instance - it's stable by definition
const globalPanelCache = new LRUCacheRecord<string, CacheEntry>(10);

// Hot-Reload Cache Clear (Development only)
if (
  typeof window !== 'undefined' &&
  DEV &&
  (import.meta as any).hot // Type assertion for Vite/Next HMR API
) {
  (import.meta as any).hot.dispose(() => {
    console.log('[HMR] Clearing layout panel cache.');
    globalPanelCache.clear();
  });
}

// --- Hooks ---

// Performance Mark Helper (Unchanged - uses useCallback internally)
const usePerformanceMarks = () => {
  const canMeasure = useMemo(
    () =>
      typeof performance !== 'undefined' &&
      typeof performance.mark === 'function' &&
      typeof performance.measure === 'function',
    [],
  );

  const markStart = useCallback(
    (key: string) => {
      if (!canMeasure) return;
      try {
        performance.mark(`layoutTransitionStart_${key}`);
      } catch (e) {
        console.warn(`Perf markStart failed for ${key}:`, e);
      }
    },
    [canMeasure],
  ); // Stable dep

  const markEnd = useCallback(
    (key: string) => {
      if (!canMeasure) return;
      try {
        const startMark = `layoutTransitionStart_${key}`;
        const endMark = `layoutTransitionEnd_${key}`;
        const measureName = `layoutTransitionDuration_${key}`;
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);
      } catch (e) {
        console.warn(`Perf markEnd/measure failed for ${key}:`, e);
      }
    },
    [canMeasure],
  ); // Stable dep

  return { markStart, markEnd };
};

// Layout Transition Hook (Updated for Activity API & Stable Deps)
function useLayoutTransition(
  currentPath: string | null,
  currentActiveContextKey: string | null,
  isReducedMotion: boolean,
) {
  const isTransitioning = useRef(false);
  // These mark functions are guaranteed stable by usePerformanceMarks' useCallback
  const { markStart, markEnd } = usePerformanceMarks();

  // --- Effect for handling transitions ---
  useEffect(() => {
    const nextCtx = resolveContextKey(currentPath);

    if (
      isTransitioning.current ||
      nextCtx === null ||
      nextCtx === currentActiveContextKey
    ) {
      // Handle edge case: navigating back to root might not change path but context needs reset
      if (
        currentPath === '/' &&
        nextCtx === DEFAULT_COMPASS_KEY &&
        currentActiveContextKey !== DEFAULT_COMPASS_KEY
      ) {
        if (DEV) console.log(
          `[LayoutTransition] Forcing context to default ('${DEFAULT_COMPASS_KEY}') for root path.`,
        );
        // setActiveContextKey is assumed stable (imported action)
        startTransition(() => {
          setActiveContextKey(DEFAULT_COMPASS_KEY);
        });
      }
      return; // No transition needed or already in progress
    }

    if (DEV) console.log(
      `[LayoutTransition] Path "${currentPath}" -> Context "${nextCtx}". Current: "${currentActiveContextKey}". Starting transition.`,
    );
    isTransitioning.current = true;
    markStart(nextCtx); // markStart is stable

    let prevFocus: HTMLElement | null = null;
    try {
      prevFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    } catch (e) {
      console.warn('[LayoutTransition] Error accessing document.activeElement:', e);
    }

    // Define restoreFocus inside effect: references prevFocus from this specific transition
    const restoreFocus = () => {
      try {
        if (prevFocus?.focus && document.body.contains(prevFocus)) {
          prevFocus.focus({ preventScroll: true });
        } else {
          // Fallback focus target
          document.getElementById('asraya-main')?.focus({ preventScroll: true });
        }
      } catch (e) {
        console.warn('[LayoutTransition] Error restoring focus:', e);
      }
    };

    // Define updateState inside effect: references nextCtx from this specific transition
    // setActiveContextKey is an imported action, assumed stable.
    const updateState = () => {
      startTransition(() => {
        setActiveContextKey(nextCtx);
      });
    };

    // Define finalizeTransition inside effect: references nextCtx, markEnd, restoreFocus
    const finalizeTransition = () => {
      markEnd(nextCtx); // markEnd is stable
      isTransitioning.current = false;
      restoreFocus();
      // TODO: Coordinate GSAP Flip. If Flip runs inside Activity's onReady (in child pages),
      // this finalize might primarily be for cleanup and focus restoration. Ensure Flip runs
      // *before* VTA/Activity commit snapshot phase for smoothest results.
      if (DEV) console.log(`[LayoutTransition] Transition to "${nextCtx}" finalized.`);
    };

    // --- Transition Logic: Prefer Activity > VTA > Fallback ---
    if (!isReducedMotion && ACTIVITY_API_SUPPORTED) {
      if (DEV) console.log(`[LayoutTransition] Using React Activity API (experimental).`);
      startActivity('compass-jump', updateState)
        .finished.then(finalizeTransition)
        .catch((err) => {
          console.error(
            '[LayoutTransition] Activity Transition failed/interrupted, falling back:',
            err,
          );
          // Fallback: update state immediately and finalize on next frame
          updateState();
          requestAnimationFrame(finalizeTransition);
        });
    } else if (
      !isReducedMotion &&
      VTA_SUPPORTED &&
      document.startViewTransition
    ) {
      if (DEV) console.log(`[LayoutTransition] Using View Transitions API.`);
      document
        .startViewTransition(updateState)
        .finished.then(finalizeTransition)
        .catch((err) => {
          console.error(
            '[LayoutTransition] View Transition failed/skipped, falling back:',
            err,
          );
          // Fallback: update state immediately and finalize on next frame
          updateState();
          requestAnimationFrame(finalizeTransition);
        });
    } else {
      if (DEV) console.log(
        `[LayoutTransition] Using fallback transition (ReducedMotion: ${isReducedMotion}, Activity: ${ACTIVITY_API_SUPPORTED}, VTA: ${VTA_SUPPORTED}).`,
      );
      // Fallback: update state immediately and finalize on next frame
      updateState();
      requestAnimationFrame(finalizeTransition);
    }

    // Dependencies: Effect should re-run if the path, current context, motion preference,
    // or the performance marking functions change.
    // Functions defined inside (updateState, finalizeTransition, restoreFocus)
    // are recreated anyway, but depend on values captured from these dependencies.
    // setActiveContextKey is assumed stable from import.
  }, [currentPath, currentActiveContextKey, isReducedMotion, markStart, markEnd]); // Added markStart/End, removed eslint-disable
}

// --- Panel Cache Component ---
interface PanelCacheProps {
  cacheKey: string;
  children: ReactNode;
  className?: string;
}
const PanelCache: React.FC<PanelCacheProps> = React.memo(
  ({ cacheKey, children, className }) => {
    const scrollableElementRef = useRef<HTMLDivElement>(null);
    // Use useState to ensure we check the cache only once initially per key render
    const [isInitiallyCached] = useState(() => globalPanelCache.has(cacheKey));
    const cachedNode = useMemo(() => {
      // Only get from cache if it was present on initial render for this key
      return isInitiallyCached ? globalPanelCache.get(cacheKey) : undefined;
    }, [cacheKey, isInitiallyCached]); // isInitiallyCached ensures this runs once per mount for the key

    // Scroll restoration depends on whether the content was initially cached
    useScrollRestoration(
      `${SCROLL_RESTORATION_PREFIX}${cacheKey}`,
      isInitiallyCached, // Restore if it was cached initially
      scrollableElementRef,
    );

    useEffect(() => {
      // Set cache only if it wasn't initially cached for this key instance
      if (!isInitiallyCached) {
        // globalPanelCache instance and its 'set' method are stable
        globalPanelCache.set(cacheKey, children);
      }
      // Dependencies: Run when key or children change, but only set cache if not initially cached.
      // isInitiallyCached is stable for the component instance lifecycle tied to the key.
      // globalPanelCache is stable.
    }, [cacheKey, children, isInitiallyCached]);

    return (
      <div key={cacheKey} className={className} ref={scrollableElementRef}>
        {/* Render cached node if initially cached, otherwise render fresh children */}
        {isInitiallyCached ? cachedNode : children}
      </div>
    );
  },
);
PanelCache.displayName = 'PanelCache';

// --- Main Layout Component ---
export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { prefersReduced: isReducedMotion } = useMotion();

  // State selectors
  const activeContextKey = useActiveContextKey();
  const isSidebarOpen = useIsSidebarOpen();
  const cycleSidebarStateSelector = useCycleSidebarState(); // Raw selector result
  const isLoadingDefinitions = useIsLoading();
  const error = useLayoutError();
  const panelLayoutDefinition = usePanelLayoutDefinition();
  const loadLayoutStateSelector = useLoadLayoutState(); // Raw selector result

  // --- Stable Callbacks for Store Actions/Functions ---
  // Wrap potentially changing selector results in useCallback to ensure stable references
  // for effects and event handlers, satisfying exhaustive-deps.
  const stableLoadLayoutState = useCallback(() => {
    if (loadLayoutStateSelector) {
      loadLayoutStateSelector();
    } else if (DEV) {
      // Log error if the selector returns falsy when the callback is invoked
      console.error(
        "[MainLayout] stableLoadLayoutState invoked, but 'useLoadLayoutState' was falsy.",
      );
    }
  }, [loadLayoutStateSelector]); // Dependency is the function returned by the selector

  const stableCycleSidebarState = useCallback(() => {
    if (cycleSidebarStateSelector) {
      cycleSidebarStateSelector();
    } else if (DEV) {
      console.error(
        "[MainLayout] stableCycleSidebarState invoked, but 'useCycleSidebarState' was falsy.",
      );
    }
  }, [cycleSidebarStateSelector]); // Dependency is the function returned by the selector


  // Derived state
  const showWorldScene = panelLayoutDefinition?.meta?.hasWorld === true;
  const panelCacheKey = useMemo(
    () => activeContextKey ?? DEFAULT_COMPASS_KEY,
    [activeContextKey],
  );

  // --- Effects ---

  // Initial Load Effect: Now depends on the stable callback.
  // Ensures the dep array size (1) is constant across renders/HMR.
  useEffect(() => {
    stableLoadLayoutState();
  }, [stableLoadLayoutState]); // Use the memoized callback

  // Handle transitions between layout contexts using the dedicated hook
  useLayoutTransition(pathname, activeContextKey, isReducedMotion);

  // --- Event Handlers ---
  // Uses the stable callback for cycling sidebar state.
  const handleOverlayClick = useCallback(() => {
    if (isSidebarOpen) {
      stableCycleSidebarState(); // Use stable version
    }
  }, [isSidebarOpen, stableCycleSidebarState]); // Depend on stable callback

  // --- Memoized Props ---
  // Memoize complex props to avoid unnecessary re-renders of children
  const worldSceneProps = useMemo(
    () => ({
      devicePixelRatio:
        typeof window === 'undefined'
          ? 1
          : Math.min(window.devicePixelRatio ?? 1, 1.5),
      preserveDrawingBuffer: false, // Optimize for performance
    }),
    [], // Empty array: calculate only once
  );

  // --- Render Logic ---
  return (
    <TooltipProvider delayDuration={300}>
      {/* Global View Transition / Reduced Motion Styles (Unchanged) */}
      <style jsx global>{`
        @view-transition { navigation: auto; }
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation-duration: var(--motion-duration-medium, 300ms);
          animation-timing-function: var(--motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1));
          /* mix-blend-mode: plus-lighter; */
        }
        .vt-contain { contain: layout paint; } /* VTA snapshot optimization */
        @media (prefers-reduced-motion: reduce) {
          ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
          *, *::before, *::after {
            animation-delay: -1ms !important; animation-duration: 1ms !important; animation-iteration-count: 1 !important;
            background-attachment: initial !important; scroll-behavior: auto !important;
            transition-delay: 0s !important; transition-duration: 0s !important;
          }
          html, body { scroll-behavior: auto !important; }
        }
      `}</style>

      <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-background-base)] text-[var(--color-text-base)] antialiased">
        <CompassDPad className="hidden md:block" />
        <Topbar />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar navId="primary-sidebar" />

          {/* Mobile Sidebar Overlay */}
          <button
            type="button"
            aria-controls="primary-sidebar"
            aria-expanded={isSidebarOpen}
            aria-label="Close sidebar"
            onClick={handleOverlayClick} // Uses memoized handler
            data-state={isSidebarOpen ? 'open' : 'closed'}
            className={cn(
              'fixed inset-0 z-[var(--z-overlay)] bg-black/60 md:hidden',
              'transition-opacity duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-standard)]',
              isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
            aria-hidden={!isSidebarOpen}
            // --- FIX START ---
            // Correctly handle the boolean 'inert' attribute for React 19+.
            // 'inert' should be present (true) when the sidebar is CLOSED (!isSidebarOpen)
            // to make the overlay button non-interactive along with being visually hidden.
            // It should be absent (undefined) when the sidebar is OPEN (isSidebarOpen).
            inert={isSidebarOpen ? undefined : true}
            // --- FIX END ---
            tabIndex={isSidebarOpen ? 0 : -1}
          />

          {/* Main Content Area */}
          <main
            id="asraya-main"
            role="main"
            data-layout={activeContextKey ?? 'loading'}
            className={cn(
              'relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden',
              'pb-[env(safe-area-inset-bottom,0px)]',
              'ps-[env(safe-area-inset-left,0px)]',
              'pe-[env(safe-area-inset-right,0px)]',
              'p-4 md:p-6',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-[var(--color-background-base)]',
            )}
            tabIndex={-1} // Allow programmatic focus
          >
            {showWorldScene && <WorldSceneOverlay {...worldSceneProps} />}

            <div className="relative z-[1] flex-1">
              {isLoadingDefinitions ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex h-full items-center justify-center text-[var(--color-text-muted)]"
                >
                  <LoadingSpinner
                    size="lg"
                    aria-label="Loading layout definitions"
                  />
                  <span className="ml-2 text-sm">Loading layout…</span>
                </div>
              ) : error ? (
                <div
                  role="alert"
                  className="flex h-full flex-col items-center justify-center p-4 text-center text-[var(--color-text-error)]"
                >
                  <h2 className="mb-2 text-lg font-semibold">Layout Error</h2>
                  <p className="text-sm">{error}</p>
                </div>
              ) : !panelLayoutDefinition ? (
                <div
                  role="status"
                  className="flex h-full items-center justify-center p-4 text-center text-[var(--color-text-subtle)]"
                >
                  Layout context "{activeContextKey}" did not resolve to a valid
                  definition.
                </div>
              ) : (
                <PanelCache cacheKey={panelCacheKey} className="h-full w-full">
                  {/* TODO: Wrap actual page route content (e.g., in /center/page.tsx)
                           with <Activity mode={isActive ? 'visible' : 'hidden'}>...</Activity>.
                           This layout provides the trigger (useLayoutTransition hook),
                           but the <Activity> component itself manages the mounting/state
                           of the inactive content within the specific page. */}
                  <PanelGroup
                    id={`panel-layout-${panelCacheKey}`}
                    // Add vt-contain class for VTA snapshot optimization
                    className="h-full vt-contain"
                    allowResize // Assumes PanelGroup handles this prop
                  >
                    {/* Next.js router renders the matched page component here */}
                    {children}
                  </PanelGroup>
                </PanelCache>
              )}
            </div>

            <CompassNav className="md:hidden" />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}