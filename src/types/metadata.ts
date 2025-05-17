// === File: src/types/metadata.ts ===
/**
 * @fileoverview
 * Shared metadata schema used by agent traces, tool calls, and streaming A2A events.
 * Consumed by: ChatMessage, StreamEvent, SuggestedActions, ThinkingTraceMessage, etc.
 * Enables UI attribution, styling, trace grouping, and agent-aware rendering.
 */

/**
 * Defines the possible types of cognitive steps an agent might perform during a task.
 * Used for visualizing thinking traces.
 */
export type StepType = 'thought' | 'action' | 'observation' | 'response';

/**
 * Represents metadata associated with A2A (Agent-to-Agent) communication parts,
 * messages, or thinking traces. Provides context for UI rendering and interpretation.
 */
export interface A2AMetadata {
  /** Agent that produced this trace or message part (used for styling and attribution) */
  agentName?: string;

  /** Name of the tool invoked (used for tool call rendering, icons) */
  toolName?: string;

  /** Type of cognitive step performed by the agent (visualized as trace line) */
  stepType?: StepType;

  /** Optional source context or backend reference ID (e.g., specific LangGraph node) */
  a2aSource?: string;

  /** Confidence score (0–1) attached to the trace, action, or suggestion */
  confidence?: number;

  // Potential future additions:
  // cost?: number; // Token cost associated with this step
  // latency?: number; // Time taken for this step in ms
  // errorDetails?: string; // Specific error info if this step failed
}

// Ensure file ends with a newline