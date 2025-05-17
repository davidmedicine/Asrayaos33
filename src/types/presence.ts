// === File: src/types/presence.ts ===
// Description: Presence-related shared types for real-time features (ASR-225).
//              Exported through src/types/index.ts for barrel imports.

/**
 * NOTE: When persisting presenceSlice state containing Map objects (like Map<string, OnlinePresence>),
 * the Map must be manually serialized/deserialized using helpers (e.g., mapToJson/jsonToMap)
 * typically found in "@/lib/utils/serializationHelpers". Standard JSON.stringify/parse
 * does not preserve Map types and will result in data loss.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#json.stringify} MDN documentation on JSON/Map limitation.
 */

/* ------------------------------------------------------------------ */
/* Utility Types                                                     */
/* ------------------------------------------------------------------ */

/** Helper type to enforce exact object shapes, preventing extra properties. */
type Exact<T, Shape = T> =
  T & { [K in keyof Shape]: K extends keyof T ? T[K] : never } &
  { [K in Exclude<keyof T, keyof Shape>]: never };

/* ------------------------------------------------------------------ */
/* Kind of entity being tracked (who)                                */
/* ------------------------------------------------------------------ */
/**
 * Defines the type of entity whose presence is being tracked.
 * @remarks This enum defines the distinct types of entities whose presence can be tracked.
 * Add future kinds (like Bot) below Agent for easier git merges.
 */
export enum PresenceKind {
  User  = 'user',
  Agent = 'agent', // future-proof
  // Bot = 'bot', // ⇢ enable when bot accounts emit presence
  /* DO NOT reorder members; affects potential future numeric enum mapping */
}

/* ------------------------------------------------------------------ */
/* Supabase presence payload – kept intentionally lean               */
/* ------------------------------------------------------------------ */
/**
 * Lean payload sent to Supabase Presence for efficient tracking.
 * Contains minimal info needed to identify and display a presence entity.
 * Properties are readonly as this represents an immutable snapshot.
 * Use `StrictPresencePayload` for compile-time exactness check when sending.
 *
 * @see {@link https://supabase.com/docs/guides/realtime/presence} Supabase Presence Documentation (for context on minimal payload)
 */
export interface PresencePayload {
  /** Discriminator: identifies the type of entity (user/agent). */
  readonly kind: PresenceKind;
  /** Unique identifier for the user (UUID) or agent (agentId). */
  readonly id:   string;
  /** Display name of the user or agent. */
  readonly name: string;
  /** URL for the user's avatar or agent's icon. Null if not available. */
  readonly image: string | null;
  /**
   * Optional identifier of the chat room / conversation the entity is currently active in.
   * Must match naming used elsewhere (e.g., typing events, DB).
   * @remarks When sending to Supabase, prefer omitting the key (`undefined`) over sending `null` to save payload size if no room applies.
   */
  readonly roomId?: string;
}

/**
 * @deprecated Alias for PresencePayload to maintain compatibility during refactor (ASR-225 v9 directive used this name).
 * Will be removed after the refactor window. Use PresencePayload instead.
 */
// TODO(ASR-225 / vX.Y): Remove this alias after presence refactor is fully deployed/feature-flagged.
export type LeanPresencePayload = PresencePayload;

/**
 * A stricter version of PresencePayload ensuring no extra properties are included.
 * Use this type when constructing the payload object to send via Supabase `channel.track()`
 * to catch potential errors at compile time.
 * Example: `const payload: StrictPresencePayload = { ... }; // TS Error if extra fields exist`
 */
export type StrictPresencePayload = Exact<PresencePayload>;


/* ------------------------------------------------------------------ */
/* In-memory representation(s) used by presenceSlice                 */
/* ------------------------------------------------------------------ */
/**
 * Base interface for an entity present online (used internally for union).
 * Fields match PresencePayload where applicable, but includes UI-specific state like lastActive.
 */
interface OnlineEntityBase {
  readonly id: string;
  readonly name: string;
  // ↳ Mapped from `image` in PresencePayload by conversion helpers (e.g., src/lib/utils/realtimeHelpers.ts::convertSupabasePresenceStateToMap)
  readonly avatarUrl?: string | null; // Allows string, null, or undefined (omitted)
  readonly roomId?: string; // Must match PresencePayload.roomId
  readonly lastActive: number; // ms since epoch, updated on heartbeat
}

/**
 * Represents a *human user* currently online, intended for internal state management
 * (e.g., in `presenceSlice.onlineFriends` Map) and UI display.
 * Properties are readonly as this represents an immutable snapshot within the store.
 */
export interface OnlineFriend extends OnlineEntityBase {
  /** Explicitly identifies this entity as a User. */
  readonly kind: PresenceKind.User;
}

/**
 * Represents an *AI agent* currently online (future-proofing).
 * Properties are readonly as this represents an immutable snapshot within the store.
 */
export interface AgentPresence extends OnlineEntityBase {
  /** Explicitly identifies this entity as an Agent. */
  readonly kind: PresenceKind.Agent;
  // Add any agent-specific properties here if needed in the future
}

/**
 * Discriminated union representing any type of entity that can be present online.
 * Use this as the value type in a Map storing all online entities (`Map<string, OnlinePresence>`),
 * or in components/selectors that handle both users and agents.
 * Example: `function displayPresence(entity: OnlinePresence) { switch(entity.kind) { ... } }`
 */
export type OnlinePresence = OnlineFriend | AgentPresence; // Renamed UserPresence back to OnlineFriend


/* ------------------------------------------------------------------ */
/* Minimal payload for typing broadcast                              */
/* ------------------------------------------------------------------ */
/**
 * Payload broadcasted when a user starts or stops typing in a specific room.
 * Kept minimal to reduce network traffic. Not typically stored long-term.
 */
export interface TypingPayload {
  /** Identifier of the user who is typing. */
  userId:   string;
  /** Flag indicating whether the user is currently typing (true) or stopped (false). */
  isTyping: boolean;
  /** Identifier of the room where the typing activity is occurring. Must match PresencePayload.roomId */
  roomId:   string;
}

// Ensure newline at the end of the file for POSIX compliance and cleaner diffs.