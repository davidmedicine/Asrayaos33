// === File: src/types/agents.ts ===

/**
 * agent.ts
 * TypeScript definitions related to Asraya OS Symbolic Agents (v12.3 - Final Enhancements)
 * Includes extended metadata, instance tracking, and helper constants.
 */

// --- Agent Identifiers ---
export type AsrayaAgentId =
  | 'oracle'    // Wisdom, Insight, Default
  | 'muse'      // Creativity, Inspiration, Artistry
  | 'witness'   // Observation, Analysis, Neutrality
  | 'navigator' // Guidance, Planning, Strategy
  | 'scribe'    // Knowledge, Documentation, Recording (Uses Value Accent)
  | 'seeker'    // Exploration, Curiosity, Questioning
  | 'editor';   // Refinement, Clarity, Polishing

// Export const array of IDs for convenience (Suggestion #2)
export const AGENT_IDS: AsrayaAgentId[] = [
    'oracle', 'muse', 'witness', 'navigator', 'scribe', 'seeker', 'editor'
];

// --- Agent Capabilities ---
export type AgentCapabilityCategory = 'cognitive' | 'creative' | 'reflective' | 'expressive' | 'task' | 'knowledge';

export interface AgentCapabilities {
  // Core capabilities (as defined previously)
  reflection?: boolean;
  editing?: boolean;
  toolUse?: boolean;
  planning?: boolean;
  knowledge?: boolean;
  creativity?: boolean;
  clarity?: boolean;
  analysis?: boolean;
  questioning?: boolean;
  documentation?: boolean;
  strategy?: boolean;
  // --- Minor Improvements Added ---
  category?: AgentCapabilityCategory | string; // Optional semantic grouping
}

// Export const array of known capability keys (Suggestion #2)
export const AGENT_CAPABILITY_KEYS: (keyof AgentCapabilities)[] = [
    'reflection', 'editing', 'toolUse', 'planning', 'knowledge',
    'creativity', 'clarity', 'analysis', 'questioning', 'documentation',
    'strategy', 'category' // Include category itself if needed
];


// --- Orb Visual Configuration ---
export interface OrbConfig {
  profile: 'nebula' | 'crystal' | 'flame' | 'custom' | string;
  noiseScale?: number;
  rippleSpeed?: number;
  glowIntensity?: number;
  color1?: string;
  color2?: string;
  // ... other potential shader parameters
}

// --- Agent Interaction Mode ---
export type AgentMode = 'ritual' | 'assistant' | 'companion'; // Example modes

// --- Core Agent Definition (Enhanced) ---
export interface AgentDefinition {
  id: AsrayaAgentId;
  name: string;
  tone: string;
  symbol: string;               // Path to SVG icon/symbol file
  colorPrimary: string;         // OKLCH color string
  colorSecondary: string;       // OKLCH color string
  themeClass: string;           // e.g., "theme-oracle"
  description?: string;          // UI description/tooltip
  metaTags?: string[];           // Keywords for filtering/search

  // Functional Properties
  model?: 'oracle' | 'claude' | 'chatgpt' | 'gemini' | 'self-hosted';
  supports?: AgentCapabilities;
  initialPrompt?: string;
  voiceId?: string;

  // Visual Properties
  agentAvatarGradient?: string; // CSS variable (e.g., "var(--agent-avatar-gradient)")
  avatarStyle?: 'orb' | 'symbol' | 'image';
  orbConfig?: OrbConfig;

  // --- Minor Improvements Added ---
  aiPersonaDescription?: string; // Detailed description for system prompts
  onboardingQuote?: string;      // Poetic phrase for UI/onboarding
  agentMode?: AgentMode;         // Hint for interaction style
}

// --- User Agent Configuration (User Overrides) ---
export interface AgentConfig {
  overrideTone?: string;
  orbConfig?: Partial<OrbConfig>;
  // Add other potential overrides...
}

// --- User Agent Instance (Renamed from AgentData) ---
export interface AgentInstance { // Renamed (Suggestion #1)
  instanceId: string;         // Unique ID for this specific instance
  userId: string;             // User association
  agentDefinitionId: AsrayaAgentId; // Link to base definition
  customName?: string;         // User-defined name for this instance
  config?: AgentConfig;        // User overrides applied to this instance
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp

  // --- Minor Improvements Added ---
  memoryContextId?: string;    // Optional ID linking to specific memory context
  lastUsedAt?: string;         // Optional: ISO timestamp for recency logic
  isPinned?: boolean;          // Optional: For UI docking/shortcuts
}

// --- Agent Operational State Enum ---
export type AgentState = 'idle' | 'thinking' | 'speaking' | 'listening' | 'error';