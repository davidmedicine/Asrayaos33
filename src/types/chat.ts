// === File: src/types/chat.ts ===
/**
 * @fileoverview
 * Defines the interface for a standard chat conversation within Asraya OS.
 * Extends the shared BaseConversation type.
 */

import { BaseConversation } from './base';

/**
 * Represents a basic 1:1 or group chat conversation (non-quest).
 * This structure is extended from `BaseConversation` and distinguishes itself via `type: 'chat'`.
 * It includes common properties and allows for future chat-specific additions.
 */
export interface Conversation extends BaseConversation {
  /** Discriminator used to differentiate from other conversation types (e.g., Quest). */
  type: 'chat';

  /**
   * Optional: Whether the conversation is pinned by the user.
   * While also present in BaseConversation, it's repeated here for potential chat-specific pinning logic if needed.
   * Consider consolidating if behavior is identical across types.
   */
  isPinned?: boolean;

  /**
   * Optional tags associated with the conversation for filtering, context, or categorization.
   */
  tags?: string[];

  // --- Placeholder for future chat-specific properties ---
  // Example:
  // isMuted?: boolean; // Whether the user has muted notifications for this chat.
  // customTitle?: string; // User-overridden title if different from auto-generated.

  // --- TODOs ---
  // TODO (Brief 4.5 / or later): Reconcile/confirm if `unreadCount` from BaseConversation is sufficient or if chat needs specific tracking.
  // TODO (Brief 5.1 / or later): Implement muted chat state and corresponding UI/notification filtering.
  // TODO (Data Model - Brief 4.X): Ensure Supabase schema can store `tags` effectively (e.g., text[] array or separate join table).
}

/**
 * Tab filter options for the conversation list
 */
export type ConversationTabType = 'chats' | 'channels' | 'online';

// Ensure file ends with a newline