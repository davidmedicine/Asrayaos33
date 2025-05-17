# Architecture Decision Record: Map-based Presence State

## Context

We need to implement a real-time presence feature to show which users are online and their status (online, away, typing). This needs to be performant, accessible, and scalable to handle many concurrent users.

## Decision

Use a Map data structure (`Map<string, OnlineFriend>`) for storing presence data in the Zustand store, with throttled updates and efficient diffing strategies.

## Key Implementation Details

### Performance & Scalability

1. **Map-based Storage**: Using JavaScript's `Map` structure for O(1) lookups and updates instead of array-based solutions.

2. **Throttled Presence Updates**: Presence updates are throttled to 7-10s (configurable via `NEXT_PUBLIC_PRESENCE_THROTTLE`) to reduce network traffic.

3. **Efficient Diffing**: Implemented `DEFAULT_PRESENCE_DIFF_SCAN_LIMIT` (default: 2000) to optimize presence state updates for larger rooms. When this limit is exceeded, the system logs warnings in development mode.

4. **Minimal Payloads**: The presence payloads are kept minimal (`LeanPresencePayload` interface) to reduce bandwidth usage.

### Accessibility Features

1. **High Contrast Support**: Proper outlines with fallbacks for Safari using:
   - `outline-style: auto` with `outline-offset: 1px` when supported
   - `outline: 2px solid CanvasText` fallback for browsers without `outline-offset` support

2. **Keyboard Navigability**: Interactive elements are properly focusable with correct `tabIndex` usage.

3. **ARIA Roles**: Correct `list`/`listitem` context awareness in the AvatarStack component.

4. **Testing**: Storybook a11y stories with forced-colors simulation.

### Ghost User Management

1. **Expiry Buffer**: We use a configurable presence expiry (default 90s, `NEXT_PUBLIC_PRESENCE_EXPIRY`) which provides a safe buffer over Supabase's ~60s presence eviction (2 missed 30s heartbeats).

2. **Cleanup Mechanism**: Regular cleanup intervals to remove stale presence entries.

### Data Integrity & Serialization

1. **Map Serialization**: Implemented `mapToJson`/`jsonToMap` helpers to enable persistence of Map structures which are not natively JSON serializable.

2. **DM Race Handling**: For direct message creation, the system uses unique constraints on the database level (`dmKey`) and catches error code 23505 (unique violation) to handle races gracefully.

## Alternatives Considered

1. **Array-based Storage**: Using arrays for presence data would give O(n) lookup performance, becoming problematic at scale.

2. **Direct Redux/Context**: Considered using Redux or React Context directly instead of Zustand, but Zustand's simplicity and performance advantages won out.

3. **WebSockets Library**: Considered using a dedicated WebSockets library instead of Supabase Realtime, but the tight integration with our existing Supabase infrastructure made this unnecessary.

## Constraints & Limitations

1. **Map Serialization**: Maps are not natively JSON serializable, requiring helper functions to convert between Maps and serializable arrays.

2. **Scalability Threshold**: Our diffing optimization has a heuristic limit (DEFAULT_PRESENCE_DIFF_SCAN_LIMIT). Beyond this point, performance may degrade or notifications may be missed.

3. **Browser Support**: High contrast mode requires fallbacks for older browsers without `outline-offset` support.

## Implications

1. **Environment Variables**: Added environment variables with documented defaults:
   - `NEXT_PUBLIC_PRESENCE_EXPIRY`: 90000 (90s)
   - `NEXT_PUBLIC_PRESENCE_DIFF_SCAN_LIMIT`: 2000
   - `NEXT_PUBLIC_PRESENCE_THROTTLE`: 7000 (7s)

2. **Future Improvements**:
   - Consider WebWorker-based diffing for very large presence updates
   - Add specialized support for bot/agent presence (groundwork laid in types with `PresenceKind` enum)

## Status

Accepted

## Metadata

- **Date**: 2025-04-19
- **Authors**: Aethelstone Smith (Implementation AI)
- **Ticket**: ASR-225