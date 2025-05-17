// ⬇️  src/services/navigation.ts
// ------------------------------------------------------------
// A thin, **UI-agnostic** helper for initiating client-side navigation
// that plays nicely with the “motion-trio” stack:
//
//   View-Transition API   →   React Activity (experimental)   →   GSAP Flip
//
// The helper deliberately **does not** import React hooks.
// Call it from your component / slice that already has a `router` instance
// (e.g. via `const router = useRouter()` in a React component)
//
// ------------------------------------------------------------
import { startTransition } from 'react';
import type { AppRouterInstance } from 'next/navigation';

import type { CompassDir } from '@/types/compass';
import { routeRegistry } from '@/lib/routing/registry';

/* -------------------------------------------------------------------------- */
/*  internal feature detection helpers                                        */
/* -------------------------------------------------------------------------- */

/** `true` when the View-Transition API is available in this browser */
const hasVTA = (): boolean =>
  typeof document !== 'undefined' &&
  // As of Chrome 111 / Safari 17.4 TP the API lives on `document`
  // - “startViewTransition” returns a promise-like object.
  typeof (document as any).startViewTransition === 'function';

/**
 * Wrap a callback in the View-Transition API *if it exists*.
 * Falls back to invoking the callback immediately on older browsers
 * or when the caller explicitly opts out.
 */
function withViewTransition(
  cb: () => void,
  { skip }: { skip: boolean },
): void {
  if (!skip && hasVTA()) {
    // @ts-expect-error – TS does not know about the VTA yet
    document.startViewTransition(cb);
  } else {
    cb();
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

export interface NavigateDirOptions {
  /**
   * `router` *must* be passed in by the caller
   * (e.g. from `const router = useRouter()` inside a component).
   */
  router: AppRouterInstance;
  /**
   * When `true`, skip the View-Transition API even if the browser supports it.
   * Useful for tests or explicit reduced-motion overrides.
   */
  skipViewTransition?: boolean;
  /**
   * Optional callback that will be executed *after* the route push succeeds
   * (successful promise resolution / immediate after push for fallback path).
   * Use this to commit global state, run GSAP Flip, etc.
   */
  onAfterNavigate?: () => void;
}

/**
 * Navigate to a compass direction in a way that cooperates with:
 *
 *  • **View-Transition API** – for buttery route morphs on Chrome 111+ / Safari 17.4+  
 *  • **React.startTransition** – mark non-urgent state updates (Zustand, React Context…)  
 *  • **GSAP Flip** – the caller can hook into `onAfterNavigate` to run FLIP animations
 *
 * ```ts
 * const router = useRouter();
 *
 * // inside a click handler
 * navigateDir('north', {
 *   router,
 *   onAfterNavigate: () => startTransition(() => setCurrentWorld('north')),
 * });
 * ```
 */
export function navigateDir(
  dir: CompassDir,
  { router, skipViewTransition = false, onAfterNavigate }: NavigateDirOptions,
): void {
  const routeInfo = routeRegistry[dir];

  if (!routeInfo) {
    // Compile-time typings should already prevent this, but guard at runtime too.
    console.error(`[navigateDir] No route found for direction "${dir}"`);
    return;
  }

  const doPush = () => {
    // Next 15 App Router push – returns a promise
    // We ignore the promise here; callers can supply their own `.then` if needed.
    router.push(routeInfo.path, { scroll: false });

    if (typeof onAfterNavigate === 'function') {
      // Defer to the micro-task queue so we run **after** Next.js has processed the push
      queueMicrotask(onAfterNavigate);
    }
  };

  // Wrap the router push in a View-Transition when available / allowed
  withViewTransition(doPush, { skip: skipViewTransition });
}
