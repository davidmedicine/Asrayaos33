// src/lib/hooks/useInteractionContext.ts
// -----------------------------------------------------------------------------
// v2.0 – 2025‑05‑04  ✨ desktop‑first rewrite
// -----------------------------------------------------------------------------
//  • Tightens the mobile heuristic: **mobile = viewport width < 768 px**
//    Touch‑screen laptops are therefore treated as desktop, fixing the
//    misclassification caused by `pointer: coarse` on Windows 2‑in‑1s and
//    MacBooks with multi‑touch trackpads.
//  • Still SSR‑safe (assumes desktop on the server) and hydration‑safe
//    (runs the media‑query synchronously on first client paint).
//  • rAF‑throttled resize listener keeps `isMobile` reactive without floods.
//  • `forceDesktop` / `forceMobile` escape‑hatches retained for debugging.
// -----------------------------------------------------------------------------

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/state/store';
import { getPanelDefinition } from '@/lib/core/layoutRegistry';
import type { PanelLayoutDefinition } from '@/types/layout';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// -----------------------------------------------------------------------------
/**
 * Tailwind’s `md` breakpoint starts at 768 px.
 * Anything **< 768 px** is considered “mobile”.
 *
 * ❌ We deliberately *exclude* `(pointer: coarse)` because many laptops with
 *    touch screens report a coarse pointer even when a precision trackpad or
 *    mouse is the primary input. See Edge / Firefox bugs 1638556 for details.
 */
const MOBILE_QUERY = '(max-width: 767px)';

/** Thin wrapper around `matchMedia` that returns `false` server‑side. */
const mediaMatches = (q: string): boolean =>
  typeof window !== 'undefined' && window.matchMedia(q).matches;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// -----------------------------------------------------------------------------
export interface InteractionContextValue {
  activeContextKey: string | null;
  activePanelId: string | null;
  panelLayoutDefinition: PanelLayoutDefinition | null;
  activeAgentId: string | null;
  /** `true` when viewport < 768 px. */
  isMobile: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// -----------------------------------------------------------------------------
export function useInteractionContext(
  opts: { forceDesktop?: boolean; forceMobile?: boolean } = {},
): InteractionContextValue {
  // ----- global state -------------------------------------------------------
  const activeContextKey = useStore((s) => s.activeContextKey);
  const activePanelId    = useStore((s) => s.activePanelId);
  const activeAgentId    = useStore((s) => s.activeAgentId) ?? 'oracle';

  // ----- viewport state -----------------------------------------------------
  const [isMobileReal, setIsMobileReal] = useState<boolean>(() =>
    mediaMatches(MOBILE_QUERY),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;
    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setIsMobileReal(mediaMatches(MOBILE_QUERY));
      });
    };

    window.addEventListener('resize', handler, { passive: true });
    // also run once in case resize never fires (e.g. orientation change)
    handler();
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ----- manual overrides ---------------------------------------------------
  const isMobile = opts.forceDesktop
    ? false
    : opts.forceMobile
      ? true
      : isMobileReal;

  // ----- derived layout definition -----------------------------------------
  const panelLayoutDefinition = useMemo<PanelLayoutDefinition | null>(() =>
    activeContextKey ? getPanelDefinition(activeContextKey) : null,
  [activeContextKey]);

  // ----- aggregated result --------------------------------------------------
  return {
    activeContextKey: activeContextKey ?? null,
    activePanelId:    activePanelId    ?? null,
    activeAgentId,
    panelLayoutDefinition,
    isMobile,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC HELPER (non‑reactive)
// -----------------------------------------------------------------------------
export function getInteractionContext(): InteractionContextValue {
  const s = useStore.getState();
  const key = s.activeContextKey ?? null;

  return {
    activeContextKey: key,
    activePanelId:    s.activePanelId ?? null,
    activeAgentId:    (s.activeAgentId ?? 'oracle') as string,
    panelLayoutDefinition: key ? getPanelDefinition(key) : null,
    // On the server we default to desktop so that all panels render.
    isMobile: false,
  };
}
