# CHANGELOG

## 2025-05-24: Bug Fixes for First Flame API Integration

### Backend Improvements

- **Fixed `get-flame-status` Edge Function**
  - Added proper retry logic with up to 2 second wait for fresh data
  - Improved error handling for stale or missing cache
  - Added detailed logging for debugging cache misses
  - Return helpful `estimatedRetryMs` to guide front-end polling

- **Eliminated duplicate database operations**
  - Implemented in-memory request deduplication in shared helpers
  - Fixed Supabase duplicate key errors in `flame_progress` table
  - Added proper existence check before attempting DB writes
  - Implemented duplicate-key guard in first-flame upsert

- **Improved Debugging**
  - Added unified `DEBUG_FIRST_FLAME=true` environment flag
  - Enhanced logging across all related edge functions
  - Standardized error response formats for better diagnostics

### Front-end Improvements

- **Fixed API Schema Validation**
  - Updated Zod schema to match actual API response formats
  - Improved error handling for processing state
  - Removed obsolete data transformation code

- **Added E2E Testing**
  - Created end-to-end workflow test script
  - Added automatic polling with timeout for workflow verification
  - Standardized test flow for CI/CD pipeline integration

## 2025-05-24: UI Improvements - Floating Header & User Authentication

### UI Enhancements

- ✨ Floating header redesign + logout control
  - Added glassmorphic design with subtle translucency and frosted blur
  - Implemented auto-hide on scroll down, reappear on scroll up (desktop only)
  - Added sign-out button with proper authentication flow
  - Improved micro-animations and accessibility

## 2025-05-23: Fix JWT passthrough & ready-broadcast

### Edge Functions Improvements

- **Added debug logging to all Edge Functions**
  - Debug logs to trace requests and responses
  - Controlled via environment variables: `DEBUG_LIST_QUESTS=true`, etc.

- **Improved JWT Authentication**
  - Added X-Authorization fallback header support in list-quests
  - Fixed authentication flow to properly handle both auth headers

- **Enhanced get-flame-status**
  - Reduced STALE_MS for faster dev iteration (5s instead of 60s)
  - Added robust error handling for broadcast invocation
  - Improved caching logic with detailed debug logs

- **Standardized insert-day1 responses**
  - Always returns `{ note:"DUPLICATE" | "INSERTED", rows:number }`
  - Automatically triggers broadcastReady event for faster UI updates

- **Fixed Temporal worker integration**
  - Updated worker to handle both "DUPLICATE" and "INSERTED" responses
  - Added better error handling and logging in activities
  - Improved detection of success states even when exceptions occur

### Developer Experience

- **Added helper npm scripts**
  - `logs:fn <n>` - Shorthand for accessing Supabase function logs
  - `workflow:trigger` - Helper for triggering Temporal workflows

- **Added Smoke Tests**
  - Basic smoke tests for all Edge Functions
  - Tests for authentication and response formats
  - Tests for expected error cases

### Integration Fixes

- Fixed data flow between Temporal worker and Edge Functions
- Ensured Zod schema compatibility for front-end validation
- Fixed DB integrity issues with proper upsert handling
- Fixed broadcast events to ensure front-end gets timely updates