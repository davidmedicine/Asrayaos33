// === File: src/types/quest.ts ===
/**
 * @fileoverview
 * Interfaces related to Quests, which are structured, goal-oriented conversations
 * within Asraya OS, potentially linked to backend A2A Tasks.
 */

import { BaseConversation } from './base';
import type { AsrayaAgentId } from './agent'; // Assuming agent types are defined here

/**
 * Defines the possible statuses a Quest can be in.
 */
export type QuestStatus = 'draft' | 'active' | 'completed' | 'paused' | 'failed' | 'pending'; // Added 'pending'

/**
 * Defines the possible thematic intents that can guide a Quest's direction or agent behavior.
 */
export type QuestThemeIntent = 'ritual' | 'reflection' | 'creation' | 'collaboration' | 'development' | 'marketing' | 'research' | string; // Added examples, allow custom string

/**
 * Represents a defined milestone or step within a Quest.
 */
export interface QuestMilestone {
  /** Unique identifier for the milestone. */
  id: string;
  /** Short, descriptive label for the milestone. */
  label: string;
  /** Whether this milestone has been completed. */
  completed: boolean;
  /** Optional ISO 8601 timestamp string indicating a target completion date. */
  targetDate?: string;
}

/**
 * Represents the output or result of a Quest, potentially linking to
 * created artifacts, resulting agent states, or even spawned sub-quests.
 */
export interface QuestOutput {
  /** Optional: Link to an artifact created or modified during the Quest. */
  artifactId?: string;
  /** Optional: Link to an agent whose state was affected or created by the Quest. */
  agentId?: string;
  /** Optional: Link to another Quest that was spawned or resulted from this one. */
  questId?: string;
}

/**
 * Represents a structured, goal-oriented interaction (i.e., a Quest).
 * A specialized form of `BaseConversation` that may be linked to an A2A Task via `a2aTaskId`.
 */
export interface Quest extends BaseConversation {
  /** Discriminator to distinguish quest from chat. */
  type: 'quest';

  /** The primary, overarching goal of the Quest. */
  goal: string;
  /** Optional: User's stated intention or motivation for undertaking the Quest. */
  intention?: string;
  /** Optional: A summary of the final result or outcome of the Quest upon completion/failure. */
  outcome?: string;

  /** Current status of the quest. */
  status: QuestStatus;

  /** Optional: Numerical progress percentage (0-100) towards completing the Quest goal. THIS field is the source of truth for progress. */
  progressPercent?: number;

  /** Ordered milestones or steps associated with this quest. THIS field is the source of truth for milestones. */
  milestones?: QuestMilestone[];

  /** Optional: Array representing the outputs or results generated by the Quest. */
  outputs?: QuestOutput[];

  /** Optional thematic label (e.g., "reflection", "creation") to inform agent suggestions/UI. */
  themeIntent?: QuestThemeIntent;

  /** Optional indicator of a Quest's potential for evolution into a larger task or reflection. */
  evolvabilityScore?: number; // Typically 0-100

  /** Optional: A2A backend Task ID associated with this quest, used for streaming updates and linking execution state. */
  a2aTaskId?: string;

  /** Optional: Arbitrary metadata associated with the Quest. */
  metadata?: Record<string, any>;

  // Inherits fields from BaseConversation: id, userId, title, createdAt, updatedAt?, participants, agentId?, agentAvatarUrl?, isGroup?, isPinned?, unreadCount?, lastMessagePreview?, lastMessageTimestamp?, channelName?, display?
}

/**
 * Represents a suggestion for an action related to a Quest.
 * This is the structure expected by the useQuestMetadata hook and passed to SuggestedActions component.
 */
export interface QuestSuggestionInput {
  /** Unique identifier for the suggestion instance (important for keys). */
  id: string;
  /** The suggested action identifier (e.g., 'generate_code', 'analyze_competitors'). */
  action: string; // This is the key to look up config/logic
  /** Optional: Display label for the suggestion button (can override config). */
  label?: string;
  /** Optional: Explanation of why this action is suggested (can override config). */
  explanation?: string;
  /** Optional: The underlying reason or trigger for the suggestion. */
  reason?: string;
  /** Confidence score (0-1) for the suggestion (optional). */
  confidence?: number;
  /** Optional icon name hint (e.g., 'code', 'search') (can override config). */
  icon?: string;
  /** Optional agent ID best suited for this action. */
  preferredAgentId?: AsrayaAgentId | string; // Allow string for flexibility
  /** Optional arguments specific to this suggestion instance for the action. */
  args?: Record<string, any>;
}

/**
 * Metadata associated with a Quest, returned by the useQuestMetadata hook.
 * Includes additional context, analysis, and suggested actions.
 * Does NOT duplicate fields already present on the main Quest object (like progress, milestones).
 */
export interface QuestMetadata {
  /** The primary goal of the quest */
  goal: string;
  /** Optional user intention */
  intention?: string;
  /** Optional outcome description */
  outcome?: string;
  /** Optional summary of the quest */
  summary?: string;
  /** Keywords/tags associated with the quest. Non-optional array. */
  keywords: string[]; // CORRECTED: Made non-optional
  /** Optional evolvability score (e.g., 0-100) */
  evolvabilityScore?: number;
  /** Optional theme intent */
  themeIntent?: QuestThemeIntent;
  /** Suggested actions related to the quest. Non-optional array. */
  suggestions: QuestSuggestionInput[]; // CORRECTED: Made non-optional
  // Removed fields that belong on the Quest object itself:
  // progressPercent?: number;
  // milestones?: QuestMilestone[];
  // estimatedTimeToComplete?: string;
  // difficultyLevel?: 'easy' | 'medium' | 'hard' | string;
}

// --- TODOs ---
// TODO (Brief 4.5 / A2A Integration): Connect `a2aTaskId` from Quest object to the appropriate state slice (e.g., a2aTaskSlice) to fetch and display associated `StreamEvent` traces.
// TODO (Brief 5.1 / UI): Use `status` and `progressPercent` from the Quest object to drive UI elements like the `QuestProgressMeter` and visual state indicators in `ConversationListItem`.
// TODO (Brief 5.X / Agent Interaction): Leverage `themeIntent`, `goal`, `intention`, `keywords` from QuestMetadata to provide better context to agents involved in the Quest.
// TODO (Brief 6.X / Data Model): Ensure `milestones` and `outputs` on the Quest object are correctly stored/retrieved from Supabase (likely JSONB or related tables). Verify consistency between Quest fields and QuestMetadata fields.