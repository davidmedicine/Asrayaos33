// ──────────────────────────────────────────────────────────────
// File: src/components/panels/PanelGroup/usePanelGroupState.ts
// Role: Central selector + memo helper for PanelGroupRoot.
//       Pulls data from the global layout store, filters it,
//       and tracks whether motion is allowed on the client.
// ──────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { shallow } from "zustand/shallow";

import { useLayoutStore } from '@/lib/state/slices/layoutSlice';
import { prefersReducedMotion } from "@/lib/motiontokens";
import { useInteractionContext } from "@/hooks/useInteractionContext";

import type {
  PanelLayoutDefinition,
  PanelInstance,
  ContextLayoutState,
} from "@/types/layout";

/** What the root component expects from this hook */
export interface PanelGroupState {
  /** `true` once we have a layout definition **and** at least one panel. */
  ready: boolean;
  /** `true` if the client can run motion (no `prefers-reduced-motion`). */
  motionEnabled: boolean;
  /** Active layout definition, may be `null` while loading/SSR. */
  panelLayoutDefinition: PanelLayoutDefinition | null;
  /** Already-validated list of panels for the active layout. */
  panels: PanelInstance[];
}

/**
 * usePanelGroupState
 *
 * 1. Subscribes to the zustand layout slice.
 * 2. Cleans & memoises the panel list (filters out broken defs).
 * 3. Detects `prefers-reduced-motion` on the client only.
 */
export function usePanelGroupState(instanceId: string): PanelGroupState {
  /* -----------------------------------------------
   * 1. Global layout store selectors
   * --------------------------------------------- */
  const {
    activeContextKey,
    panelLayoutDefinition,
    contextLayouts,
  } = useLayoutStore(
    (s) => ({
      activeContextKey: s.activeContextKey,
      panelLayoutDefinition: s.panelLayoutDefinition,
      contextLayouts: s.contextLayouts,
    }),
    shallow,
  );

  /* -----------------------------------------------
   * 2. Build the panel array derived from definition
   * --------------------------------------------- */
  const panels = useMemo<PanelInstance[]>(() => {
    const defs = panelLayoutDefinition?.layout?.panels ?? [];
    return defs.filter((p) => p?.id && p?.component);
  }, [panelLayoutDefinition]);

  /* -----------------------------------------------
   * 3. Prefers-reduced-motion check (client only)
   * --------------------------------------------- */
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    // Runs only in the browser
    setMotionEnabled(!prefersReducedMotion());
  }, []);

  /* -----------------------------------------------
   * 4. Ready flag – when the layout + panels exist
   * --------------------------------------------- */
  const ready = !!panelLayoutDefinition && panels.length > 0;

  return {
    ready,
    motionEnabled,
    panelLayoutDefinition: panelLayoutDefinition ?? null,
    panels,
  };
}
