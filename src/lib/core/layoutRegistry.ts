/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-console */
// src/lib/core/layoutRegistry.ts

/**
 * layoutRegistry.ts — v6.2.2 (Duplicate chat-context ID fix)
 * - **FIX**: Renamed duplicate 'chat-context' panel ID in 'oracle-hub' to 'chat-context-hub' for global uniqueness. (v6.2.2)
 * - **FEAT**: Added `GuildWelcomePanel` to `guild-commons` layout (east, 25%). (v6.2.0)
 * - **FIX**: Resolved duplicate panel ID issue by renaming `active-conversation` to `active-conversation-hub` in `oracle-hub`. `guild-commons` retains `active-conversation`. (v6.2.1)
 * - **FIX**: Adjusted panel percentages in `guild-commons` to accommodate the new panel while summing to 100%. (v6.2.0)
 * - **FIX**: Updated `defaultPanelFocus` in `oracle-hub` to match the renamed `active-conversation-hub` panel ID. (v6.2.1)
 * - **FEAT**: Added `--validate` CLI flag for standalone Zod validation via `npm run validate:layout`. (v6.2.0)
 * - **CHORE**: Updated panelComponentNameSchema generation to reflect panelComponentRegistry changes automatically. (v6.2.0)
 * - **CHORE**: Ensured iconLoader Zod schema is correct. (v6.2.0)
 * - **CHORE**: Updated comments and versioning.
 *
 * Previous version: 6.2.1
 * @version 6.2.2
 * @date 2025-05-02 // Timestamp reflects this specific fix
 */

// --- Core Type Imports ---
import type {
    PanelInstance as CorePanelInstance,
    PanelLayoutDefinition as CorePanelLayoutDefinition,
    Direction,
    InputBarBehavior,
    Transition,
} from '@/types/layout'; // Assuming these base types exist
import type { ComponentType, SVGProps } from 'react'; // Added SVGProps needed for IconLoader context
import { z } from 'zod'; // Import Zod for validation

// --- Panel Component Registry Import (Source of Truth) ---
// IMPORTANT: This import MUST happen before panelComponentNames is derived for Zod.
import { panelComponentRegistry } from './panelRegistry';
import type { PanelComponentName } from './panelRegistry';

// --- Icon Registry Import (Source of Truth for Icon Loaders) ---
import type { IconLoader } from '@/components/icons/IconRegistry'; // Import the strict IconLoader type

// Build-time optimization note: Strip dev-only code blocks.

/* ========================================================================== */
/* === Types & Constants ==================================================== */
/* ========================================================================== */

export const compassKeys = [
    'oracle-hub', // CENTER
    'inner-sanctum', // SOUTH
    'ark-library', // WEST
    'guild-commons', // EAST
] as const satisfies Readonly<
    ['oracle-hub', 'inner-sanctum', 'ark-library', 'guild-commons']
>;

export const DEFAULT_COMPASS_KEY = compassKeys[0];

export type CompassKey = (typeof compassKeys)[number];

// --- Type Refinements incorporating Motion Metadata ---

export interface CompassPanelInstance extends Omit<CorePanelInstance, 'component'> {
    component: PanelComponentName;
    defaultSizeUnit?: '%' | 'fr' | 'px';
    enabled?: boolean;
    motion?: {
        viewTransitionTag?: string;
        enterActivity?: string;
        exitActivity?: string;
        flipScope?: string;
    };
}

/**
 * Defines the layout structure and metadata for a single Compass Zone.
 * UPDATED: Replaced `icon` with `iconLoader` of type `IconLoader`.
 */
export type PanelLayoutDefinition = Omit<
    CorePanelLayoutDefinition,
    'id' | 'icon' | 'layout' | 'type' // Remove OLD 'icon' from Omit
> & {
    /** Core Identification & Metadata */
    id: CompassKey;
    title: string;
    /** A function that dynamically imports the icon component, conforming to React.lazy requirements. */
    iconLoader: IconLoader; // <<<< RENAMED and uses strict IconLoader type
    /** Panel Type - Defines the specific types for Compass zones. */
    type: 'hub' | 'sanctum' | 'library' | 'commons';
    category?: string;

    /** Layout Structure */
    layout: {
        direction: Direction;
        panels: CompassPanelInstance[];
    };

    /** Zone-Specific Behaviors & Configuration */
    inputBarBehavior?: InputBarBehavior;
    defaultAgent?: string | null;
    defaultPanelFocus?: string | null;
    panelAnimations?: { transition: Transition | string };
    badgeCountSource?: string;
    supportsSplitView?: boolean;
    mobileLayout?: 'single' | 'tabs';
};

/* ========================================================================== */
/* === Zod Schema Definition (for Dev/CI Validation) ======================== */
/* ========================================================================== */

// --- Zod Schemas ---
const compassKeySchema = z.enum(compassKeys);

// Dynamically generate panel component names from the imported registry
// This ensures the Zod schema stays in sync with the actual components.
let panelComponentNames: [string, ...string[]];
try {
    // Get keys directly from the imported registry object
    const keys = Object.keys(panelComponentRegistry);
    if (keys.length === 0) {
        // Handle case where registry might be empty during build/runtime issues
        if (process.env.NODE_ENV !== 'production') {
            console.warn(
                '[layoutRegistry Zod] !!! panelComponentRegistry appears empty when generating schema. Panel component validation WILL FAIL. Check import/export from `panelRegistry.ts`.'
            );
        }
        // Provide a fallback to allow schema definition, though validation will likely fail later
        panelComponentNames = ['__FALLBACK_EMPTY_REGISTRY__'];
    } else {
        // Cast to Zod's expected non-empty array type
        panelComponentNames = keys as [string, ...string[]];
    }
} catch (error) {
     // Handle potential errors accessing the registry object
     if (process.env.NODE_ENV !== 'production') {
        console.error('[layoutRegistry Zod] Error accessing panelComponentRegistry keys:', error);
     }
     panelComponentNames = ['__FALLBACK_ERROR_ACCESSING_REGISTRY__'];
}

// Zod schema for validating panel component names based on the registry keys
const panelComponentNameSchema = z.enum(
    panelComponentNames, // Use the dynamically generated (or fallbacked) array
    {
        errorMap: (issue, ctx) => {
            // Provide a more helpful error message if validation fails
            if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                const usingFallback = issue.options?.includes('__FALLBACK_EMPTY_REGISTRY__') || issue.options?.includes('__FALLBACK_ERROR_ACCESSING_REGISTRY__');
                const importIssueMsg = usingFallback ? ' (Potential issue: Failed to load component names from panelComponentRegistry.ts).' : '';
                const dataValue = typeof ctx.data === 'string' || typeof ctx.data === 'number' ? `"${ctx.data}"` : `(type: ${typeof ctx.data})`;
                // Filter out fallback placeholders from the options list shown to the user
                const optionsList = issue.options?.filter(opt => !opt.startsWith('__FALLBACK_')).join(', ') ?? 'none available';
                return { message: `Invalid panel component name: ${dataValue}. Expected one of [${optionsList}]${importIssueMsg}. Check layoutRegistry.ts and ensure the component is registered in panelRegistry.ts.` };
            }
            return { message: ctx.defaultError };
        },
    },
);


const motionMetadataSchema = z.object({
    viewTransitionTag: z.string().optional(),
    enterActivity: z.string().optional(),
    exitActivity: z.string().optional(),
    flipScope: z.string().optional(),
}).strict("Unknown keys found in 'motion' object").optional();

const compassPanelInstanceSchema = z.object({
    id: z.string().min(1, "Panel 'id' cannot be empty"),
    component: panelComponentNameSchema, // Use the dynamic schema
    position: z.enum(['north', 'south', 'east', 'west', 'center']).optional(),
    defaultSize: z.number().min(0).optional(),
    minSize: z.number().min(0).optional(),
    maxSize: z.number().min(0).optional(),
    resizable: z.boolean().optional(),
    collapsible: z.boolean().optional(),
    defaultCollapsed: z.boolean().optional(),
    showHandle: z.boolean().optional(),
    order: z.number().optional(),
    defaultSizeUnit: z.enum(['%', 'fr', 'px']).optional(),
    enabled: z.boolean().optional(),
    motion: motionMetadataSchema,
}).strict('Unknown keys found in panel instance object');

/**
 * Zod schema for PanelLayoutDefinition.
 * Ensures `iconLoader` function signature is correctly validated.
 */
const panelLayoutDefinitionSchema = z.object({
    id: compassKeySchema,
    title: z.string().min(1, "Layout 'title' cannot be empty"),
    // Zod schema for iconLoader function signature validation
    iconLoader: z.function()
                 .args() // No arguments expected
                 .returns(z.promise(z.object({ default: z.any() })), { // Expects Promise<{ default: any }>
                    message: "iconLoader must be a function returning a Promise resolving to an object with a 'default' property (e.g., `() => import('@/path/to/Icon').then(m => ({ default: m.default }))`). Check the IconLoader type definition.",
                 }),
    type: z.enum(['hub', 'sanctum', 'library', 'commons']),
    category: z.string().optional(),
    layout: z.object({
        direction: z.enum(['horizontal', 'vertical']),
        panels: z.array(compassPanelInstanceSchema).min(1, "Layout 'panels' array must contain at least one panel"),
    }).strict("Unknown keys found in 'layout' object"),
    inputBarBehavior: z.enum(['chat', 'command', 'search', 'world', 'none']).optional(),
    defaultAgent: z.string().nullable().optional(),
    defaultPanelFocus: z.string().nullable().optional(),
    panelAnimations: z.object({ transition: z.string() }).strict("Unknown keys found in 'panelAnimations' object").optional(),
    badgeCountSource: z.string().optional(),
    supportsSplitView: z.boolean().optional(),
    mobileLayout: z.enum(['single', 'tabs']).optional(),
}).strict('Unknown keys found in layout definition object');

// Schema for the entire registry object with cross-layout validations using superRefine
const layoutRegistrySchema = z
    .record(compassKeySchema, panelLayoutDefinitionSchema)
    .superRefine((registry, ctx) => {
        // 1️⃣ Check: All required compassKey definitions must be present
        for (const key of compassKeys) {
            if (!(key in registry)) {
                const message = `Registry missing required Compass Key definition: "${key}". Required keys: ${compassKeys.join(', ')}.`;
                if (process.env.NODE_ENV !== 'production') console.error(`[layoutRegistry Zod SuperRefine Error] ${message}`);
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: message, path: [key] });
            }
        }

        // 2️⃣ Check: Duplicate panel IDs are forbidden across ALL layouts
        const seenPanelIds = new Map<string, string>(); // Store ID -> compassKey
        for (const [compassKey, layoutDef] of Object.entries(registry)) {
            if (layoutDef?.layout?.panels) {
                layoutDef.layout.panels.forEach((panel, panelIndex) => {
                    if (seenPanelIds.has(panel.id)) {
                        const originalLayout = seenPanelIds.get(panel.id);
                        const message = `Duplicate Panel ID: "${panel.id}". Found in layout "${compassKey}" but already defined in layout "${originalLayout}". Panel IDs must be globally unique.`;
                        if (process.env.NODE_ENV !== 'production') console.error(`[layoutRegistry Zod SuperRefine Error] ${message}`);
                        ctx.addIssue({ code: z.ZodIssueCode.custom, message: message, path: [compassKey, 'layout', 'panels', panelIndex, 'id'] });
                    } else {
                        seenPanelIds.set(panel.id, compassKey);
                    }
                });
            }
        }

        // 3️⃣ Check: Panels using ONLY '%' unit for defaultSize must sum to ~100% per layout
        const tolerance = 0.5; // Allow for minor floating point inaccuracies
        for (const [key, layout] of Object.entries(registry)) {
            if (!layout?.layout?.panels) continue;

            const sizedPanels = layout.layout.panels.filter(p => typeof p.defaultSize === 'number');
            if (sizedPanels.length === 0) continue; // Skip if no panels have defaultSize

            const panelsWithPercent = sizedPanels.filter(p => p.defaultSizeUnit === '%');
            const panelsWithOtherOrNoUnit = sizedPanels.filter(p => p.defaultSizeUnit !== '%');

            // Only apply the sum check if ALL sized panels in this layout use '%'
            if (panelsWithPercent.length > 0 && panelsWithOtherOrNoUnit.length === 0) {
                const totalPercent = panelsWithPercent.reduce((sum, p) => sum + (p.defaultSize ?? 0), 0);
                if (Math.abs(totalPercent - 100) > tolerance) {
                    const message = `Layout '${key}' uses only '%' units for sized panels, but sizes sum to ${totalPercent.toFixed(2)}%. Expected sum within ${100 - tolerance}%-${100 + tolerance}% range. Adjust panel defaultSize values.`;
                    if (process.env.NODE_ENV !== 'production') console.error(`[layoutRegistry Zod SuperRefine Error] ${message}`);
                    ctx.addIssue({ code: z.ZodIssueCode.custom, message: message, path: [key, 'layout', 'panels'] });
                }
            } else if (panelsWithPercent.length > 0 && panelsWithOtherOrNoUnit.length > 0 && process.env.NODE_ENV !== 'production') {
                 // Optional: Warn if mixing units, as percentage sum check is bypassed
                 // console.warn(`[layoutRegistry Zod SuperRefine Warning] Layout '${key}' mixes '%' units with other/no units. Percentage sum check skipped.`);
            }
        }

        // 4️⃣ Check: Ensure defaultPanelFocus (if set) exists within its OWN layout's panel IDs
        for (const [key, layout] of Object.entries(registry)) {
            if (layout?.defaultPanelFocus) {
                 if (layout.layout?.panels) {
                     const panelIdsInLayout = layout.layout.panels.map((p) => p.id);
                     if (!panelIdsInLayout.includes(layout.defaultPanelFocus)) {
                         const message = `Layout '${key}' has invalid defaultPanelFocus: "${layout.defaultPanelFocus}". This ID does not exist in its panels. Available IDs: [${panelIdsInLayout.join(', ')}].`;
                         if (process.env.NODE_ENV !== 'production') console.error(`[layoutRegistry Zod SuperRefine Error] ${message}`);
                         ctx.addIssue({ code: z.ZodIssueCode.custom, message: message, path: [key, 'defaultPanelFocus'] });
                     }
                 } else {
                     // Edge case: defaultPanelFocus is set but there are no panels
                     const message = `Layout '${key}' has defaultPanelFocus='${layout.defaultPanelFocus}' but defines no panels in layout.panels.`;
                     if (process.env.NODE_ENV !== 'production') console.warn(`[layoutRegistry Zod SuperRefine Warning] ${message}`);
                     // Consider if this should be an error:
                     // ctx.addIssue({ code: z.ZodIssueCode.custom, message: message, path: [key, 'defaultPanelFocus'] });
                 }
             }
        }
    });

/** Development/CI validation function using Zod. Throws on error. */
function validateLayoutRegistry(registryObject: unknown): void {
    // Skip validation entirely in production builds for performance.
    if (process.env.NODE_ENV === 'production') return;

    try {
        // Parse the registry using the comprehensive schema with superRefine checks.
        layoutRegistrySchema.parse(registryObject);
        // Log success only if not running in silent mode.
        if (process.env.LOG_LEVEL !== 'silent') {
            console.log('[layoutRegistry Zod] Registry validation passed successfully.');
        }
    } catch (error) {
        // Handle Zod validation errors specifically.
        if (error instanceof z.ZodError) {
            console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            console.error('!!! [layoutRegistry Zod] REGISTRY VALIDATION FAILED !!!');
            console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
            // Log each specific Zod issue clearly.
            error.errors.forEach((err, index) => {
                const path = err.path.length > 0 ? err.path.join('.') : '<registry root>';
                console.error(`  Issue #${index + 1}:`);
                console.error(`    Path:    ${path}`);
                console.error(`    Code:    ${err.code}`);
                console.error(`    Message: ${err.message}`);
            });
            console.error('\n[layoutRegistry Zod] --- End of Validation Errors ---');
            // Re-throw a more general error to halt execution in dev/CI environments.
            throw new Error(`Layout Registry Zod validation failed with ${error.errors.length} issue(s). See console logs above for details.`);
        } else {
            // Handle any unexpected non-Zod errors during validation.
            console.error('[layoutRegistry Zod] An unexpected non-Zod error occurred during validation:', error);
            throw error; // Re-throw the unexpected error.
        }
    }
}


/* ========================================================================== */
/* === Registry Definition ================================================== */
/* ========================================================================== */

/**
 * The central registry mapping each CompassKey to its PanelLayoutDefinition.
 * Component names MUST match keys in `panelComponentRegistry`.
 * Panel IDs MUST be globally unique across all layouts.
 */
const registry: Record<CompassKey, PanelLayoutDefinition> = {
    /* ---------------------------------- Oracle Hub ---------------------------------- */
    'oracle-hub': {
        id: 'oracle-hub',
        title: 'Oracle Hub',
        iconLoader: () => import('@/components/icons/OracleOrbIcon').then(m => ({ default: m.default })),
        type: 'hub',
        category: 'Compass',
        layout: {
            direction: 'horizontal', // Assumed horizontal W-C-E
            panels: [
                // Panel IDs and % sizes verified
                { id: 'chat-list-hub',         component: 'UnifiedChatListPanel', position: 'west',   defaultSize: 24, defaultSizeUnit: '%' },
                { id: 'active-conversation-hub', component: 'ActiveConversationPanel', position: 'center', defaultSize: 52, defaultSizeUnit: '%' }, // ID renamed in v6.2.1
                // ***** MODIFIED LINE BELOW *****
                { id: 'chat-context-hub',      component: 'ChatContextPanel',     position: 'east',   defaultSize: 24, defaultSizeUnit: '%' }, // RENAMED (v6.2.2): Avoids ID conflict with 'guild-commons'. Original: 'chat-context'
                // ***** END MODIFIED LINE *****
            ], // Sum = 24 + 52 + 24 = 100%
        },
        inputBarBehavior: 'chat',
        defaultAgent: 'oracle',
        defaultPanelFocus: 'active-conversation-hub', // Focus updated in v6.2.1 to match active-conversation rename, no change needed for chat-context rename here.
        panelAnimations: { transition: 'fade' },
        mobileLayout: 'single',
        supportsSplitView: false,
    },

    /* -------------------------------- Inner Sanctum ------------------------------- */
    'inner-sanctum': {
        id: 'inner-sanctum',
        title: 'Inner Sanctum',
        iconLoader: () => import('@/components/icons/SanctumIcon').then(m => ({ default: m.default })),
        type: 'sanctum',
        category: 'Compass',
        layout: {
            direction: 'vertical',
            panels: [
                { id: 'quest-steps', component: 'QuestStepsPanel', defaultSize: 35, position: 'north' }, // Assuming 'fr' or 'px' if no unit
                { id: 'sanctum-main', component: 'InnerSanctumPanel', defaultSize: 65, position: 'center', motion: { viewTransitionTag: 'sanctum-core' } }, // Assuming 'fr' or 'px' if no unit
            ], // Note: % check doesn't apply if units are not % or are mixed
        },
        inputBarBehavior: 'command',
        defaultAgent: 'oracle',
        defaultPanelFocus: 'sanctum-main',
        panelAnimations: { transition: 'fade' },
        mobileLayout: 'single',
        supportsSplitView: false,
        badgeCountSource: 'questNotifications',
    },

    /* --------------------------------- ARK Library -------------------------------- */
    'ark-library': {
        id: 'ark-library',
        title: 'ARK Library',
        iconLoader: () => import('@/components/icons/LibraryIcon').then(m => ({ default: m.default })),
        type: 'library',
        category: 'Compass',
        layout: {
            direction: 'horizontal',
            panels: [
                { id: 'lore-scroll', component: 'LoreScrollPanel', defaultSize: 30, defaultSizeUnit: '%', position: 'west', minSize: 20 },
                { id: 'artifact-viewer', component: 'ArtifactShowcasePanel', defaultSize: 70, defaultSizeUnit: '%', position: 'center', minSize: 30, motion: { viewTransitionTag: 'artifact-showcase', flipScope: 'library-content' } },
            ], // Sum = 30 + 70 = 100%
        },
        inputBarBehavior: 'search',
        defaultAgent: null,
        defaultPanelFocus: 'artifact-viewer',
        panelAnimations: { transition: 'fade' },
        mobileLayout: 'tabs',
        supportsSplitView: true,
    },

    /* ------------------------------- Guild Commons ------------------------------ */
    'guild-commons': {
        id: 'guild-commons',
        title: 'Guild Commons',
        iconLoader: () => import('lucide-react').then(m => ({ default: m.Users })),
        type: 'commons',
        category: 'Compass',
        layout: {
            direction: 'horizontal', // Layout structure based on final comments in original code
            panels: [
                // Panel structure from original v6.2.0/v6.2.1 (keeping `chat-context` and `active-conversation` here)
                {
                    id: 'chat-list-guild', // Renamed in v6.2.0
                    component: 'UnifiedChatListPanel',
                    minSize: 15,
                    defaultSize: 25, // W(25)
                    defaultSizeUnit: '%',
                    resizable: true,
                    position: 'west',
                    motion: { flipScope: 'chat-layout' }
                },
                {
                    id: 'active-conversation', // <<< This ID remains unchanged here (was NOT renamed globally like in oracle-hub)
                    component: 'ActiveConversationPanel',
                    minSize: 30,
                    defaultSize: 25, // C(25)
                    defaultSizeUnit: '%',
                    resizable: true,
                    position: 'center',
                    motion: { flipScope: 'chat-layout', viewTransitionTag: 'active-chat' }
                },
                { // Keep chat-context ID unchanged in this layout
                    id: 'chat-context', // <<< This ID remains unchanged here (was renamed in oracle-hub to chat-context-hub)
                    component: 'ChatContextPanel',
                    minSize: 15,
                    defaultSize: 25, // E1(25)
                    defaultSizeUnit: '%',
                    resizable: true,
                    position: 'east',
                    motion: { flipScope: 'chat-layout' }
                },
                { // INSERTED new Guild Welcome Panel (v6.2.0)
                    id: 'guild-welcome',
                    component: 'GuildWelcomePanel',
                    minSize: 15,
                    defaultSize: 25, // E2(25)
                    defaultSizeUnit: '%',
                    position: 'east', // Placed after chat-context
                    resizable: true
                },

            ], // Sum = 25 + 25 + 25 + 25 = 100%
        },
        inputBarBehavior: 'chat',
        defaultAgent: 'oracle',
        defaultPanelFocus: 'active-conversation', // Still valid as 'active-conversation' exists in this layout
        panelAnimations: { transition: 'fade' },
        mobileLayout: 'tabs',
        badgeCountSource: 'chatUnread',
        supportsSplitView: true,
    },
};

/* ========================================================================== */
/* === Route Mapping & Helpers ============================================ */
/* ========================================================================== */

export const compassRouteMap: Record<CompassKey, string> = {
    'oracle-hub': '/hub',
    'inner-sanctum': '/south',
    'ark-library': '/west',
    'guild-commons': '/east',
};

// Keep routeContextMap consistent with compassRouteMap and compassKeys
export const routeContextMap: ReadonlyArray<[string, CompassKey]> = [
    [compassRouteMap['oracle-hub'], 'oracle-hub'],
    [compassRouteMap['inner-sanctum'], 'inner-sanctum'],
    [compassRouteMap['ark-library'], 'ark-library'],
    [compassRouteMap['guild-commons'], 'guild-commons'],
];


export function resolveContextKey(path: string | null | undefined): CompassKey | null {
    if (!path) return null;
    // Use startsWith for prefix matching, e.g., /hub/some/subpath should resolve to oracle-hub
    const match = routeContextMap.find(([prefix]) => path.startsWith(prefix));
    return match ? match[1] : null;
}

// Helper function to generate view transition names (example, adjust as needed)
// No change needed here; kebab-case conversion handles the new ID correctly.
export function generateViewTransitionName(compassKey: CompassKey, panelId?: string): string {
    if (panelId) {
        // Simple kebab-case conversion for panel IDs
        const kebabPanelId = panelId
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // camelCase to kebab-case
            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2') // Handle adjacent caps like 'URLShort' -> 'url-short'
            .toLowerCase();
        return `panel-${kebabPanelId}`; // e.g., panel-chat-context-hub
    }
    return `compass-${compassKey}`; // e.g., compass-oracle-hub
}


/* ========================================================================== */
/* === Helper Functions ===================================================== */
/* ========================================================================== */

export function getPanelDefinition(key: CompassKey | string | null | undefined): PanelLayoutDefinition | null {
    // Ensure key is valid before accessing registry
    const isValidKey = key && compassKeys.includes(key as CompassKey);
    if (!isValidKey) {
        // Log warning only in non-production environments and if key is non-empty
        if (process.env.NODE_ENV !== 'production' && key != null && key !== '') {
            console.warn(`[layoutRegistry] getPanelDefinition called with invalid or unknown key: "${key}". Returning null.`);
        }
        return null;
    }
    // Return the definition or null if somehow still missing (shouldn't happen with validation)
    return registry[key as CompassKey] ?? null;
}

export const getCompassPanelDefinitions = (): PanelLayoutDefinition[] => {
    // Map keys to definitions and filter out potential undefined entries (defensive coding)
    return compassKeys
        .map((key) => registry[key])
        .filter((def): def is PanelLayoutDefinition => {
            // Log error in dev if a definition is unexpectedly missing for a known key
            if (!def && process.env.NODE_ENV !== 'production') {
                 // Get the actual key that resulted in an undefined definition
                 const missingKey = compassKeys.find(k => registry[k] === undefined);
                console.error(`[layoutRegistry] Invariant violation: Definition for key "${missingKey ?? 'unknown'}" from compassKeys was unexpectedly undefined.`);
            }
            return !!def; // Ensure only valid definitions are returned
        });
};


export function getContextOrDefault(path: string | null | undefined): CompassKey {
    // Resolve the context key from the path, fall back to default if null
    return resolveContextKey(path) ?? DEFAULT_COMPASS_KEY;
}

/**
 * Gets the primary navigation definitions for UI components like Sidebars.
 * UPDATED: Returns `iconLoader` of type `IconLoader`.
 */
export function getMainNavigationDefinitions(): Array<{
    key: CompassKey;
    title: string;
    iconLoader: IconLoader; // <<<< Correct field name and type
}> {
    return compassKeys.map((key) => {
        const definition = registry[key];
        // Add a check and throw if definition is missing (should be caught by validation)
        if (!definition) {
            // This should ideally never happen if Zod validation runs correctly
            const errorMsg = `[layoutRegistry] Invariant violation: Layout definition for required key "${key}" not found in registry during getMainNavigationDefinitions(). Ensure registry is fully populated and validated.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        return {
            key: key,
            title: definition.title,
            iconLoader: definition.iconLoader, // <<<< Return the actual loader function
        };
    });
}

/** Export the raw registry object. Use helpers preferably for type safety and validation. */
export const layoutRegistry = registry;

/* ========================================================================== */
/* === CI Assertion Helper ================================================== */
/* ========================================================================== */

/** Runs specific assertions for CI environments. */
export function runRegistryCIAssertions(options: { verbose?: boolean } = {}): void {
    const verbose = options.verbose ?? false;
    let errors: string[] = [];
    if (verbose) console.log('[layoutRegistry CI] Running assertions...');

    // 1. Run Zod validation (includes superRefine checks like panel ID uniqueness, percentages, defaultPanelFocus)
    try {
        validateLayoutRegistry(registry); // Uses the comprehensive validation
        if (verbose) console.log('[layoutRegistry CI] Base Zod schema and superRefine validation passed.');
    } catch (error: any) {
        // Append Zod validation failure message
        errors.push(`Zod schema/superRefine validation failed: ${error.message}`);
        // Zod errors are already logged in detail by validateLayoutRegistry, no need to repeat here
    }

    // --- Additional CI Checks (Optional: Mostly redundant with Zod superRefine, but can be explicit) ---

    // Example: Check iconLoader function existence (basic type check, Zod validates signature)
    compassKeys.forEach((key) => {
        const def = registry[key];
        if (!def) {
             // Should be caught by Zod, but defensive check
             errors.push(`Layout '${key}': Definition missing (CI Check).`);
             return;
        }
        if (typeof def.iconLoader !== 'function') {
            errors.push(`Layout '${key}': 'iconLoader' is not a function (type: ${typeof def.iconLoader}) (CI Check).`);
        }
    });

    // --- Report CI Results ---
    if (errors.length > 0) {
        console.error('\n[layoutRegistry CI] !!! CI ASSERTIONS FAILED !!!\n');
        // Log collected errors
        errors.forEach((err, index) => console.error(`  Assertion #${index + 1}: ${err}`));
        console.error('\n[layoutRegistry CI] --- End of CI Assertion Failures ---\n');
        // Fail the CI process if running in a CI environment
        if (process.env.CI === 'true' || process.env.CI === '1') {
             console.error(`Exiting CI process due to ${errors.length} layout registry assertion failure(s).`);
             process.exit(1); // Exit with non-zero code
        } else {
             // Throw an error locally to indicate failure without exiting the node process
             throw new Error(`Layout Registry CI Assertions failed locally (${errors.length} issues). See console logs.`);
        }
    } else {
        // Log success if verbose
        if (verbose) console.log('[layoutRegistry CI] All assertions passed.');
    }
}


/* ========================================================================== */
/* === Development Validation (DevCheck & Zod) ============================== */
/* ========================================================================== */
// Runs ONLY during development ('NODE_ENV' !== 'production'). Stripped in production builds.

if (process.env.NODE_ENV !== 'production') {
    try {
        if (process.env.LOG_LEVEL !== 'silent') console.log('[layoutRegistry DevCheck] Running development validation...');

        // 1. Run Zod Validation (Primary Check)
        // This catches schema errors, duplicate IDs, missing keys, bad percentages, invalid focus, etc.
        validateLayoutRegistry(registry);

        // 2. Log Overall Success if no errors were thrown by validateLayoutRegistry
        if (process.env.LOG_LEVEL !== 'silent') console.log('[layoutRegistry DevCheck] All development checks completed successfully.');

    } catch (error: any) {
        // Catch errors specifically from validateLayoutRegistry (Zod) or other checks
        console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! CRITICAL ERROR DURING LAYOUT REGISTRY VALIDATION (DEV) !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
        // Log error details - Zod errors are detailed within validateLayoutRegistry's catch block
        if (!(error instanceof z.ZodError)) {
             console.error('Error Details:', error.message || error);
             if (error.stack) console.error('Stack Trace:', error.stack);
        } else {
            // ZodError details are already logged by validateLayoutRegistry
            console.error(`>>> Zod validation failed with ${error.errors.length} issue(s). See details logged above.`);
        }
        console.error('\n>>> Review errors logged above and fix layoutRegistry definitions, panelRegistry imports, or Zod schemas. <<<\n');

        // Fail CI build if this validation runs and fails during CI (e.g., during tests)
        if (process.env.CI === 'true' || process.env.CI === '1') {
            console.error('>>> Failing CI build due to validation errors during DevCheck phase. <<<');
            process.exit(1); // Exit CI build
        }
        // Optional: Re-throw error locally to halt further script execution if desired
        // throw error;
    }
}

/* ========================================================================== */
/* === Standalone Validation CLI Hook ======================================= */
/* ========================================================================== */

// Allows running `ts-node src/lib/core/layoutRegistry.ts --validate`
// Added condition `require.main === module` to ensure it only runs when executed directly.
if (typeof require !== 'undefined' && require.main === module && process.argv.includes('--validate')) {
  console.log('[layoutRegistry CLI] Running standalone validation...');
  try {
    // Explicitly set NODE_ENV to development for validation to run
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    validateLayoutRegistry(layoutRegistry); // Run the same validation function

    // Reset NODE_ENV
    process.env.NODE_ENV = originalEnv;

    console.log('[layoutRegistry CLI] Validation OK. Registry definitions appear valid.');
    process.exit(0); // Exit with success code
  } catch (error: any) {
    console.error('\n[layoutRegistry CLI] !!! VALIDATION FAILED !!!\n');
    // Error details are already logged by validateLayoutRegistry
    console.error(`Error message: ${error.message}`);
    console.error('\n[layoutRegistry CLI] Please review the validation errors above and correct the layoutRegistry definitions.');
    process.exit(1); // Exit with failure code
  }
}


// --- Final Initialization Log (Dev only, not silent) ---
if (process.env.NODE_ENV !== 'production' && process.env.LOG_LEVEL !== 'silent') {
    // Use an updated version number string reflecting changes
    const versionString = "6.2.2 (Duplicate chat-context ID fix)"; // Updated version
    console.log(`[layoutRegistry] Initialized ${versionString} [${Object.keys(registry).length} definitions] @ ${new Date().toISOString()}`);
}