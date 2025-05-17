/**
 * agentRegistry.ts
 * Central registry for Asraya OS agent definitions with metadata, colors, and theme classes.
 * Includes agent categories, explicit color definitions, and helper functions.
 * v1.10 - Refactored shared types to @/types/agent
 */

// Import shared types from the central location
import {
  AsrayaAgentId,
  AGENT_IDS,
  ColorTokens,     // <-- Imported
  AgentCategory,   // <-- Imported
  AgentCapability  // <-- Imported
} from '@/types/agent';

// --- Agent Metadata Interface ---
// (AgentMetaData can stay here if primarily used by the registry, or moved to types/agent.ts if widely shared)
/** Describes the metadata for a single Asraya OS agent */
export interface AgentMetaData {
/** Unique identifier for the agent */
id: AsrayaAgentId;
/** User-facing name of the agent */
name: string;
/** Brief description of the agent's purpose and function */
description: string;
/** List of core capabilities the agent possesses */
capabilities: AgentCapability[]; // Uses imported type
/** Functional or thematic tags for filtering/grouping */
tags?: string[];
 /** The primary category the agent falls into */
category: AgentCategory; // Uses imported type
/** CSS class name applied to scope the agent's theme */
themeClass: string;
/** Object containing specific color variables and gradients for the agent */
colorTokens: ColorTokens; // Uses imported type
/** Optional name of the icon component associated with the agent (e.g., for UI) */
iconName?: string; // Assumes icon components are mapped elsewhere
}

// --- Central Agent Registry ---

// IMPORTANT: Verify all CSS variable names used in colorTokens (primary, secondary, glow) exist in globals.css
//            Run `npm run validate:css-vars` to automatically check this.
export const agentRegistry: Record<AsrayaAgentId, AgentMetaData> = {
// Oracle - Wisdom, Insight, Strategy
oracle: {
  id: 'oracle',
  name: 'Oracle',
  description: 'Offers deep reflective insight and wisdom drawn from vast knowledge pools.',
  capabilities: ['Reflection', 'Knowledge', 'Strategy', 'Synthesis'],
  tags: ['core', 'wisdom', 'reflective', 'strategic'],
  category: 'reflective',
  themeClass: 'theme-oracle',
  colorTokens: {
    primary: 'var(--color-wisdom-indigo-500)',
    secondary: 'var(--color-wisdom-indigo-400)',
    glow: 'var(--glow-primary-xs)',
    avatarGradient: 'radial-gradient(circle, var(--color-wisdom-indigo-400), var(--color-wisdom-indigo-600))',
  },
  iconName: 'BrainCircuitIcon'
},

// Muse - Creativity, Inspiration
muse: {
  id: 'muse',
  name: 'Muse',
  description: 'Sparks creativity and generates novel perspectives and inspirations.',
  capabilities: ['Creativity', 'Inspiration', 'Ideation', 'Expression'],
  tags: ['core', 'creative', 'artistic', 'generative'],
  category: 'creative',
  themeClass: 'theme-muse',
  colorTokens: {
    primary: 'var(--color-create-magenta-500)',
    secondary: 'var(--color-create-magenta-400)',
    glow: 'var(--glow-primary-xs)',
    avatarGradient: 'radial-gradient(circle, var(--color-create-magenta-400), var(--color-create-magenta-600))',
  },
  iconName: 'SparkleIcon'
},

// Witness - Observation, Analysis, Neutrality
witness: {
  id: 'witness',
  name: 'Witness',
  description: 'Observes with clarity and provides neutral, detailed analysis.',
  capabilities: ['Observation', 'Analysis', 'Objectivity', 'Detail'],
  tags: ['core', 'analytical', 'neutral', 'observational'],
  category: 'analytical',
  themeClass: 'theme-witness',
  colorTokens: {
    primary: 'var(--color-info-cyan-500)',
    secondary: 'var(--color-info-cyan-600)', // Adjusted shade
    glow: 'var(--glow-primary-xs)',
    avatarGradient: 'radial-gradient(circle, var(--color-info-cyan-500), var(--color-info-cyan-700))',
  },
  iconName: 'EyeIcon'
},

// Navigator - Guidance, Planning, Direction
navigator: {
  id: 'navigator',
  name: 'Navigator',
  description: 'Guides through complexity and helps chart paths toward goals.',
  capabilities: ['Planning', 'Direction', 'Strategy', 'Guidance'],
  tags: ['core', 'strategic', 'guiding', 'planning'],
  category: 'strategic',
  themeClass: 'theme-navigator',
  colorTokens: {
    primary: 'var(--color-success-green-500)',
    secondary: 'var(--color-success-green-600)', // Adjusted shade
    glow: 'var(--glow-primary-xs)',
    avatarGradient: 'radial-gradient(circle, var(--color-success-green-500), var(--color-success-green-700))',
  },
  iconName: 'CompassIcon'
},

// Scribe - Knowledge, Documentation
scribe: {
  id: 'scribe',
  name: 'Scribe',
  description: 'Records, organizes, and preserves knowledge with clarity and structure.',
  capabilities: ['Documentation', 'Organization', 'Memory', 'Precision'],
  tags: ['core', 'knowledge', 'recording', 'organizing'],
  category: 'knowledge',
  themeClass: 'theme-scribe',
  colorTokens: {
    primary: 'var(--color-value-amber-500)',
    secondary: 'var(--color-value-amber-400)',
    glow: 'var(--glow-primary-xs)',
    avatarGradient: 'radial-gradient(circle, var(--color-value-amber-400), var(--color-value-amber-600))',
  },
  iconName: 'ScrollIcon'
},

// Seeker - Exploration, Curiosity, Questioning
seeker: {
  id: 'seeker',
  name: 'Seeker',
  description: 'Explores possibilities, asks meaningful questions, and investigates with curiosity.',
  capabilities: ['Exploration', 'Questioning', 'Curiosity', 'Discovery'],
  tags: ['core', 'explorative', 'questioning', 'curious'],
  category: 'explorative',
  themeClass: 'theme-seeker',
  colorTokens: {
    primary: 'var(--color-warning-orange-500)', // Adjusted color
    secondary: 'var(--color-warning-orange-400)',
    glow: 'var(--glow-primary-xs)',
    avatarGradient: 'radial-gradient(circle, var(--color-warning-orange-400), var(--color-warning-orange-600))',
  },
  iconName: 'SearchIcon'
},

// Editor - Refinement, Clarity, Polishing
editor: {
  id: 'editor',
  name: 'Editor',
  description: 'Refines, clarifies, and polishes both content and concepts for greater quality.',
  capabilities: ['Editing', 'Clarity', 'Refinement', 'Precision'],
  tags: ['core', 'refining', 'polishing', 'editorial'],
  category: 'refining',
  themeClass: 'theme-editor',
  colorTokens: {
    primary: 'var(--color-wisdom-indigo-400)',
    secondary: 'var(--color-wisdom-indigo-300)', // Adjusted shade
    glow: 'var(--glow-primary-xs)',
    avatarGradient: 'radial-gradient(circle, var(--color-wisdom-indigo-300), var(--color-wisdom-indigo-500))',
  },
  iconName: 'PencilIcon'
},
};

// --- Constants ---

/** The default agent ID to use when no specific agent is requested or found. */
export const DEFAULT_AGENT_ID: AsrayaAgentId = 'oracle';

// --- Helper Functions ---

/**
* Safely retrieves agent metadata by ID, falling back to the default agent if needed.
* @param agentId - The ID of the agent to retrieve. Can be null or undefined.
* @param fallbackId - Optional fallback agent ID. Defaults to DEFAULT_AGENT_ID ('oracle').
* @returns The agent metadata. Returns metadata for the fallback agent if the requested ID is invalid or not found.
*/
export function getAgentData(
agentId: AsrayaAgentId | string | null | undefined,
fallbackId: AsrayaAgentId = DEFAULT_AGENT_ID
): AgentMetaData {
if (agentId && isValidAgentId(agentId)) {
  return agentRegistry[agentId];
}
// Only log warning in non-production environments? Optional optimization.
if (process.env.NODE_ENV !== 'production') {
     console.warn(`Agent ID "${agentId}" not found or invalid. Falling back to "${fallbackId}".`);
}
return agentRegistry[fallbackId];
}

/**
* Validates if a given string is a valid AsrayaAgentId defined in the AGENT_IDS constant.
* Uses a type predicate to narrow down the type if it returns true.
* @param id - The string to validate.
* @returns `true` if the string is a valid AsrayaAgentId, `false` otherwise.
*/
export function isValidAgentId(id: string | null | undefined): id is AsrayaAgentId {
if (!id) {
  return false;
}
return AGENT_IDS.includes(id as AsrayaAgentId);
}


// --- Debug Utility ---
// (Keep logAgentRegistrySummary function as is)
/**
* Logs a summary table of the registered agents to the console.
* Useful for development and debugging purposes.
* Only logs if console.table is available.
*/
export function logAgentRegistrySummary(): void {
if (typeof console !== 'undefined' && typeof console.table === 'function' && process.env.NODE_ENV !== 'production') {
  try {
    console.groupCollapsed('Agent Registry Summary'); // Use group to make it less noisy
    console.table(
      Object.values(agentRegistry).map(meta => ({
        ID: meta.id,
        Name: meta.name,
        Category: meta.category,
        Capabilities: meta.capabilities.join(', '),
        Theme: meta.themeClass,
        Icon: meta.iconName || 'N/A',
      }))
    );
    console.groupEnd();
  } catch (error) {
    console.error("Error logging agent registry summary:", error);
    console.log("Agent Registry:", agentRegistry); // Fallback
  }
} else if (process.env.NODE_ENV !== 'production'){
  console.log("Agent Registry (console.table not available or production env):", agentRegistry); // Fallback
}
}

// Example usage (maybe call this conditionally during dev server startup?)
// if (process.env.NODE_ENV === 'development') {
//    logAgentRegistrySummary();
// }