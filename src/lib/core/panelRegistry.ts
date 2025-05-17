/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-console */
// src/lib/core/panelRegistry.ts

/**
 * panelRegistry.ts · v6.1 (Full‑lazy registry, memoised resolver)
 * --------------------------------------------------------------------------
 * • Maps every string in `layout.layout.panels[].component` to a **lazy**
 *   Next.js dynamic import – zero eager imports.
 * • Uses an internal cache so each component identity is created **once**
 *   (prevents React from re‑mounting panels on every click).
 * • 100 % type‑safe, override‑friendly, and SSR‑aware.
 * --------------------------------------------------------------------------
 * @date 2025‑05‑04
 */

'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/* ------------------------------------------------------------------ */
/* 1. Registry map – keep alphabetised for merge hygiene              */
/* ------------------------------------------------------------------ */

export const panelComponentRegistry = {
  /* ==== ARK LIBRARY (west) ======================================== */
  ArchiveListPanel:      () => import('@/features/library/components/ArchiveListPanel'),
  ArtifactShowcasePanel: () => import('@/features/library/components/ArtifactShowcasePanel'),
  LoreScrollPanel:       () => import('@/features/library/components/LoreScrollPanel'),

  /* ==== GUILD COMMONS (east) ====================================== */
  GuildWelcomePanel:     () => import('@/features/guild/components/GuildWelcomePanel'),

  /* ==== INNER SANCTUM (south) ===================================== */
  InnerSanctumPanel:     () => import('@/features/sanctum/components/InnerSanctumPanel'),
  QuestStepsPanel:       () => import('@/features/quest/components/QuestStepsPanel'),
  SanctumSettingsPanel:  () => import('@/features/sanctum/components/SanctumSettingsPanel'),

  /* ==== ORACLE HUB (centre) ======================================= */
  ActiveConversationPanel: () => import('@/features/hub/components/ActiveConversationPanel'),
  ChatContextPanel:        () => import('@/features/hub/components/ChatContextPanel'),
  UnifiedChatListPanel:    () => import('@/features/hub/components/leftpanel/UnifiedChatListPanel'),

  /* ==== WORLD WHEEL (north) ======================================= */
  GlobalCoherenceMeter: () => import('@/features/world/components/GlobalCoherenceMeter'),
  GuardianHUDPanel:     () => import('@/features/world/components/GuardianHUDPanel'),
  WorldWheelPanel:      () => import('@/features/world/components/WorldWheelPanel'),

} as const satisfies Record<string, () => Promise<any>>;

/* ------------------------------------------------------------------ */
/* 2. Types                                                           */
/* ------------------------------------------------------------------ */

export type PanelComponentName = keyof typeof panelComponentRegistry;

export type PanelRegistry = Readonly<Record<
  PanelComponentName,
  () => Promise<any>
>>;

export interface ResolvePanelOptions {
  /** Enable/disable SSR for this lazy component – default=`true`. */
  ssr?: boolean;
  /** Optional custom loading placeholder. */
  loading?: () => JSX.Element | null;
}

/* ------------------------------------------------------------------ */
/* 3. Resolver – memoised so identity never changes between renders   */
/* ------------------------------------------------------------------ */

/** Cache prevents new `lazy()` wrappers on subsequent calls. */
const lazyCache: Record<string, ComponentType<any>> = {};

export function resolvePanelComponent(
  registry: PanelRegistry,
  name: PanelComponentName,
  opts: ResolvePanelOptions = { ssr: true },
): ComponentType<any> | null {
  // Fast path
  if (lazyCache[name]) return lazyCache[name];

  const importer = registry[name];
  if (!importer) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[panelRegistry] Unknown panel “${name}”. Did you forget to register it?`);
    }
    return null;
  }

  // Create lazy wrapper once
  const LazyComponent = dynamic(async () => {
    const mod = await importer();
    return (
      (mod as { default?: ComponentType<any> }).default ||
      (mod as Record<string, ComponentType<any>>)[name] ||
      (mod as unknown as ComponentType<any>)
    );
  }, {
    ssr: opts.ssr ?? true,
    loading: opts.loading,
  });

  lazyCache[name] = LazyComponent;
  return LazyComponent;
}

/* ------------------------------------------------------------------ */
/* 4. Dev‑time sanity check                                           */
/* ------------------------------------------------------------------ */

if (process.env.NODE_ENV !== 'production') {
  for (const [key, val] of Object.entries(panelComponentRegistry)) {
    if (typeof val !== 'function') {
      console.error(`[panelRegistry] Entry “${key}” is not a function returning a dynamic import.`);
    }
  }

  if (process.env.LOG_LEVEL !== 'silent') {
    console.log(`[panelRegistry] Registry initialised with ${Object.keys(panelComponentRegistry).length} components.`);
  }
}
