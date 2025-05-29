# First Flame Feature Implementation Summary

## Latest Updates: UI Improvements - Floating Header & User Authentication

### UI Enhancements

- ✨ Floating header redesign + logout control
  - Added glassmorphic design with subtle translucency and frosted blur
  - Implemented auto-hide on scroll down, reappear on scroll up (desktop only)
  - Added sign-out button with proper authentication flow
  - Improved micro-animations and accessibility

### Implementation Details

The UI update includes:

1. **New UI Components**:
   - Glassmorphic floating header with backdrop-filter blur effect
   - Smooth scroll-based show/hide animation for desktop users
   - Sign-out button with proper Supabase auth integration

2. **New Custom Hooks**:
   - `useGlassHover`: Consistent hover animations for glass buttons
   - `useScrollDirection`: Smart header visibility based on scroll direction

3. **Improved Accessibility**:
   - Added proper ARIA labels for the logout button
   - Ensured keyboard navigation support
   - Screen reader friendly implementation

4. **Test Coverage**:
   - Added comprehensive unit tests for the logout functionality
   - Tests cover both successful logout and error handling scenarios

### Example Usage

```tsx
// Using the new custom hooks
useGlassHover(buttonRef, {
  scale: 1.15,
  duration: 0.2,
  glowShadow: 'var(--header-icon-glow-hover)'
});

useScrollDirection({
  elementRef: headerRef,
  threshold: 64,
  disableOnMobile: true
});

// Sign-out implementation
const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = '/login';
};
```

## Previous Updates: Edge Functions, JWT Handling & Broadcast Fixes

### Post-Deployment Instructions

To enable debugging on the Edge Functions:

```bash
# Enable debugging for a specific function
supabase functions config set DEBUG_LIST_QUESTS=true --project-ref xdkadojhsteiecbqjgro
supabase functions config set DEBUG_GET_FLAME_STATUS=true --project-ref xdkadojhsteiecbqjgro
supabase functions config set DEBUG_INSERT_DAY1=true --project-ref xdkadojhsteiecbqjgro
supabase functions config set DEBUG_REALTIME_BROADCAST=true --project-ref xdkadojhsteiecbqjgro

# View logs for a function (using the new helper script)
pnpm logs:fn list-quests --since 5m --project-ref xdkadojhsteiecbqjgro

# Run the tests (replace with your actual credentials)
cd supabase/tests/edge
SUPABASE_URL=https://xdkadojhsteiecbqjgro.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
TEST_USER_JWT=real-user-jwt \
TEST_USER_ID=real-user-id \
deno test --allow-net --allow-env --allow-read list-quests.test.ts

# Trigger Temporal workflow with new helper
pnpm workflow:trigger '{"userId":"demo-user","questId":"ff-demo-17"}'
```

## Previous Updates: Edge Functions & Temporal Worker Fixes

### Overview

This update addresses several critical issues with Edge Functions and the Temporal worker:

1. Handling of non-UUID user IDs (such as "demo-user")
2. Proper handling of duplicate key errors (23505)
3. Improved error handling and logging
4. Making the Temporal worker more resilient to non-critical errors

### Changes Made

#### 1. _shared/db/firstFlame.ts

- Added `isValidUuid()` function to validate UUID format
- Updated `getOrCreateFirstFlameProgress()` to:
  - Skip DB operations for non-UUID userIds
  - Handle duplicate key errors gracefully
  - Return success/error status instead of throwing exceptions
  - Use structured error responses

#### 2. get-flame-status/index.ts

- Added UUID validation before attempting database operations
- Doesn't throw errors for non-UUID users, just handles them gracefully
- Improved error logging with proper error message extraction
- Returns proper HTTP status codes and error messages

#### 3. list-quests/index.ts

- Added UUID validation before creating participant/progress records
- Uses safe error handling that doesn't interrupt the main request flow
- Improved error response formatting to avoid `[object Object]` errors
- Better error logging for debugging

#### 4. insert-day1/index.ts

- Changed `insert()` to `upsert()` with `ignoreDuplicates: true`
- Added proper conflict column specification 
- Returns success status (200) for duplicate key errors with a note flag
- Enhanced error logging with more details

#### 5. temporal-worker/src/activities/modal.ts

- Updated `insertDayOneMessages()` to properly handle duplicate records
- Doesn't fail workflow for non-critical errors (2xx status codes)
- Detects specific error conditions like duplicates and continues workflow
- Improved error details for debugging

### How To Deploy

Deploy the updated edge functions:

```bash
supabase functions deploy get-flame-status   --project-ref xdkadojhsteiecbqjgro
supabase functions deploy list-quests        --project-ref xdkadojhsteiecbqjgro
supabase functions deploy insert-day1        --project-ref xdkadojhsteiecbqjgro
```

For local development and testing:

```bash
temporal server start-dev
cd temporal-worker && pnpm exec ts-node src/worker.ts

# Trigger workflow
temporal workflow start \
  --type seedFirstFlame \
  --task-queue first-flame \
  --input '{"userId":"demo-user","questId":"ff-demo-16"}'

# Verify
curl -s -H "apikey: $SB_ANON" -H "Authorization: Bearer $SB_ANON" \
     "$SB_URL/functions/v1/list-quests" | jq
curl -s -H "apikey: $SB_ANON" \
     "$SB_URL/functions/v1/get-flame-status?userId=demo-user" | jq
```

### What to Expect

After deployment, you should see:

1. No more 500 errors from list-quests
2. No more 22P02 errors from get-flame-status with demo-user
3. insert-day1 will handle duplicates gracefully
4. Temporal workflows will complete successfully even with demo-user

---

## Previous Environment Setup

### Temporal Server
```bash
# Run with in-memory database for local development
docker run --rm --name temporal-dev \
  -p 7233:7233 -p 8233:8233 \
  -e DB=memory \
  temporalio/auto-setup:latest
```

### Temporal Worker
```bash
cd temporal-worker
pnpm install          # first time only
pnpm exec ts-node src/worker.ts
```

### Workflow Trigger
```bash
npx @temporalio/cli workflow start \
  --type seedFirstFlame \
  --task-queue first-flame \
  --input '{"userId":"demo-user","questId":"ff-demo"}'
```

## Issue: 500 Error in get-flame-status Edge Function

### Problem Diagnosis
- Error: `null value in column "imprint_ref" of relation "flame_progress" violates not-null constraint`
- Function stack: `supabase/functions/get-flame-status/index.ts` → `_shared/db/firstFlame.ts` → `getOrCreateFirstFlameProgress`
- Root cause: The `getOrCreateFirstFlameProgress` function performs an upsert without providing a value for the `imprint_ref` column that is required (NOT NULL)

### Findings
- `imprint_ref` column exists in the database and is NOT NULL
- Column does not appear in the original database creation migrations (`drizzle/0000_first_flame_init.sql`)
- It must have been added in a migration that isn't properly tracked in version control
- No unit tests found that would need to be updated with this change

## Solution

### Option 1: Schema Change (Recommended)
Make the `imprint_ref` column nullable to allow initialization without a value:

```sql
ALTER TABLE ritual.flame_progress 
ADD COLUMN IF NOT EXISTS imprint_ref TEXT,
ALTER COLUMN imprint_ref DROP NOT NULL;
```

Suggested filename: `20250522123000_make_imprint_ref_nullable.sql`

### Option 2: Code Change Alternative
Update the `getOrCreateFirstFlameProgress` function to include a default value:

```diff
--- a/supabase/functions/_shared/db/firstFlame.ts
+++ b/supabase/functions/_shared/db/firstFlame.ts
@@ -118,6 +118,7 @@ export async function getOrCreateFirstFlameProgress(
       {
         quest_id: questId,
         user_id: userId,
+        imprint_ref: "system", // Default placeholder value to satisfy NOT NULL constraint
         current_day_target: 1,
         is_quest_complete: false,
       },
```

## Next Steps

1. Apply the schema change migration:
   ```bash
   # Create migration file
   echo "ALTER TABLE ritual.flame_progress ADD COLUMN IF NOT EXISTS imprint_ref TEXT, ALTER COLUMN imprint_ref DROP NOT NULL;" > supabase/migrations/20250522123000_make_imprint_ref_nullable.sql
   # Push migration to Supabase
   supabase db push
   ```

2. Deploy edge functions:
   ```bash
   supabase functions deploy get-flame-status
   supabase functions deploy insert-day1
   supabase functions deploy realtime-broadcast
   ```

3. Start the Temporal server:
   ```bash
   docker run --rm --name temporal-dev \
     -p 7233:7233 -p 8233:8233 \
     -e DB=memory \
     temporalio/auto-setup:latest
   ```

4. Start the Temporal worker:
   ```bash
   cd temporal-worker
   pnpm exec ts-node src/worker.ts
   ```

5. Test with a new user in the web app (pnpm dev) or manually trigger workflow:
   ```bash
   npx @temporalio/cli workflow start \
     --type seedFirstFlame \
     --task-queue first-flame \
     --input '{"userId":"demo-user","questId":"ff-demo"}'
   ```

6. Verify end-to-end flow:
   - Confirm workflow completes successfully
   - Check get-flame-status returns 200 with Day-1 data
   - Front-end should display the First Flame ritual data correctly

## Future Improvements

1. Add proper tracking of database migrations in version control
2. Create unit tests for the `getOrCreateFirstFlameProgress` function
3. Document the purpose and constraints of the `imprint_ref` column
4. Consider implementing a more robust error handling strategy in edge functions

## Immediate Action Items (Based on Current Status)

Since the Temporal worker is running successfully but the get-flame-status endpoint is still returning 500 errors, here are the immediate next steps:

1. **Apply the Database Fix Immediately**:
   ```bash
   # Option 1: Direct SQL through Supabase dashboard or CLI
   supabase sql "ALTER TABLE ritual.flame_progress ADD COLUMN IF NOT EXISTS imprint_ref TEXT; ALTER TABLE ritual.flame_progress ALTER COLUMN imprint_ref DROP NOT NULL;"
   
   # Alternatively, use the migration file approach from earlier
   ```

2. **Enable Debug Logging** in the get-flame-status function by temporarily setting the debug environment variable:
   ```bash
   supabase functions config set DEBUG_GET_FLAME_STATUS=true
   ```

3. **Check Supabase Logs** for more detailed error information:
   ```bash
   supabase functions logs --fn-name get-flame-status
   ```

4. **Verify Database Schema** directly to confirm the change took effect:
   ```bash
   supabase sql "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'ritual' AND table_name = 'flame_progress';"
   ```

5. **Manual Workflow Trigger** to ensure the workflow can properly complete:
   ```bash
   npx @temporalio/cli workflow start \
     --type seedFirstFlame \
     --task-queue first-flame \
     --input '{"userId":"your-actual-user-id"}'
   ```
   Note: Replace "your-actual-user-id" with a real user ID from your auth.users table.

6. **If Issues Persist**: Consider the code change approach (Option 2) as an immediate fix that doesn't require database schema changes:
   ```bash
   # Edit the file
   supabase/functions/_shared/db/firstFlame.ts
   
   # Then redeploy all functions
   supabase functions deploy
   ```

Remember to check the Temporal UI at http://localhost:8233 to verify workflow execution status.