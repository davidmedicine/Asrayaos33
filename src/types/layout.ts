// === File: src/types/layout.ts ===
/**
 * layout.ts
 * TypeScript definitions related to the UI Layout (v12.4 - Multi-Agent Ready, Corrected PinnedItem)
 * Includes agent overrides, context persistence, and layout scope.
 */

// --- Core Imports ---
import type { ComponentType } from 'react'; // Added back for potential use in registryOverride later
import type { PanelType } from '@/lib/core/layoutRegistry'; // Adjust path if needed
import type { AsrayaAgentId } from './agent'; // Corrected path to import agent ID type

// --- New Definitions from Feedback ---

/** Defines distinct scopes or modes for layout presentation */
export type LayoutScope = 'desktop' | 'mobile' | 'immersive' | 'command' | 'focus' | 'ritual' | string; // Allow custom string scopes

// --- Existing Definitions Updated ---

// Represents a single panel instance within a layout direction group
export interface PanelInstance {
    id: string;            // Unique identifier for this instance within the layout
    component: string;       // Key to map to the actual React component
    minSize?: number;      // Minimum size (percentage or pixels)
    defaultSize?: number;  // Initial size
    // defaultSizeUnit?: '%' | 'px'; // Removed as Panel library uses percentages primarily
    maxSize?: number; // Added based on PanelGroup usage
    collapsible?: boolean; // Added based on PanelGroup usage
    collapsedSize?: number; // Added based on PanelGroup usage
    props?: Record<string, any>; // Optional custom props
    className?: string; // Optional specific class for this instance
}

// Defines the structure and behavior of a specific layout context
export interface PanelLayoutDefinition {
    id: string;            // Unique identifier for this layout definition (e.g., 'asraya:chat:default')
    title: string;         // User-facing title for this layout/context
    iconName?: string;     // Reference to an icon name (string)
    type: PanelType;       // Categorical type (e.g., 'chat', 'world')
    category?: string;     // Broader grouping (e.g., "Core", "Agents", "Spatial")
    hidden?: boolean;      // Whether to hide this layout from user selection interfaces
    layoutScope?: LayoutScope; // Optional: Hint for the intended scope/mode

    // Desktop Layout Configuration
    layout?: {
        direction: 'horizontal' | 'vertical';
        panels: PanelInstance[];
    };

    // Mobile Layout Configuration
    mobileLayout?: 'single' | 'tabs';

    // Context-specific Behaviors
    inputBarBehavior?: 'chat' | 'command' | 'search' | 'world' | 'none';
    defaultAgent?: AsrayaAgentId | null; // Default agent for this context
    supportsArtifactCreation?: boolean | string[];
    defaultPanelFocus?: string; // ID of the panel instance to focus by default
    panelAnimations?: { transition: 'fade' | 'slide' | 'zoom' | 'none' };
    badgeCountSource?: 'notificationsUnread' | 'chatUnread' | 'memoryNew' | string | null;
    supportsSplitView?: boolean;
    autoSwitchLayout?: boolean; // Optional: Trigger layout switch based on agent/interaction
}

// *** CORRECTED PinnedItem Interface to match DB Schema ***
// Represents an item pinned by the user for quick access.
// Maps directly to the 'pinned_items' table schema.
export interface PinnedItem {
    /** Unique identifier (UUID) for the pinned item record itself. */
    id: string; // maps to 'id' (uuid, PK)
    // userId is implicit based on session, not stored in this type directly

    /** The type of item being pinned (e.g., 'conversation', 'quest', 'artifact', 'agent', 'url'). */
    type: string; // maps to 'type' (text)

    /** The ID of the actual item being pinned (e.g., conversation UUID, artifact ID, agent ID). */
    itemId: string; // maps to 'item_id' (text) - Could be UUID or string ID

    /** Display label for the pinned item shown in the UI. */
    label: string; // maps to 'label' (text)

    /** Optional: Name of the icon to display (e.g., 'MessageSquare', 'Compass', 'FileText'). */
    iconName?: string | null; // maps to 'icon_name' (text, nullable)

    /** The order/position of the item in the user's pinned list. */
    order: number; // maps to 'order' (integer)

    /** Optional: JSON object containing context needed to restore/navigate to the item (e.g., { conversationId: 'xyz', messageId: 'abc' }). */
    contextValue?: Record<string, any> | null; // maps to 'context_value' (jsonb, nullable)

     /** ISO 8601 timestamp string when the item was pinned. */
    createdAt: string; // maps to 'created_at' (timestamptz)

    // Note: updatedAt is not typically needed on the PinnedItem type itself,
    // the DB trigger handles the table's updated_at.
    // Note: Removed agentOverrideId as it's not in the specified DB schema.
}
// *** End Corrected PinnedItem Interface ***

// Represents the saved state for a specific layout context.
// Maps to the 'user_layout_state' table schema.
export interface ContextLayoutState {
    /** Optional: Array of panel sizes (percentages) matching the panel order in the layout definition. */
    sizes?: number[]; // maps to 'layout_state' -> 'sizes' (jsonb)
    // userId and contextKey are implicit based on where this state is stored/retrieved
    /** Optional: ISO 8601 timestamp string when the state was last saved. */
    updatedAt?: string; // maps to 'updated_at' (timestamptz)
    // Add other savable layout states here (e.g., collapsed panels) within the jsonb structure
    // Example: collapsedPanels?: string[];
}


// Utility types for layout operations (Can remain as is or be removed if unused)
// export type PanelFocusAction = 'focus' | 'blur' | 'toggle';
// export type PanelResizeMode = 'user' | 'auto' | 'reset' | 'collapse' | 'expand';

// Ensure file ends with a newline