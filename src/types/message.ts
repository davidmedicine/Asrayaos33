// === File: src/types/message.ts ===
/**
 * @fileoverview
 * Message interfaces for chat and agent communication within Asraya OS.
 * Defines the structure of messages exchanged between users, agents, and the system,
 * including metadata for AI traces, status tracking, reactions, and threading.
 * Standardizes on ISO 8601 string format for timestamps (`createdAt`, `editedAt`).
 */

import { A2AMetadata } from './metadata';

/**
 * Represents the source entity of the message.
 * - 'user': Message originated from the end-user.
 * - 'agent': Message originated from an AI agent.
 * - 'system': Message originated from the Asraya OS system itself (e.g., hints, errors).
 */
export type MessageSenderType = 'user' | 'agent' | 'system';

/**
 * Represents the delivery or processing status of a message,
 * primarily relevant for client-side optimistic UI updates and error handling.
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Represents the semantic role or intent of the message within the conversation.
 * Helps distinguish message purpose beyond just the sender type, especially for specialized rendering.
 * - 'user': Standard user input.
 * - 'agent': Standard AI agent response.
 * - 'system': System-level information or status updates.
 * - 'multi-agent-coordination': Message specifically related to coordination or handoff between agents.
 */
// TODO (System Role - Brief 5.X): Implement rendering/logic for multi-agent-coordination role messages.
export type MessageRole = 'user' | 'agent' | 'system' | 'multi-agent-coordination';

/**
 * Predefined content types for messages, enabling specific UI rendering or handling.
 * Allows for flexibility with a fallback to `string`.
 */
export type MessageContentType =
  | 'text' // Default plain text message
  | 'artifact' // Message represents or links to an artifact
  | 'action_request' // Message contains data for a requested action
  | 'system_hint' // A hint or suggestion from the system
  | 'error' // An error message (content details the error)
  | 'trace' // Represents an AI thinking trace step (alternative: handle via StreamEvent)
  | string; // Allow other custom types

/** Type alias for the structure of message reactions. */
export type ReactionMap = Record<string, string[]>; // emoji -> userIds array

/**
 * Represents a single message within a conversation thread in Asraya OS.
 */
export interface ChatMessage {
  /** Unique identifier for the message (typically assigned by the backend). */
  id: string;
  /** Identifier of the conversation this message belongs to. */
  conversationId: string;
  /** Identifier of the sender (User ID or Agent ID). */
  senderId: string;
  /** The type of entity that sent the message. */
  senderType: MessageSenderType;
  /**
   * The semantic role or intent of the message. Optional, but recommended for clarity,
   * especially for 'system' or 'multi-agent-coordination' types.
   * If absent, role can often be inferred from `senderType`.
   */
  role?: MessageRole;

  /** The primary content of the message (usually text, but could be structured based on contentType). */
  content: string;
  /** ISO 8601 timestamp string indicating when the message was created on the server. */
  createdAt: string;

  // --- Optional fields ---

  /** Client-generated ID used for optimistic UI updates before backend confirmation. */
  clientGeneratedId?: string;
  /** Indicates if the message is currently displayed optimistically before backend confirmation. */
  isOptimistic?: boolean;
  /** Specifies the type of content in the `content` field (e.g., 'text', 'artifact'). Defaults to 'text'. */
  contentType?: MessageContentType;
  /** Structured data if the message relates to a specific artifact (used when contentType='artifact'). */
  artifactData?: { id: string; name: string; type?: string }; // Example structure, refine as needed
  /** Structured data if the message represents a tool call or suggested action (used when contentType='action_request'). */
  actionData?: Record<string, any>; // Define a specific ActionRequest type later if possible
  /** Map of emoji reactions to an array of user IDs who added that reaction. */
  reactions?: ReactionMap;

  // --- Threading fields ---
  /** Identifier for a nested thread this message is replying to. */
  threadId?: string;
  /** Optional: Explicit ID of the direct parent message within the thread. */
  parentMessageId?: string;
  /** Optional: Depth level for visual nesting of replies. */
  threadDepth?: number;

  // --- Edit tracking ---
  /** ISO 8601 timestamp string indicating when the message was last edited. */
  editedAt?: string;
  /** Convenience flag, often derived (`editedAt > createdAt`). */
  isEdited?: boolean;

  // --- Metadata ---
  /** Metadata associated with the message, often from A2A interactions (agent name, tool name, step type, etc.). */
  metadata?: A2AMetadata;

  // --- Status tracking ---
  /** Current delivery or processing status of the message. */
  status?: MessageStatus;

  // --- Optional Diagnostic fields ---
  /** Unique ID for debugging purposes, separate from the primary `id`. */
  debugId?: string;
  /** Categorizes the origin or trigger for the message. */
  sourceType?: 'user_input' | 'agent_response' | 'tool_call' | 'system_event' | 'directive_result';
}

// --- TODOs ---
// TODO (Realtime - Brief 4.X): Assumes storage in dedicated 'messages' Supabase table with FK to conversationId. Realtime updates will trigger based on this table. Define RLS policies.
// TODO (Threads - Brief 6.X): If threadId, display "In reply to..." header (fetch parentMessageId summary if needed), nest visually (using threadDepth for margin/border), potentially show SessionSummaryBubble component.

// Ensure file ends with a newline