// === File: src/types/stream.ts ===

/**

 * @fileoverview

 * Defines the structure for streamable events, primarily focused on rendering

 * real-time AI thinking traces and progress updates in the UI, potentially

 * derived from underlying A2A SSE events.

 */



import { Part } from './a2a'; // Corrected: Import the 'Part' union type



/**

 * Defines the types of stream events relevant for UI rendering and state updates.

 * This is distinct from the raw A2A SSE event types (TaskStatusUpdate, TaskOutputUpdate, etc.)

 * and focuses on the granular updates to be displayed to the user.

 */

export type StreamEventType =

  | 'thinking'   // Represents an intermediate thought or processing step (often rendered as a trace)

  | 'streaming'  // Represents a chunk of the final output being streamed

  | 'complete'   // Signals the successful completion of the task or stream

  | 'error';     // Signals an error occurred during processing



/**

 * Represents a single streamable event emitted during the processing of an

 * A2A Task, primarily intended for frontend UI rendering of progress,

 * thinking traces, or final output chunks.

 */

export interface StreamEvent {

  /** Optional: ID of the A2A task this event belongs to. Helps correlate events. */

  taskId?: string;



  /** Type of stream event, determining how it should be interpreted or rendered in the UI. */

  type: StreamEventType; // Corrected: Use the specific union type for UI events



  /**

   * The core payload of the event, typically a single `Part` (text, file, or data).

   * For 'error' type, this might contain error details instead of a standard Part.

   * For 'complete' type, this might be absent or contain final summary data.

   * For 'thinking' type, this often contains the textual representation of the thought.

   * For 'streaming' type, this contains the next chunk of the output.

   */

  part?: Part | { errorMessage: string; errorDetails?: any }; // Corrected: Use 'Part' union type. Allow error structure. Make optional for 'complete'.



  /** ISO 8601 timestamp string indicating when the event occurred or was processed by the frontend. */

  timestamp: string; // Consider using `number` (epoch ms) for easier sorting



  /** Optional identifier of the backend component, agent, or specific step that generated this event. */

  source?: string;



  /** Optional: Sequence number or index for ordering events within a stream if timestamps are identical. */

  sequence?: number;



  // --- Optional fields for richer trace rendering (Consider adding in Brief 5+) ---

  /** Optional: ID for grouping related 'thinking' steps visually. */

  // traceId?: string;

  /** Optional: ID of a parent event for rendering nested traces. */

  // parentEventId?: string;

  /** Optional: Debugging ID for correlation across systems. */

  // debugId?: string;

}



// --- TODOs ---

// TODO (Brief 4.X / A2A Mapping): Implement logic (e.g., in useA2AClient hook) to map raw A2A SSE events (TaskStatusUpdate, TaskOutputUpdate, etc.) into these frontend-focused `StreamEvent` objects.

// TODO (Brief 5.1 / UI Rendering): Ensure components like `ThinkingTraceMessage` and `ActiveConversationPanel` correctly render different `StreamEvent` types, using `part` content and `metadata` within the `Part`.

// TODO (Brief 5.2 / Error Handling): Define a consistent structure for the `part` payload when `type` is 'error'.



// Ensure file ends with a newline// === File: src/types/stream.ts ===

/**

 * @fileoverview

 * Defines the structure for streamable events, primarily focused on rendering

 * real-time AI thinking traces and progress updates in the UI, potentially

 * derived from underlying A2A SSE events.

 */



import { Part } from './a2a'; // Corrected: Import the 'Part' union type



/**

 * Defines the types of stream events relevant for UI rendering and state updates.

 * This is distinct from the raw A2A SSE event types (TaskStatusUpdate, TaskOutputUpdate, etc.)

 * and focuses on the granular updates to be displayed to the user.

 */

export type StreamEventType =

  | 'thinking'   // Represents an intermediate thought or processing step (often rendered as a trace)

  | 'streaming'  // Represents a chunk of the final output being streamed

  | 'complete'   // Signals the successful completion of the task or stream

  | 'error';     // Signals an error occurred during processing



/**

 * Represents a single streamable event emitted during the processing of an

 * A2A Task, primarily intended for frontend UI rendering of progress,

 * thinking traces, or final output chunks.

 */

export interface StreamEvent {

  /** Optional: ID of the A2A task this event belongs to. Helps correlate events. */

  taskId?: string;



  /** Type of stream event, determining how it should be interpreted or rendered in the UI. */

  type: StreamEventType; // Corrected: Use the specific union type for UI events



  /**

   * The core payload of the event, typically a single `Part` (text, file, or data).

   * For 'error' type, this might contain error details instead of a standard Part.

   * For 'complete' type, this might be absent or contain final summary data.

   * For 'thinking' type, this often contains the textual representation of the thought.

   * For 'streaming' type, this contains the next chunk of the output.

   */

  part?: Part | { errorMessage: string; errorDetails?: any }; // Corrected: Use 'Part' union type. Allow error structure. Make optional for 'complete'.



  /** ISO 8601 timestamp string indicating when the event occurred or was processed by the frontend. */

  timestamp: string; // Consider using `number` (epoch ms) for easier sorting



  /** Optional identifier of the backend component, agent, or specific step that generated this event. */

  source?: string;



  /** Optional: Sequence number or index for ordering events within a stream if timestamps are identical. */

  sequence?: number;



  // --- Optional fields for richer trace rendering (Consider adding in Brief 5+) ---

  /** Optional: ID for grouping related 'thinking' steps visually. */

  // traceId?: string;

  /** Optional: ID of a parent event for rendering nested traces. */

  // parentEventId?: string;

  /** Optional: Debugging ID for correlation across systems. */

  // debugId?: string;

}



// --- TODOs ---

// TODO (Brief 4.X / A2A Mapping): Implement logic (e.g., in useA2AClient hook) to map raw A2A SSE events (TaskStatusUpdate, TaskOutputUpdate, etc.) into these frontend-focused `StreamEvent` objects.

// TODO (Brief 5.1 / UI Rendering): Ensure components like `ThinkingTraceMessage` and `ActiveConversationPanel` correctly render different `StreamEvent` types, using `part` content and `metadata` within the `Part`.

// TODO (Brief 5.2 / Error Handling): Define a consistent structure for the `part` payload when `type` is 'error'.



// Ensure file ends with a newline