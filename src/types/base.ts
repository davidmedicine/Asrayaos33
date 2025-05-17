// === File: src/types/base.ts ===
/**
 * @fileoverview
 * Base interface for conversations (chat, quest, etc.) within Asraya OS.
 * Defines the common structure shared across different conversation types.
 * Timestamps (`createdAt`, `updatedAt`, `lastMessageTimestamp`) should use ISO 8601 string format.
 */

import type { AsrayaAgentId } from './agent'; // Assuming agent types are defined here

/**
 * Represents a participant within a conversation.
 */
export interface Participant {
  /** Unique identifier for the participant (User ID or Agent ID). */
  id: string;
  /** Type of the participant. */
  type: 'user' | 'agent';
  /** Optional display name for the participant. */
  name?: string;
  /** Optional URL for the participant's avatar image. */
  avatarUrl?: string;
}

/**
 * Defines display-related properties for a conversation, allowing for custom styling or prioritization in lists.
 */
export interface ConversationDisplayConfig {
  /** Priority level for sorting or visual emphasis. */
  priority?: 'normal' | 'high' | 'urgent';
  /** Custom accent color (e.g., hex code) for specific highlighting. */
  accentColor?: string;
  // icon?: string; // Potential future addition: Custom icon identifier
}

/**
 * Shared base structure for all types of conversations (chats and quests).
 * Provides common fields for identification, metadata, participants, and status.
 */
export interface BaseConversation {
  /** Unique identifier for the conversation. */
  id: string;
  /** Identifier of the user this conversation belongs to. */
  userId: string;
  /** The type discriminator indicating whether this is a 'chat' or a 'quest'. */
  type: 'chat' | 'quest'; // Crucial type discriminator

  /** Human-readable title (auto-generated or user-defined). */
  title: string;
  /** ISO 8601 timestamp string when the conversation was created. */
  createdAt: string;
  /** ISO 8601 timestamp string when the conversation was last updated (optional). */
  updatedAt?: string; // Corrected: Optional

  /** List of participant objects (users and/or agents) involved in the conversation. */
  participants: Participant[]; // Corrected: Array of Participant objects

  /** Optional: Identifier of the primary AI agent associated with this conversation (relevant for 1-on-1 or agent-led quests). */
  agentId?: AsrayaAgentId;
  /** Optional URL to the primary agent's avatar, often derived from agentId (can be denormalized for performance). */
  agentAvatarUrl?: string;

  /** Flag indicating if this is a group conversation (more than 2 participants, or explicitly marked). */
  isGroup?: boolean;
  /** Flag indicating if the conversation is pinned by the user. */
  isPinned?: boolean;
  /** Count of unread messages within this conversation for the current user. */
  unreadCount?: number;

  /** Content snippet of the last message (for preview purposes in lists). */
  lastMessagePreview?: string; // Corrected: Renamed from lastMessage
  /** ISO 8601 timestamp string of the last message (for sorting conversation lists). */
  lastMessageTimestamp?: string; // Kept as optional

  /** Realtime channel name used for Supabase Broadcast/Presence subscriptions (e.g., `conversation:${id}`). */
  channelName?: string; // Example format: `conversation:${id}` for consistency

  /** Optional display configuration for custom UI styling or prioritization. */
  display?: ConversationDisplayConfig;

  // Potential future additions:
  // tags?: string[];
  // folderId?: string;
  // isArchived?: boolean;
}

// --- TODOs ---
// TODO (Realtime - Brief 4.X): Ensure `channelName` is consistently generated and used for Supabase subscriptions.
// TODO (Data Model - Brief 4.X): Ensure Supabase schema aligns with these types, especially `participants` (potentially a join table or JSONB).

// Ensure file ends with a newline