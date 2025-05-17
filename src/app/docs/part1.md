TypeScript

// === File: types/agent.ts ===
// Description: TypeScript definitions related to Agents (v10.6).

import { AgentCapability } from '@/lib/core/permissions';

export interface OrbConfig {
  profile: 'nebula' | 'crystal' | 'flame' | 'custom' | string; // Allow custom profiles
  noiseScale?: number;
  rippleSpeed?: number;
  glowIntensity?: number;
  color1?: string; // Allow theme overrides here?
  color2?: string;
  // ... other shader parameters
}

export interface AgentPersona {
  name: string;
  archetype: string;
  description: string;
  themeKey: string;
  orbConfig: OrbConfig;
  capabilities?: AgentCapability[]; // v10.6: Defined capabilities
  defaultTone?: string;
  initialPrompt?: string;
  voiceId?: string; // Optional ID for TTS voice
}

export interface AgentConfig { // User overrides
  defaultTone?: string;
  orbConfig?: Partial<OrbConfig>;
  // Add other configurable settings, e.g., disabledCapabilities?: AgentCapability['id'][]
}

export interface AgentData {
  id: string;
  userId: string;
  persona: AgentPersona;
  config?: AgentConfig;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}
TypeScript

// === File: types/artifact.ts ===
// Description: TypeScript definitions related to Artifacts (v10.6).

export enum ArtifactRelationType {
  Related = 'related',
  InspiredBy = 'inspired-by',
  Supporting = 'supporting',
  Refuting = 'refuting',
  Origin = 'originated-from',
  Contains = 'contains',
}

export interface ArtifactRelation {
    targetId: string; // ID of the other artifact
    type: ArtifactRelationType;
    // Add optional notes/description for the relation?
}

export interface ArtifactOrigin {
  contextKey: string;
  originId?: string;
  highlightedText?: string;
}

export interface ArtifactMetadata {
  origin?: ArtifactOrigin;
  agentId?: string;
  relations?: ArtifactRelation[]; // v10.6: Typed relations
  worldPosition?: { x: number; y: number; z: number };
  // ... other metadata
}

export type ArtifactContent =
  | string
  | { url: string; type: 'image' | 'video' | 'audio'; description?: string }
  | { objectId: string; name?: string; sceneId?: string; type: 'world-link' }
  | { objectIds: string[]; type: 'world-group' }
  | any; // Allow custom structured content (JSON)

export interface Artifact {
  id: string;
  userId: string;
  name: string;
  type: string;
  content: ArtifactContent;
  tags: string[];
  metadata: ArtifactMetadata;
  createdAt: string;
  updatedAt: string;
  status?: 'draft' | 'published' | 'archived';
}
TypeScript

// === File: types/command.ts ===
// Description: TypeScript definitions related to the Command Menu (v10.5).

import { AgentCapability } from '@/lib/core/permissions';

export interface CommandContext {
  contextKey?: string | null;
}

export interface Command {
  id: string;
  label: string;
  command?: string;
  handler: (context: CommandContext) => void | Promise<void>;
  icon?: any;
  scope?: 'global' | 'chat' | 'world' | 'memory' | string;
  tags?: string[];
  keyboardShortcut?: string;
  requiredAgentId?: string;
  requiredCapability?: AgentCapability['id']; // Check against permissions
}
TypeScript

// === File: types/layout.ts ===
// Description: TypeScript definitions related to the UI Layout (v10.6).

export interface PanelInstance { id: string; component: string; minSize?: number; defaultSize?: number; }
export interface PanelDefinition {
    id: string; title: string; icon: any;
    layout?: { direction: 'horizontal' | 'vertical'; panels: PanelInstance[]; };
    mobileLayout?: 'single' | 'tabs';
    inputBarBehavior?: 'chat' | 'command' | 'search' | 'world' | 'none';
    defaultAgent?: string | null;
    supportsArtifactCreation?: boolean | string[];
    defaultPanelFocus?: string; // v10.6
    panelAnimations?: { transition: 'fade' | 'slide' | 'zoom' | 'none'; }; // v10.6
    badgeCountSource?: 'notificationsUnread' | 'chatUnread' | 'memoryNew' | string; // v10.6
    supportsSplitView?: boolean; // v10.6
}

export interface PinnedItem {
    id: string;
    contextKey: string;
    name: string;
    icon?: any;
    artifactId?: string;
}

export interface ContextLayoutState {
    sizes?: number[];
    // Add other state like scroll position?
}
TypeScript

// === File: types/notification.ts ===
// Description: TypeScript definitions related to Notifications (v10.6).

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  isPersistent?: boolean; // v10.5
}

export interface NotificationActor { /* ... (id, name, type) ... */ }

export interface Notification {
  id: string;
  message: string;
  type: string;
  variant: string; // v10.6: e.g., 'agent_insight', 'system_alert'
  timestamp: number;
  isRead: boolean;
  isArchived?: boolean; // v10.6
  isFavorite?: boolean; // v10.6
  actor?: NotificationActor;
  contextLink?: string;
}
TypeScript

// === File: types/user.ts ===
// Description: TypeScript definitions for User Profile and Settings.

// Assume settings types are defined based on settings components
// interface AppearanceSettings { theme: string; accentColor: string; font: string; }
// interface InteractionSettings { voice: { autoSubmit: boolean; ... }; }
// interface AgentSettingsMap { [agentId: string]: AgentConfig } // For agent overrides
// ... etc

export interface UserSettings {
    appearance: any; // AppearanceSettings;
    interaction: any; // InteractionSettings;
    agentOverrides: any; // AgentSettingsMap;
    notifications: any; // NotificationSettings;
    experimentalFeaturesEnabled?: boolean;
    // ... other settings categories
}

export interface UserProfile {
    id: string; // Supabase User ID
    email?: string;
    username?: string;
    avatarUrl?: string;
    // Add roles, subscription status etc.
    // settings: UserSettings; // Embed settings or load separately? Load separately is better for state management.
    createdAt: string;
}
TypeScript

// === File: lib/state/slices/coreSlice.ts (Conceptual Structure v10.6) ===
// Description: Zustand slice for core application state.

import { StateCreator } from 'zustand';
import { AgentData } from '@/types/agent';
import { UserProfile } from '@/types/user';

export interface CoreSlice {
  userProfile: UserProfile | null;
  agents: AgentData[];
  activeAgentId: string | null;
  isLoading: boolean;
  error: string | null;
  // Add state related to global UI events if needed (e.g., triggering Orb pulse)
  // orbPulseEvent: { type: 'success' | 'error' | 'info'; timestamp: number } | null;

  loadInitialCoreState: () => Promise<void>;
  setActiveAgentId: (agentId: string | null) => void;
  addAgent: (agentData: AgentData) => Promise<void>; // Returns Promise if involves async server action
  updateAgent: (agentId: string, updates: Partial<AgentData>) => Promise<void>;
  // triggerOrbPulse: (type: 'success' | 'error' | 'info') => void;
}

// export const createCoreSlice: StateCreator<CoreSlice, ...> = (set, get) => ({
//   // ... initial state ...
//   loadInitialCoreState: async () => {
//      // Fetch user profile & agents (Server Action/API -> Drizzle)
//   },
//   setActiveAgentId: (agentId) => {
//       set({ activeAgentId: agentId });
//       // Dynamically apply .theme-[agent] class to body
//       const agent = get().agents.find(a => a.id === agentId);
//       document.body.className = document.body.className.replace(/theme-\w+/g, ''); // Remove old theme
//       if (agent) { document.body.classList.add(`theme-${agent.persona.themeKey}`); }
//       else { document.body.classList.add('theme-default'); }
//   },
//   addAgent: async (agentData) => { /* Call Server Action -> Drizzle, update local state */ },
//   updateAgent: async (agentId, updates) => { /* Call Server Action -> Drizzle, update local state */ },
//   // triggerOrbPulse: (type) => set({ orbPulseEvent: { type, timestamp: Date.now() } }),
// });
TypeScript

// === File: lib/state/slices/layoutSlice.ts (Conceptual Structure v10.6) ===
// Description: Zustand slice for managing UI layout state.

import { StateCreator } from 'zustand';
import { PinnedItem, ContextLayoutState, PanelDefinition } from '@/types/layout';
import { getPanelDefinition } from '@/lib/core/layoutRegistry'; // Import registry getter

export interface LayoutSlice {
  activeContextKey: string | null;
  activePanelId: string | null;
  panelLayoutDefinition: PanelDefinition | null; // Current layout structure definition from registry
  contextLayouts: Record<string, ContextLayoutState>; // Persisted states per context
  pinnedItems: PinnedItem[];
  isPinDockMobileOpen: boolean;

  setActiveContext: (contextKey: string | null, panelIdToFocus?: string) => void;
  setActivePanelId: (panelId: string | null) => void;
  saveContextLayoutState: (contextKey: string, layoutState: ContextLayoutState) => Promise<void>; // Persist panel sizes etc. (Server Action -> Drizzle)
  addPinnedItem: (item: PinnedItem) => Promise<void>; // Persist (Server Action -> Drizzle)
  removePinnedItem: (id: string) => Promise<void>; // Persist (Server Action -> Drizzle)
  reorderPinnedItems: (reorderedItems: PinnedItem[]) => Promise<void>; // Persist (Server Action -> Drizzle)
  openPinDockMobile: () => void;
  closePinDockMobile: () => void;
  loadLayoutState: () => Promise<void>; // Load pinned items, contextLayouts (Server Action -> Drizzle)
}

// export const createLayoutSlice: StateCreator<LayoutSlice, ...> = (set, get) => ({
//   // ... initial state ...
//   setActiveContext: (contextKey, panelIdToFocus) => {
//       const definition = contextKey ? getPanelDefinition(contextKey) : null;
//       const defaultFocus = panelIdToFocus ?? definition?.defaultPanelFocus;
//       // Logic to determine activePanelId for mobile based on definition.mobileLayout
//       const mobilePanelId = definition?.layout?.panels[0]?.id ?? null; // Simplistic: first panel
//       set({
//           activeContextKey: contextKey,
//           panelLayoutDefinition: definition,
//           activePanelId: mobilePanelId // Update for mobile view switching
//       });
//       // TODO: Implement actual focus logic using defaultFocus
//   },
//   loadLayoutState: async () => { /* Fetch pinnedItems, contextLayouts via Server Action -> Drizzle */ },
//   saveContextLayoutState: async (key, state) => { /* Call Server Action -> Drizzle, update local contextLayouts */ },
//   addPinnedItem: async (item) => { /* Call Server Action -> Drizzle, update local pinnedItems */ },
//   // Implement other actions...
// });
TypeScript

// === File: lib/state/slices/notificationSlice.ts (Conceptual Structure v10.6) ===
// Description: Zustand slice for notifications.

import { StateCreator } from 'zustand';
import { Toast, Notification } from '@/types/notification';

export interface NotificationSlice {
  toasts: Toast[];
  notifications: Notification[];
  unreadCount: number;
  isPanelOpen: boolean;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => Promise<void>; // Persist via Server Action -> Drizzle
  markAsRead: (id: string) => Promise<void>; // Persist
  markAllRead: () => Promise<void>; // Persist
  archiveNotification: (id: string) => Promise<void>; // Persist
  toggleFavoriteNotification: (id: string) => Promise<void>; // Persist
  clearAllArchived: () => Promise<void>; // Persist
  loadNotifications: () => Promise<void>; // Fetch initial persistent notifications (Server Action -> Drizzle)
  togglePanel: () => void;
  getFilteredNotifications: (filter: 'all' | 'unread' | 'favorites' | 'archived') => Notification[]; // Added 'archived'
}

// export const createNotificationSlice: StateCreator<NotificationSlice, ...> = (set, get) => ({
//   // ... initial state ...
//   addToast: (toastData) => { /* ... includes isPersistent logic ... */ },
//   removeToast: (id) => { /* ... */ },
//   addNotification: async (notifData) => {
//       // Optimistic update
//       const tempId = `temp_${Date.now()}`;
//       const newNotification = { ...notifData, id: tempId, timestamp: Date.now(), isRead: false };
//       set((state) => ({ notifications: [newNotification, ...state.notifications], unreadCount: state.unreadCount + 1 }));
//       try {
//           // Call Server Action -> Drizzle to save notification
//           // const savedNotification = await saveNotificationAction(notifData);
//           // Replace temporary notification with saved one (matching IDs might be needed)
//           // set((state) => ({ notifications: state.notifications.map(n => n.id === tempId ? savedNotification : n) }));
//       } catch (error) { /* Handle error, maybe remove optimistic update */ }
//   },
//   // Implement other actions, calling Server Actions for persistence and updating local state...
//   getFilteredNotifications: (filter) => {
//       const { notifications } = get();
//       switch(filter) {
//           case 'unread': return notifications.filter(n => !n.isRead && !n.isArchived);
//           case 'favorites': return notifications.filter(n => n.isFavorite && !n.isArchived);
//           case 'archived': return notifications.filter(n => n.isArchived);
//           default: return notifications.filter(n => !n.isArchived); // 'all' excludes archived by default? Or add 'all_incl_archived'?
//       }
//   },
// });
(Conceptual structures for other slices: memorySlice (artifacts, filters, search), langGraphSlice (stream states per agent), settingsSlice (user settings), voiceSlice (recording state), draftsSlice (input drafts per contextKey), devToolsSlice (debug flags), modalSlice (managing global modals like confirmation).)

TypeScript

// === File: lib/core/layoutRegistry.ts ===
// [Paste full code from v10.6 pseudocode - Defines PanelDefinition with all fields]
// Description: Defines metadata for panel-based contexts.
TypeScript

// === File: lib/core/commandRegistry.ts ===
// [Paste full code from v10.5 pseudocode]
// Description: Central registry for defining and retrieving commands.
TypeScript

// === File: lib/core/permissions.ts ===
// [Paste full code from v10.6 pseudocode - Defines AgentCapability and checks]
// Description: Utility functions to check user/agent permissions.
TypeScript

// === File: lib/core/directiveValidation.ts ===
// [Paste full code from v10.5 pseudocode - Defines ValidationResult]
// Description: Utility functions to validate LangGraph directive payloads.
TypeScript

// === File: lib/core/actionDirectiveHandler.ts ===
// [Paste full code from v10.5 pseudocode - Uses validation levels]
// Description: Handles ActionDirectives received from LangGraph streams.
TypeScript

// === File: lib/theme/getOrbThemeProfile.ts ===
// [Paste full code from v10.3 pseudocode]
// Description: Utility function to retrieve Orb visual parameters.
TypeScript

// === File: hooks/useInteractionContext.ts ===
// [Paste full code from v10.6 pseudocode - Includes all derived states]
// Description: Centralized hook providing access to core interaction state.
TypeScript

// === File: app/layout.tsx ===
// [Paste full code from v10.6 pseudocode - Sets up html, body, Providers]
// Description: Root layout, sets up global providers.
TypeScript

// === File: app/providers.tsx ===
// [Paste full code from v10.6 pseudocode - Consolidates providers]
// Description: Component consolidating all global context providers. Should include logic to load initial core/layout/settings state.
TypeScript

// === File: app/(main)/layout.tsx ===
// [Paste full code from v10.6 pseudocode - Renders main UI shell]
// Description: Main authenticated layout shell.
TypeScript

// === File: components/layout/Topbar.tsx ===
// [Paste full code from v10.6 pseudocode - Uses useInteractionContext]
// Description: Top navigation bar.
TypeScript

// === File: components/layout/Sidebar.tsx ===
// [Paste full code from v10.6 pseudocode - Includes badge logic concept]
// Description: Desktop sidebar with navigation and badges.
TypeScript

// === File: components/layout/PinDock.tsx ===
// [Paste full code from v10.6 pseudocode - Includes DND context and item mapping]
// Description: Desktop dock for pinned contexts/artifacts.
TypeScript

// === File: components/layout/PinDockItem.tsx ===
// Description: Renders a single item in the PinDock. Needs badge prop.

import { PinnedItem } from '@/types/layout';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
// Icons

interface PinDockItemProps {
  item: PinnedItem;
  onClick: () => void;
  isMobile?: boolean; // For potential style differences
  badgeCount?: number;
  // DND props if using dnd-kit directly here
}

export function PinDockItem({ item, onClick, isMobile, badgeCount }: PinDockItemProps) {
  return (
    <Tooltip content={item.name}>
      <button
        onClick={onClick}
        className={`relative flex items-center justify-center p-2 rounded-md aspect-square transition-colors ${
          isMobile ? 'h-16 w-16 flex-col gap-1 text-xs' : 'h-8 w-8 hover:bg-bg-agent-muted'
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
        // Add active state styling based on useInteractionContext().activeContextKey === item.contextKey
      >
         {/* <Icon name={item.icon ?? 'FileText'} size={isMobile ? 24 : 18} /> */}
         {isMobile && <span className="truncate max-w-full">{item.name}</span>}
         {badgeCount && badgeCount > 0 && (
             <Badge
                variant="destructive" // Or specific notification color
                className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] leading-none rounded-full"
             >
                {badgeCount}
             </Badge>
         )}
      </button>
    </Tooltip>
  );
}
TypeScript

// === File: components/layout/PinDockMobile.tsx ===
// [Paste full code from v10.5 pseudocode - Bottom sheet implementation]
// Description: Bottom sheet implementation of the PinDock for mobile. Uses PinDockItem.
TypeScript

// === File: components/layout/FAB.tsx ===
// [Paste full code from v10.5 pseudocode - Includes notes on long-press, dynamic label]
// Description: Floating Action Button for mobile.
TypeScript

// === File: components/panels/PanelGroup.tsx ===
// [Paste full code from v10.6 pseudocode - Includes focus and animation logic concepts]
// Description: Manages rendering and resizing of multiple panels based on layoutRegistry.
TypeScript

// === File: components/panels/Panel.tsx ===
// [Paste full code from v10.6 pseudocode - Includes animation variants]
// Description: Wrapper component for individual content panels.
TypeScript

// === File: components/panels/ResizeHandle.tsx ===
// [Paste full code from v10.3 pseudocode]
// Description: Visual handle for resizing panels.