// === File: src/types/a2a.ts ===
/**
 * @fileoverview
 * Core type definitions for the A2A (Agent-to-Agent) communication protocol.
 * Defines the structure for messages, tasks, artifacts, and other entities
 * exchanged between the frontend (A2A Client) and backend agents (A2A Remote).
 */

import { A2AMetadata } from './metadata';

// --- A2A Part Definitions (Discriminated Union) ---

/**
 * Base interface for common fields applicable to all A2A Part types.
 */
interface BasePart {
  /** Optional metadata providing context about the part's origin or content. */
  metadata?: A2AMetadata;
}

/**
 * Represents a text-based part of an A2A message.
 */
export interface TextPart extends BasePart {
  /** Discriminator indicating this is a text part. */
  type: 'text';
  /** The textual content of the part. */
  text: string;
}

/**
 * Represents the content of a file within an A2A message.
 * Either `bytes` (base64 encoded) or `uri` should be provided.
 */
export interface FileContent {
  /** Optional filename. */
  name?: string;
  /** The MIME type of the file (e.g., 'image/png', 'application/pdf'). */
  mimeType?: string;
  /** Base64-encoded file contents (use if embedding directly). */
  bytes?: string;
  /** URI pointing to the file location (use for external references or large files). */
  uri?: string;
}

/**
 * Represents a file-based part of an A2A message.
 */
export interface FilePart extends BasePart {
  /** Discriminator indicating this is a file part. */
  type: 'file';
  /** The file content information. */
  file: FileContent;
}

/**
 * Represents a structured data part of an A2A message (e.g., JSON).
 */
export interface DataPart extends BasePart {
  /** Discriminator indicating this is a data part. */
  type: 'data';
  /** The structured data payload. Use `unknown` for better type safety than `any`. */
  data: Record<string, unknown> | unknown[] | unknown;
}

/**
 * Discriminated union representing a single unit (Part) of communication
 * within the A2A protocol. A message can consist of one or more Parts.
 */
export type Part = TextPart | FilePart | DataPart;

// --- TODO (Brief 4.2 / A2A Protocol): Define the following core A2A types ---
/*
 * These types are crucial for interacting with the A2A backend.
 * They will define how tasks are managed, how agents are represented,
 * how artifacts are exchanged, and how messages are structured.
 */

/**
 * Represents an Agent's identity card or profile within the A2A ecosystem.
 * (Placeholder - Define properties like agentId, name, description, capabilities, endpoints, etc.)
 */
// export interface AgentCard { ... }

/**
 * Represents a task submitted to an A2A agent or system.
 * (Placeholder - Define properties like taskId, inputParts, requestedAgentId, status, context, metadata, etc.)
 */
// export interface Task { ... }

/**
 * Defines the possible states an A2A Task can be in during its lifecycle.
 */
export type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required' // Agent needs more info from user/client
  | 'completed'
  | 'canceled'
  | 'failed'
  | 'unknown';

/**
 * Represents the detailed status of an A2A Task, including its state and potentially progress info.
 * (Placeholder - Define properties like taskId, state: TaskState, progressPercent?, message?, requiredInputSchema?, etc.)
 */
// export interface TaskStatus { ... }

/**
 * Represents an artifact within the A2A protocol (distinct from frontend Artifact type if needed).
 * (Placeholder - Define properties like artifactId, mimeType, content (bytes/uri/data), metadata, createdAt, etc.)
 */
// export interface Artifact { ... }

/**
 * Represents a message within the A2A protocol (potentially distinct from frontend ChatMessage).
 * Likely composed of one or more `Part` objects.
 * (Placeholder - Define properties like messageId, parts: Part[], senderAgentId?, recipientAgentId?, timestamp, etc.)
 */
// export interface Message { ... }

/**
 * Defines the parameters required when sending a new Task request to the A2A backend.
 * (Placeholder - Define properties like inputParts: Part[], requestedAgentId?, priority?, callbackUrl?, etc.)
 */
// export interface TaskSendParams { ... }

/**
 * Configuration for how push notifications should be handled for A2A events or task updates.
 * (Placeholder - Define properties like enabled, targetPlatform, notificationPayloadTemplate, triggerEvents, etc.)
 */
// export interface PushNotificationConfig { ... }

// Ensure file ends with a newline