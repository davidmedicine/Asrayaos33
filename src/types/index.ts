// === File: src/types/index.ts ===
// Description: Barrel file for centralizing type exports in Asraya OS.
//              All re-exports are explicit to ensure clarity, support tree-shaking,
//              and prevent accidental full module re-exports.
//              Avoid over-using this for unrelated types to prevent tight coupling
//              and potential import cycles (enforced via ESLint: import/no-cycle).
//              Exports are grouped by domain and alphabetized within each group.

// --- Agent & AI ---
export type { AgentAction, AgentConfig, AgentProfile } from './agent'; // Assuming these types exist in './agent'

// --- Conversation Context ---
export type { Conversation, ConversationMeta, Participant } from './conversation'; // Assuming these types exist in './conversation'

// --- Core & System ---
export type { AppConfig, SystemStatus } from './core'; // Assuming these types exist in './core'

// --- Data & Models ---
export type { DocumentModel, Message, UserProfile } from './models'; // Assuming these types exist in './models'

// --- Presence & Realtime ---
// Includes LeanPresencePayload for consistency with hooks/tests (per v9 directive).
export type { LeanPresencePayload, OnlineFriend, PresenceKind, PresencePayload, TypingPayload } from './presence'; // Verify these types exist in './presence'

// --- UI & Layout ---
export type { LayoutMode, PanelState, Theme } from './layout'; // Assuming these types exist in './layout'

// Add other domain-specific type export groups here, keeping identifiers alphabetized.

// Note: Ensure a newline exists at the end of this file for POSIX compliance.