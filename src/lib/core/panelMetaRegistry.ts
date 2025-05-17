/**
 * panelMetaRegistry.ts · v3.1 (HUB pivot Refined — 2025-05-02)
 * ---------------------------------------------------------------------------
 * Central source-of-truth for **panel metadata** used by:
 * • panel palette / command-k menu
 * • layoutRegistry DevChecks
 * • future i18n title mapping
 *
 * ✅ Updated with new AsrayaOS 8.4 Hub panels.
 * ✅ Removed legacy Hub panel metadata (OracleChat, QuickActionWheel, ProphecyLog).
 * ✅ Consolidated chat-related panels under HUB.
 * ✅ Export `type PanelComponentName = keyof typeof panelMetaRegistry`
 * so the union **always** stays in-sync with the registry keys.
 * ---------------------------------------------------------------------------
 */

export interface PanelMeta {
  /** User-facing title (internationalised elsewhere) */
  title: string;
  /** lucide-react / shadcn icon component name (optional) */
  iconName?: string;
  /** Short description shown in the “Add Panel” palette */
  description: string;
}

/* ------------------------------------------------------------------ */
/* METADATA REGISTRY                           */
/* ------------------------------------------------------------------ */
/** **SOURCE OF TRUTH** — every loadable panel must appear here. */
export const panelMetaRegistry = {
  /* ────────────────  HUB / ORACLE  ──────────────── */
  // Legacy Hub Trio removed
  // OracleChatPanel: { ... }
  // QuickActionWheel: { ... }
  // ProphecyLogPanel: { ... }

  // New Hub Trio added with specified metadata
  UnifiedChatListPanel: {
    title: 'Conversations',
    iconName: 'MessageSquareIcon', // Note: Same icon as previous 'ConversationsPanel'
    description: 'List of all chats & agents',
  },
  ActiveConversationPanel: {
    title: 'Active Chat',
    iconName: 'MessagesSquareIcon',
    description: 'Live thread of the selected convo', // Metadata already matched, moved here
  },
  ChatContextPanel: {
    title: 'Chat Context',
    iconName: 'BrainIcon',
    description: 'Quest / intent summary for this chat', // Metadata already matched, moved here
  },

  /* ────────────────  WORLD / NORTH  ─────────────── */
  WorldWheelPanel: {
    title: 'World Wheel',
    iconName: 'GlobeIcon',
    description: 'Interactive planetary wheel & navigation',
  },
  GlobalCoherenceMeter: {
    title: 'Coherence Meter',
    iconName: 'ActivityIcon',
    description: 'Real-time coherence statistics for the world',
  },
  GuardianHUDPanel: {
    title: 'Guardian HUD',
    iconName: 'ShieldIcon',
    description: 'Vital stats & status of the Guardian avatar',
  },

  /* ────────────────  SANCTUM / SOUTH  ───────────── */
  InnerSanctumPanel: {
    title: 'Inner Sanctum',
    iconName: 'CircleIcon',
    description: 'Personal inner-space & meditation tools',
  },
  QuestStepsPanel: {
    title: 'Quest Steps',
    iconName: 'ListTodoIcon',
    description: 'Step-by-step tracker for the current quest',
  },
  SanctumSettingsPanel: {
    title: 'Sanctum Settings',
    iconName: 'SettingsIcon',
    description: 'Environment & ritual configuration',
  },

  /* ────────────────  LIBRARY / WEST  ─────────────── */
  ArchiveListPanel: {
    title: 'ARK Archive',
    iconName: 'ArchiveIcon',
    description: 'Catalogue of artefacts & manuscripts',
  },
  LoreScrollPanel: {
    title: 'Lore Scroll',
    iconName: 'ScrollTextIcon',
    description: 'Deep-dive into story lore & timelines',
  },
  ArtifactShowcasePanel: {
    title: 'Artifact Showcase',
    iconName: 'LayersIcon',
    description: '3-D presentation of selected artefact',
  },

  /* ────────────────  COMMONS / EAST – CHAT  ─────── */
  // ConversationsPanel replaced by UnifiedChatListPanel in HUB section.
  // ActiveConversationPanel moved to HUB section.
  // ChatContextPanel moved to HUB section.
  // This section remains for any non-Hub chat/commons panels if they exist.

  /* ────────────────  GLOBAL / SHARED  ───────────── */
  // Legacy alias removed - UnifiedChatListPanel is now a primary Hub panel.
  // UnifiedChatListPanel: { ... }

  /* ────────────────  WORLD-BUILDING TOOLS  ──────── */
  WorldAssetPanel: {
    title: 'Asset Browser',
    iconName: 'BoxIcon',
    description: 'Browse & import 3-D assets',
  },
  WorldCanvasPanel: {
    title: 'World Canvas',
    iconName: 'GlobeIcon',
    description: 'Primary 3-D viewport & editor',
  },
  WorldInspectorPanel: {
    title: 'Object Inspector',
    iconName: 'SlidersIcon',
    description: 'Properties & components of selected object',
  },

  /* ────────────────  TASK / PIPELINE  ───────────── */
  TaskListPanel: {
    title: 'Task List',
    iconName: 'CheckSquareIcon',
    description: 'Ongoing AI tasks & status',
  },
  TaskDetailPanel: {
    title: 'Task Details',
    iconName: 'FileTextIcon',
    description: 'Inputs, outputs & logs for a task',
  },
  TaskContextPanel: {
    title: 'Task Context',
    iconName: 'PackageIcon',
    description: 'Environment & parameters for task execution',
  },
} as const;

/* ------------------------------------------------------------------ */
/* DERIVED TYPE                                */
/* ------------------------------------------------------------------ */
/** Union of **all** valid panel component identifiers. */
export type PanelComponentName = keyof typeof panelMetaRegistry;

/* ------------------------------------------------------------------ */
/* PUBLIC HELPER FUNCTIONS                         */
/* ------------------------------------------------------------------ */

/**
 * Typed metadata getter with optional fallback.
 */
export function getPanelMeta(
  panelName: string,
  fallback?: PanelMeta,
): PanelMeta | undefined {
  // The type assertion `as PanelComponentName` ensures type safety based on the registry keys
  return panelMetaRegistry[panelName as PanelComponentName] ?? fallback;
}