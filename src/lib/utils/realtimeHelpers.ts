/**
 * realtimeHelpers.ts
 * Core utilities for realtime presence and typing indicators.
 * Optimized for performance, bundle size, robustness, and alignment
 * with Supabase presence semantics and the application's OnlineFriend interface.
 * Incorporates feedback addressing edge cases, naming, performance heuristics,
 * and Supabase/Phoenix constraints.
 *
 * @since v1.0.0 (Revised based on feedback)
 */

// Imports: Use direct imports for clarity and potential tree-shaking benefits.
import { OnlineFriend, PresencePayload, PresenceKind } from '@/types/presence'; // Ensure this path is correct

// --- Constants ---

/**
 * Default maximum number of presence entries (prev + new) to aggregate for diffing heuristic.
 * If the total number exceeds this, a full replacement is suggested instead of a detailed diff.
 * @type {number}
 * @since v1.0.0
 */
export const DEFAULT_PRESENCE_DIFF_SCAN_LIMIT = 2000;

/**
 * Maximum number of presence entries (prev + new) before suggesting a full replacement diff.
 * Configurable via NEXT_PUBLIC_PRESENCE_DIFF_SCAN_LIMIT environment variable.
 * Validated to ensure it's a finite, positive number.
 * @since v1.0.0
 */
const parsedScanLimit = Number(process.env.NEXT_PUBLIC_PRESENCE_DIFF_SCAN_LIMIT);
export const PRESENCE_DIFF_SCAN_LIMIT =
  // Ensure finite AND positive number (Feedback 2.4 addressed implicitly by existing robust check)
  Number.isFinite(parsedScanLimit) && parsedScanLimit > 0
  ? parsedScanLimit
  : DEFAULT_PRESENCE_DIFF_SCAN_LIMIT;

/**
 * Default maximum number of users to track simultaneously in the typing indicators map.
 * @type {number}
 * @since v1.1.0
 */
export const DEFAULT_MAX_TYPING_USERS = 50;

/**
 * Maximum number of users to track in the typing indicators map.
 * Configurable via NEXT_PUBLIC_MAX_TYPING_USERS environment variable.
 * Validated to ensure it's a finite, positive number.
 * @since v1.1.0
 */
const parsedMaxTyping = Number(process.env.NEXT_PUBLIC_MAX_TYPING_USERS);
export const MAX_TYPING_USERS =
  // Ensure finite AND positive number (Feedback 2.4 clarification - logic remains robust)
  Number.isFinite(parsedMaxTyping) && parsedMaxTyping > 0
  ? parsedMaxTyping
  : DEFAULT_MAX_TYPING_USERS;


/**
 * Flag to ensure the oversize diff warning is logged only once per session/module load.
 * @since v1.0.0
 */
let hasWarnedAboutDiffLimit = false;

/**
 * Development-only counter for tracking how many times the diff heuristic triggered a full replace.
 * Accessible via `window.__presenceDiffMisses` in non-production environments.
 * @since v1.0.0
 */
// (Feedback 3 - Nitpick: Wrap window access)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    (window as any).__presenceDiffMisses = 0;
}

/**
 * Returns fresh, non-frozen empty Maps for diff results to prevent shared state mutation.
 *
 * @returns {{ added: Map<string, OnlineFriend>, removed: Map<string, OnlineFriend>, updated: Map<string, OnlineFriend> }}
 * @since v1.1.0
 */
const getNoChanges = (): {
  added: Map<string, OnlineFriend>;
  removed: Map<string, OnlineFriend>;
  updated: Map<string, OnlineFriend>;
} => ({
  added: new Map<string, OnlineFriend>(),
  removed: new Map<string, OnlineFriend>(),
  updated: new Map<string, OnlineFriend>(),
});


// --- Custom Throttle Implementation ---

/**
 * (Feedback 1.1 Strength: Lean, dependency-free throttle)
 * Bespoke throttle implementation invoked at most once per `wait` milliseconds.
 * Mimics Lodash's basic throttle behavior with leading/trailing options.
 * Exposes the original callback via `.original` and a `.cancel()` method.
 * Includes fixes based on feedback (Feedback 2.8).
 *
 * @template T - The type of the callback function.
 * @param {T} callback The function to throttle.
 * @param {number} wait The throttle wait time in milliseconds.
 * @param {{ leading?: boolean, trailing?: boolean }} [options={ leading: true, trailing: true }] Options object.
 * @returns {{ (...args: Parameters<T>): ReturnType<T> | undefined, cancel: () => void, flush: () => ReturnType<T> | undefined, original: T }} The throttled function with cancel/flush methods and original callback reference.
 * @since v1.0.0 (Revised based on feedback)
 */
function customThrottle<T extends (...args: any[]) => any>(
    callback: T,
    wait: number,
    options: { leading?: boolean; trailing?: boolean } = {}
): {
    (...args: Parameters<T>): ReturnType<T> | undefined;
    cancel: () => void;
    flush: () => ReturnType<T> | undefined; // Added flush method
    original: T;
} {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;
    let lastThis: any = null; // Store context
    let lastCallTime: number = 0;
    let previousResult: ReturnType<T> | undefined;
    const { leading = true, trailing = true } = options;

    const invokeFunc = (time: number): ReturnType<T> | undefined => {
        const args = lastArgs;
        const thisArg = lastThis;

        lastArgs = lastThis = null; // Clear captured values
        lastCallTime = time;
        previousResult = callback.apply(thisArg, args as any); // Use apply for context
        return previousResult;
    };

    const leadingEdge = (time: number): ReturnType<T> | undefined => {
        lastCallTime = time; // Record call time for leading edge
        timeoutId = setTimeout(timerExpired, wait); // Start timer
        return leading ? invokeFunc(time) : previousResult; // Invoke if leading, else return previous
    };

    const remainingWait = (time: number): number => {
        const timeSinceLastCall = time - lastCallTime;
        const timeWaiting = wait - timeSinceLastCall;
        return timeWaiting > 0 ? timeWaiting : 0; // Ensure non-negative
    };

    const timerExpired = () => {
        const time = Date.now();
        // If trailing is enabled and there were args captured (meaning a call happened during the wait period), invoke.
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        // Otherwise, simply clear the timeout.
        timeoutId = null;
        return undefined;
    };

    const shouldInvoke = (time: number): boolean => {
        const timeSinceLastCall = time - lastCallTime;
        // Conditions to invoke:
        // 1. First call ever (lastCallTime is 0) and leading is enabled.
        // 2. Time since last call >= wait period.
        // 3. System clock went backwards (negative timeSinceLastCall - unlikely but safe).
        return lastCallTime === 0 || timeSinceLastCall >= wait || timeSinceLastCall < 0;
    };

    const trailingEdge = (time: number): ReturnType<T> | undefined => {
        timeoutId = null; // Clear existing timeout

        // Only invoke if trailing is true AND there was a call scheduled (lastArgs is not null)
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        // Clear args even if not invoked
        lastArgs = lastThis = null;
        return previousResult;
    };

    function throttled(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
        const time = Date.now();
        // If it's the first call and leading is false, record the time but don't execute yet.
        if (!lastCallTime && !leading) {
            lastCallTime = time;
        }

        const remaining = remainingWait(time);
        lastArgs = args; // Capture latest args
        lastThis = this; // Capture context

        if (remaining <= 0 || remaining > wait) { // Time window expired or clock skew
             if (timeoutId) {
                 clearTimeout(timeoutId);
                 timeoutId = null; // Clear timeout handle
             }
             // Execute immediately (handles first call with leading:true, or subsequent calls after wait)
             return leadingEdge(time);
        } else if (trailing && !timeoutId) { // Schedule trailing call if needed and not already scheduled
             timeoutId = setTimeout(timerExpired, remaining);
        }

        // Return the result of the last successful invocation
        return previousResult;
    }

    throttled.cancel = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        lastCallTime = 0;
        lastArgs = lastThis = null;
        // (Feedback 2.8) Reset previousResult on cancel to prevent potential stale data leak
        previousResult = undefined;
    };

    // Flush executes the trailing call immediately if pending
    throttled.flush = (): ReturnType<T> | undefined => {
       if (!timeoutId || !trailing || !lastArgs) {
            // Return the existing result if nothing to flush or trailing disabled
            return previousResult;
        }
       // Effectively simulate the timer expiring now for the trailing call
       return trailingEdge(Date.now());
    };


    throttled.original = callback; // Expose original for tests

    return throttled;
}


// --- Throttling Presence Tracker ---

/**
 * Creates a throttled function specifically for updating presence status,
 * using the custom throttle implementation. Includes robust error handling and SSR safety.
 * A throttle window of 7-10 seconds is generally recommended for presence updates.
 *
 * @template T - The type of the callback function (typically `channel.track`).
 * @param {T} callback The function to throttle (e.g., `myChannel.track(payload)`).
 * @param {number} [wait=8000] Throttle wait time in milliseconds (default: 8 seconds).
 * @returns {ReturnType<typeof customThrottle<T>>} A throttled function. The caller *must* call `.cancel()` on component unmount or cleanup to prevent leaks and ensure final trailing calls are handled correctly.
 * @example // React usage
 * useEffect(() => {
 * // Ensure myChannel is stable or included in dependency array
 * const presenceTracker = createThrottledPresenceTracker((payload) => {
 * if (myChannel && myChannel.state === 'joined') {
 * myChannel.track(payload);
 * }
 * }, 8000);
 *
 * // Example: Track initial presence
 * presenceTracker({ user: 'id', online_at: new Date().toISOString(), roomId: 'room123', kind: PresenceKind.User });
 *
 * // Cleanup function: Cancel ensures no timers leak, flush can send the last update if needed
 * return () => {
 * // Optional: presenceTracker.flush(); // Send last pending update immediately
 * presenceTracker.cancel(); // Essential: Clears timers and pending calls
 * };
 * }, [myChannel]); // Add dependencies like myChannel
 * @since v1.0.0 (Revised based on feedback)
 */
function createThrottledPresenceTracker<T extends (...args: any[]) => any>(
  callback: T,
  wait: number = 8000
): ReturnType<typeof customThrottle<T>> {
    // SSR Guard: Return a no-op function on the server
    if (typeof window === 'undefined') {
        const noOp = (..._args: Parameters<T>): undefined => undefined;
        noOp.cancel = () => {};
        noOp.flush = (): undefined => undefined;
        // (Feedback 3 - Nitpick JSDoc tag fixed in example)
        // Keep original ref, but it won't be called in SSR.
        noOp.original = callback;
        // Cast needed as the stub doesn't perfectly match the complex return type
        return noOp as unknown as ReturnType<typeof customThrottle<T>>;
    }

    // Wrap the original callback in a try-catch for robustness
    const safeCallback = (...args: Parameters<T>): ReturnType<T> | undefined => {
        try {
            return callback(...args);
        } catch (error) {
            console.error("Error executing throttled presence callback:", error);
            // Depending on expected return type, might need a more specific error return
            return undefined;
        }
    };

    // Use the custom throttle with default leading/trailing true
    return customThrottle(safeCallback, wait, { leading: true, trailing: true });
}
// Exporting the creator function directly might be more conventional
export { createThrottledPresenceTracker };


// --- Typing Indicator Logic ---

/**
 * Processes an incoming typing event, updating the state map of typing users.
 * Prunes stale entries older than `staleTimeout` and caps the map size using `MAX_TYPING_USERS`.
 * Ensures consistency in using `roomId`. (Feedback 2.7 addressed by consistent use here).
 *
 * @param {string} userId The ID of the user typing.
 * @param {string} roomId The ID of the room where typing occurred. (Canonical field)
 * @param {boolean} isTyping True if the user started typing, false if stopped.
 * @param {Map<string, { roomId: string, timestamp: number }>} currentTypingUsers Current map of typing users.
 * @param {number} [staleTimeout=5000] Timeout in ms to consider a typing indicator stale (default: 5 seconds).
 * @returns {Map<string, { roomId: string, timestamp: number }>} An updated map reflecting the new typing state. Returns the original map reference if no changes occurred.
 * @since v1.0.0 (Revised based on feedback)
 */
export function handleIncomingTypingEvent(
  userId: string,
  roomId: string, // Using canonical 'roomId'
  isTyping: boolean,
  currentTypingUsers: Map<string, { roomId: string, timestamp: number }>,
  staleTimeout: number = 5000
): Map<string, { roomId: string, timestamp: number }> {
    const now = Date.now();
    let changed = false;
    const newTypingUsers = new Map(currentTypingUsers); // Create a mutable copy

    // Prune stale entries first
    newTypingUsers.forEach((status, key) => {
        if (now - status.timestamp > staleTimeout) {
            newTypingUsers.delete(key);
            changed = true;
        }
    });

    if (isTyping) {
        const existingStatus = newTypingUsers.get(userId);
        // Add/update if the user isn't already typing OR if their timestamp is stale (e.g., re-triggered typing)
        // Also check map size limit
        if (!existingStatus || now - existingStatus.timestamp > staleTimeout / 2) { // Refresh if more than half timeout passed
            if (!newTypingUsers.has(userId) && newTypingUsers.size >= MAX_TYPING_USERS) {
                // Map is full and this is a new user, ignore.
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(`[handleIncomingTypingEvent] Typing indicators map full (${MAX_TYPING_USERS}). Ignoring new typer: ${userId} in room ${roomId}`);
                }
            } else {
                // Add or update user's typing status
                newTypingUsers.set(userId, { roomId, timestamp: now });
                changed = true;
            }
        } else if (existingStatus.roomId !== roomId) {
            // If user starts typing in a *different* room, update their status
            newTypingUsers.set(userId, { roomId, timestamp: now });
            changed = true;
        }
        // If user is already typing in the same room and timestamp is fresh, do nothing.

    } else {
        // User stopped typing
        const existingStatus = newTypingUsers.get(userId);
        // Only delete if they were actually marked as typing in *this* room
        if (existingStatus && existingStatus.roomId === roomId) {
            newTypingUsers.delete(userId);
            changed = true;
        }
    }

    // Return the original map if no effective changes were made
    return changed ? newTypingUsers : currentTypingUsers;
}


// --- Presence State Conversion & Diffing ---

/**
 * Converts raw Supabase presence state into a Map of OnlineFriend objects.
 * (Feedback 2.2) Selects the presence entry with the newest `online_at` timestamp for each user.
 * Falls back to the last entry if timestamps are invalid or missing.
 * Aligns strictly with the `OnlineFriend` interface (including `kind`, `roomId`).
 *
 * @param {Record<string, PresencePayload[]>} presenceState Raw Supabase presence state object.
 * @returns {Map<string, OnlineFriend>} Map keyed by user ID, values are OnlineFriend objects.
 * @see https://supabase.com/docs/guides/realtime/presence For Supabase presence structure details.
 * @ JSDoc
 * (Feedback 2.1 & 2.7) Important: Client implementations *must* send `roomId` and `kind`
 * in the `channel.track()` payload for correct mapping. Omitting unused fields like `name`
 * (if available through other means) in the tracked payload is recommended to keep
 * WebSocket frames small, especially when dealing with proxies/CDNs that might have size limits (e.g., 64 KiB).
 * Example client track call:
 * `channel.track({ online_at: new Date().toISOString(), roomId: currentRoomId, kind: PresenceKind.User, image: user.avatarUrl })`
 * @ JSDoc
 * (Feedback 2.10) Note on Persistence: Standard `JSON.stringify` or libraries like Zustand's default `persist` middleware
 * do not serialize `Map` objects correctly (often resulting in empty objects or arrays). If persisting presence state,
 * use a custom serializer/deserializer (e.g., converting Map to Array of [key, value] pairs) or use the `partializer`
 * option in Zustand's `persist` to exclude the Map from persisted state if it's only needed ephemerally.
 * Example Zustand partializer: `partialize: (state) => Object.fromEntries( Object.entries(state).filter(([key]) => !['onlineFriendsMap'].includes(key)) )`
 * @since v1.0.0 (Revised based on feedback)
 */
export function convertSupabasePresenceStateToMap(
  presenceState: Record<string, PresencePayload[]>
): Map<string, OnlineFriend> {
    const onlineFriends = new Map<string, OnlineFriend>();
    const now = Date.now(); // Use a consistent timestamp for 'lastActive' for this batch

    for (const [userId, presences] of Object.entries(presenceState)) {
        if (!presences || presences.length === 0) continue;

        let presenceToMap: PresencePayload | undefined = undefined;

        // (Feedback 2.2) Determine the latest presence based on 'online_at'
        if (presences.length === 1) {
            presenceToMap = presences[0];
        } else {
            // Sort descending by online_at, requires parsing ISO strings.
            // Handle potential invalid dates during parsing.
            const sorted = presences
                .map(p => ({ ...p, parsed_online_at: p.online_at ? Date.parse(p.online_at) : 0 }))
                .filter(p => !isNaN(p.parsed_online_at) && p.parsed_online_at > 0) // Ensure valid, parsed date
                .sort((a, b) => b.parsed_online_at - a.parsed_online_at); // Newest first

            if (sorted.length > 0) {
                 presenceToMap = sorted[0]; // The first element is the latest valid presence
                 // (Feedback 3 - Nitpick: Update comment about "append-only")
                 // This logic explicitly handles potential out-of-order delivery via 'online_at'.
            } else {
                 // Fallback: If all 'online_at' fields are invalid/missing, use the last received entry.
                 if (process.env.NODE_ENV !== 'production') {
                    console.warn(`[convertSupabasePresenceStateToMap] Could not determine latest presence for user ${userId} using 'online_at'. Falling back to last received entry.`);
                 }
                 presenceToMap = presences[presences.length - 1];
            }
        }

        // If a valid presence entry was determined, map it to OnlineFriend
        if (presenceToMap) {
             onlineFriends.set(userId, {
                 id: presenceToMap.id || userId, // Use provided id or fallback to map key
                 // (Feedback 1.4 Strength: Discriminated union via 'kind')
                 // Default to User kind if not provided, but client *should* send it.
                 kind: presenceToMap.kind ?? PresenceKind.User,
                 // (Feedback 2.3) Add nullability guard for name with fallback
                 name: presenceToMap.name ?? 'Unknown',
                 // Use 'image' field from payload for avatarUrl, handle null/undefined
                 avatarUrl: presenceToMap.image ?? null,
                 // Use consistent 'now' for all friends processed in this batch
                 lastActive: now,
                 // (Feedback 2.7) Standardize on 'roomId', expect client to send this.
                 // Cast as string | undefined; client payload determines actual type.
                 roomId: presenceToMap.roomId as string | undefined,
             });
         }
    }
    return onlineFriends;
}

/**
 * Shallow equality check for two OnlineFriend objects, comparing relevant fields.
 * Ignores `lastActive` as it's expected to change frequently.
 * Includes checks for `kind` and `roomId`. (Feedback required adding these)
 *
 * @param {OnlineFriend | undefined} friend1 First friend object (or undefined).
 * @param {OnlineFriend | undefined} friend2 Second friend object (or undefined).
 * @returns {boolean} True if the relevant shallow fields are strictly equal.
 * @since v1.0.0 (Revised based on feedback)
 */
const areOnlineFriendsEqual = (friend1?: OnlineFriend, friend2?: OnlineFriend): boolean => {
    // Handle cases where one or both might be undefined/null
    if (!friend1 && !friend2) return true; // Both are absent -> equal
    if (!friend1 || !friend2) return false; // One is absent, the other isn't -> not equal

    // Compare relevant fields
    return (
        friend1.id === friend2.id &&
        friend1.name === friend2.name &&
        friend1.avatarUrl === friend2.avatarUrl &&
        friend1.roomId === friend2.roomId && // (Feedback 2.7 consistency) Compare roomId
        friend1.kind === friend2.kind        // (Feedback 1.4 usage) Compare kind
    );
};

/**
 * Checks if two OnlineFriend Maps are functionally identical by comparing sizes
 * and then performing a shallow comparison of each corresponding entry using `areOnlineFriendsEqual`.
 *
 * @param {Map<string, OnlineFriend>} map1 First map.
 * @param {Map<string, OnlineFriend>} map2 Second map.
 * @returns {boolean} True if maps contain the same users with the same relevant data.
 * @since v1.0.0
 */
const areOnlineFriendMapsIdentical = (
  map1: Map<string, OnlineFriend>,
  map2: Map<string, OnlineFriend>
): boolean => {
    if (map1.size !== map2.size) {
        return false;
    }
    // Iterate through one map and check against the other
    for (const [id, friend1] of map1) {
        const friend2 = map2.get(id);
        // Use the specialized comparison function
        if (!areOnlineFriendsEqual(friend1, friend2)) {
            return false; // Found a difference
        }
    }
    // If loop completes without finding differences, maps are identical
    return true;
};


/**
 * Diffs two OnlineFriend maps (`prevFriends` vs `newFriends`) efficiently.
 * Returns the changes as `added`, `removed`, and `updated` maps.
 * Includes optimizations:
 * - Early exit for identical maps (checked via `areOnlineFriendMapsIdentical`).
 * - Early exit for empty map cases.
 * - (Feedback 1.3 Strength) Performance heuristic: If total entries (prev + new)
 * exceed `scanLimit`, returns `{ fullReplace: newFriends }` to avoid potentially
 * slow diffing on very large state changes, suggesting the UI simply re-render.
 *
 * @param {Map<string, OnlineFriend>} prevFriends Previous presence state map.
 * @param {Map<string, OnlineFriend>} newFriends New presence state map.
 * @param {number} [scanLimit=PRESENCE_DIFF_SCAN_LIMIT] Threshold for using the simplified diff (fullReplace).
 * @returns {({ added: Map<string, OnlineFriend>, removed: Map<string, OnlineFriend>, updated: Map<string, OnlineFriend> } | { fullReplace: Map<string, OnlineFriend> })} Diff result or full replacement suggestion.
 * @ JSDoc
 * (Feedback 1.3 & 2.9) Performance Notes:
 * - The heuristic (`scanLimit`) avoids potentially blocking the main thread on large diffs (> ~2k entries).
 * This aligns with RAIL guidelines (~50ms budget for main thread work).
 * - For extremely large user counts (>10k), consider strategies like Web Workers for diffing off the main thread.
 * - `structuredClone` can be useful for deep copies but benchmarks show it's not always faster than shallow copies + diffing
 * for simple object structures like `OnlineFriend`. It may offer benefits for more complex, deeply nested objects.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
 * @since v1.0.0 (Revised based on feedback)
 */
export function diffOnlineFriendsMap(
  prevFriends: Map<string, OnlineFriend>,
  newFriends: Map<string, OnlineFriend>,
  scanLimit: number = PRESENCE_DIFF_SCAN_LIMIT
):
  | { added: Map<string, OnlineFriend>; removed: Map<string, OnlineFriend>; updated: Map<string, OnlineFriend> }
  | { fullReplace: Map<string, OnlineFriend> }
{
    // --- Fast Exits ---
    // (Feedback 2.5) Removed `prevFriends === newFriends` check as Map instances are usually new.

    // Handle empty map scenarios efficiently
    if (prevFriends.size === 0 && newFriends.size === 0) return getNoChanges();
    // If prev is empty, all new friends are 'added'
    if (prevFriends.size === 0) return { added: new Map(newFriends), removed: new Map(), updated: new Map() };
    // If new is empty, all prev friends are 'removed'
    if (newFriends.size === 0) return { added: new Map(), removed: new Map(prevFriends), updated: new Map() };

    // (Feedback 2.6 Optimization) Check for functional identity *before* the heuristic limit check.
    // This avoids the heuristic warning if maps are actually identical content-wise.
    // This check inherently handles the case where sizes match.
    if (areOnlineFriendMapsIdentical(prevFriends, newFriends)) {
        return getNoChanges();
    }

    // --- Heuristic Check ---
    // Calculate total entries involved in the diff operation
    const totalEntries = prevFriends.size + newFriends.size;
    // Determine if the simplified diff (full replacement) should be used
    const useSimplifiedDiff = totalEntries > scanLimit;

    if (useSimplifiedDiff) {
        // Log a warning (once per session) in dev environments if the heuristic is triggered
        if (process.env.NODE_ENV !== 'production' && !hasWarnedAboutDiffLimit) {
            console.warn(
                `[diffOnlineFriendsMap] Performance heuristic triggered: Total entries (${totalEntries}) exceed scan limit (${scanLimit}). ` +
                `Suggesting full UI replacement instead of detailed diff. Adjust NEXT_PUBLIC_PRESENCE_DIFF_SCAN_LIMIT if needed.`
            );
            // (Feedback 3 - Nitpick: SSR Guard for dev counter)
            // (Feedback 1.5 Strength: Test hook / Telemetry)
            if (typeof window !== 'undefined') {
                (window as any).__presenceDiffMisses = ((window as any).__presenceDiffMisses || 0) + 1;
            }
            hasWarnedAboutDiffLimit = true; // Prevent repeated warnings
        }
        // Return the full replacement suggestion
        // Note: We already know the maps aren't identical from the check above.
        return { fullReplace: new Map(newFriends) }; // Return a copy
    }

    // --- Standard Diffing (if not identical and below scan limit) ---
    // (Feedback 2.6) The identity check above prevents redundant work here if maps were identical.
    const added = new Map<string, OnlineFriend>();
    const removed = new Map<string, OnlineFriend>();
    const updated = new Map<string, OnlineFriend>();

    // Iterate through the new state to find added or updated friends
    newFriends.forEach((newFriend, id) => {
        const prevFriend = prevFriends.get(id);
        if (!prevFriend) {
            // Friend exists in new state but not in previous state -> added
            added.set(id, newFriend);
        } else if (!areOnlineFriendsEqual(newFriend, prevFriend)) {
            // Friend exists in both states, but relevant data changed -> updated
            updated.set(id, newFriend);
        }
        // If friend exists in both and is equal (checked by areOnlineFriendsEqual), do nothing.
    });

    // Iterate through the previous state to find removed friends
    prevFriends.forEach((prevFriend, id) => {
        if (!newFriends.has(id)) {
            // Friend exists in previous state but not in new state -> removed
            removed.set(id, prevFriend);
        }
    });

    // (Feedback 3 - Nitpick: Remove redundant final check)
    // The initial `areOnlineFriendMapsIdentical` check covers the case where all maps would be empty.
    // If we reach here, there must be some changes unless the logic has flaws.
    return { added, removed, updated };
}

// --- Type Definitions (Ensure these align with '@/types/presence') ---
/*
// Example definitions assumed to be in src/types/presence.ts

export enum PresenceKind {
  User = 'user',
  Agent = 'agent',
  // Add other kinds as needed
}

export interface OnlineFriend {
  id: string; // User ID
  name?: string | null; // Display name (nullable, provide fallback)
  avatarUrl?: string | null; // URL for avatar image (nullable)
  roomId?: string | undefined; // ID of the room/channel the user is associated with (canonical field)
  lastActive: number; // Timestamp (ms since epoch) of last activity (usually batch update time)
  kind: PresenceKind; // Type of presence (e.g., user, agent)
}

// Represents the payload structure expected from Supabase presence state
// AND the structure clients should send via channel.track()
export interface PresencePayload {
  // Required fields clients *must* send:
  online_at: string; // ISO 8601 timestamp string, used for ordering
  roomId?: string; // Room context (essential for mapping)
  kind?: PresenceKind; // Type of presence (essential for mapping)

  // Optional fields clients *can* send (used for OnlineFriend mapping):
  id?: string; // User ID (if different from the key in presence state)
  name?: string; // Display name
  image?: string; // Avatar URL (maps to avatarUrl)

  // Supabase/Phoenix internal fields (usually present, not directly mapped):
  phx_ref?: string;
  [key: string]: any; // Allow arbitrary custom data, but keep payload minimal (Feedback 2.1)
}
*/