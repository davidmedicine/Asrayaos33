// src/features/hub/components/leftpanel/unifiedChatListPanelConstants.ts

// -----------------------------------------------------------------------------
//  Unified‑Chat List‑Panel – Shared Constants
// -----------------------------------------------------------------------------
//  • Centralised UI + logic constants for the left‑hand Quest list panel.
//  • Anything imported from here *must* be safe for both browser and Node.
// -----------------------------------------------------------------------------

import type { Quest } from './useUnifiedChatPanelData'; // Keep typed for the sorter

/* --------------------------------------------------------------------------- */
/* UI Configuration                                                            */
/* --------------------------------------------------------------------------- */
export const ITEM_HEIGHT = 60;                     // px – row height for list items
export const VIRTUALIZATION_THRESHOLD = 50;        // virtualise lists ≥ this length
export const SEARCH_BAR_VISIBILITY_THRESHOLD = 5;  // show search once x items exist
export const INTRO_SPINNER_DELAY_MS = 300;         // debounce intro spinner (ms)
export const HEADER_MIN_HEIGHT_PX = 56;            // header min‑height (px)

/* --------------------------------------------------------------------------- */
/* React‑Query Defaults                                                         */
/* --------------------------------------------------------------------------- */
export const QUEST_QUERY_STALE_TIME = 5 * 60_000;   // 5 min
export const QUEST_QUERY_GC_TIME    = 15 * 60_000;  // 15 min

/* --------------------------------------------------------------------------- */
/* Domain Constants                                                             */
/* --------------------------------------------------------------------------- */
export const FIRST_FLAME_RITUAL_SLUG  = 'first-flame-ritual';
export const FIRST_FLAME_DAY_ONE_ROUTE = '/first-flame/day-1';

/**
 * Global, app‑wide routes that the UI needs to reference from TSX files.
 * You can extend this enum when new hard‑coded routes are introduced.
 */
export enum AppRoutes {
  /**  The canonical route for Day 1 of the First‑Flame ritual  */
  RitualDayOne = FIRST_FLAME_DAY_ONE_ROUTE,
  // Add further named routes here as your app grows…
}

/* --------------------------------------------------------------------------- */
/* UI State Machine                                                             */
/* --------------------------------------------------------------------------- */
export enum UIPanelPhase {
  INTRO       = 'intro',        // Initial loading / hero screen
  NORMAL      = 'normal',       // List shows quests
  ERROR       = 'error',        // Fatal fetch / auth error
  ONBOARDING  = 'onboarding',   // User has no quests yet
}

/* --------------------------------------------------------------------------- */
/* Helper Functions                                                             */
/* --------------------------------------------------------------------------- */
/**
 * Sort quests so the First‑Flame ritual always appears on top, followed by the
 * remaining quests ordered by creation date (newest first).
 */
export const sortQuests = (a: Quest, b: Quest): number => {
  const aIsFlame = a.slug === FIRST_FLAME_RITUAL_SLUG;
  const bIsFlame = b.slug === FIRST_FLAME_RITUAL_SLUG;

  if (aIsFlame !== bIsFlame) return aIsFlame ? -1 : 1;

  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return dateB - dateA;
};

/* --------------------------------------------------------------------------- */
/* Feature Flags & Animation                                                    */
/* --------------------------------------------------------------------------- */
export const IS_EXPERIMENTAL_UI_ENABLED =
  process.env.NEXT_PUBLIC_EXPERIMENTAL_UI === 'true';

/**
 * GSAP CustomEase string for the rune‑glow hover animation.
 * Keep in sync with ./HeroIntroScreen.tsx.
 */
export const RUNE_GLOW_EASE =
  'M0,0 C0.126,0.382 0.262,0.874 0.48,0.968 0.692,1.058 0.718,0.716 0.852,0.738 0.996,0.762 1,1 1,1';
