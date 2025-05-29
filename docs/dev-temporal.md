# Temporal Development Workflow

This document explains how to set up and run the Temporal workflow system for local development, which is essential for the First Flame Ritual functionality.

## System Architecture Overview

The First Flame feature relies on several components working together:

1. **Temporal Server** - Workflow orchestration system running in Docker with postgres12 database
   - Uses temporalio/auto-setup:latest with DB=postgres12 driver
   - Web UI exposed on port 8233 (container port 8088)
   - gRPC server on port 7233
2. **Temporal Worker** - Node.js process that executes workflow tasks
   - Connects to Temporal server via gRPC on localhost:7233
   - Executes workflows like seedFirstFlame
3. **Supabase Edge Functions** - Serverless functions that interact with the database
   - list-quests - Lists all quests and creates First Flame if needed
   - get-flame-status - Returns current ritual state
   - insert-day1 - Seeds initial content for First Flame ritual
   - realtime-broadcast - Notifies clients of updates
4. **Next.js Frontend** - Web application that displays the First Flame Ritual

## Prerequisites

- Docker and Docker Compose
- Node.js and pnpm
- Supabase CLI

## Quick Start

To start the complete development environment with a single command:

```bash
pnpm dev:stack
```

This command:
1. First starts the Temporal server and verifies it's healthy
2. Then runs the worker, edge functions, and frontend concurrently

Alternatively, use `pnpm dev:all` which runs all components concurrently from the start, but may lead to timing issues.

## Step-by-Step Setup

### 1. Start Temporal Server

```bash
pnpm dev:temporal
```

This starts the Temporal server containers:
- `temporal-postgres` - Database for Temporal server (Postgres 14)
- `temporal-dev` - Temporal server with Web UI

The command includes a health check that verifies the UI is accessible. If successful, you'll see:
```
✅ Temporal UI is accessible at http://localhost:8233
```

Critical configuration settings:
- Docker compose file: `docker/docker-compose.temporal.yml`
- Database driver: `DB: postgres12` (must be exactly this value)
- Port mappings: 
  - `7233:7233` for gRPC
  - `8233:8088` for Web UI (container port 8088 mapped to host port 8233)

### 2. Start Temporal Worker

```bash
pnpm dev:worker
```

This starts the Temporal worker process that executes workflow tasks. The worker will connect to the Temporal server at localhost:7233.

### 3. Start Supabase Edge Functions

```bash
pnpm supa:serve
```

This starts the local Supabase Edge Functions development server with the following functions:
- `list-quests` - Lists all quests including the First Flame quest
- `get-flame-status` - Gets the current status of the First Flame Ritual
- `insert-day1` - Inserts Day 1 content for the First Flame Ritual
- `realtime-broadcast` - Broadcasts events to connected clients

### 4. Start Next.js Frontend

```bash
pnpm dev
```

This starts the Next.js development server which will connect to the local Supabase Edge Functions and display the First Flame Ritual.

## How It Works

1. When a user logs in, the frontend calls `list-quests` Edge Function
2. If the First Flame quest doesn't exist for the user, it creates it and triggers the Temporal workflow
3. The Temporal workflow executes the following activities:
   - `ensureFlameState` - Creates necessary database records
   - `insertDayOneMessages` - Inserts Day 1 messages
   - `broadcastReady` - Notifies clients that data is ready
4. The frontend polls `get-flame-status` until it returns `processing: false`
5. The frontend displays the First Flame Ritual content

## Troubleshooting

### Temporal UI Not Accessible

If http://localhost:8233 is not accessible:

1. Check if the containers are running:
   ```bash
   docker ps | grep temporal
   ```
2. Verify port mapping:
   ```bash
   docker exec temporal-dev bash -c 'ss -ltnp | grep 8088'
   ```
3. Check container logs:
   ```bash
   docker logs temporal-dev
   ```
4. Ensure you're using the correct database driver:
   ```bash
   # Make sure the docker-compose.temporal.yml file specifies:
   # DB: postgres12  (not postgresql)
   ```
   This is the most common issue! The exact value must be `postgres12`, not `postgresql`.

5. Try restarting with the --remove-orphans flag:
   ```bash
   docker compose -f docker/docker-compose.temporal.yml down
   docker compose -f docker/docker-compose.temporal.yml up -d --remove-orphans
   ```

### Worker Connection Issues

If the worker fails to connect to Temporal:

1. Make sure the Temporal server is running and healthy
   ```bash
   docker compose -f docker/docker-compose.temporal.yml ps
   ```

2. Check that the gRPC port is accessible
   ```bash
   nc -zv localhost 7233
   ```

3. Verify worker configuration in `temporal-worker/src/worker.ts`
   ```typescript
   // Should use TEMPORAL_ADDRESS environment variable
   const connection = TEMPORAL_ADDRESS
     ? await NativeConnection.connect({ address: TEMPORAL_ADDRESS })
     : undefined;
   ```

### First Flame Quest Not Appearing

If the First Flame quest doesn't appear in the UI:

1. Check edge function logs for errors:
   ```bash
   pnpm logs:fn list-quests
   pnpm logs:fn get-flame-status
   pnpm logs:fn insert-day1
   ```

2. Look for "processing" state in the response:
   ```bash
   curl -H "Authorization: Bearer <anon-key>" http://localhost:54321/functions/v1/get-flame-status
   ```
   If it's stuck in "processing: true", check worker logs for workflow execution issues.

3. Check that the correct slug is used in all places:
   - The system uses `FIRST_FLAME_SLUG` constant (value: "first-flame-ritual")
   - There should be no hardcoded UUIDs or references to `FIRST_FLAME_QUEST_ID`

4. Verify edge function response schema matches what the frontend expects:
   - `get-flame-status` should return:
     ```json
     {
       "processing": false,
       "dataVersion": 1234567890,
       "overallProgress": {
         "current_day_target": 1,
         "is_quest_complete": false
       },
       "dayDefinition": { ... }
     }
     ```

### Common Edge Function Issues

1. **insert-day1 idempotency problems**:
   - The edge function should handle conflicts gracefully
   - Ensure it uses proper ON CONFLICT handling:
     ```sql
     INSERT ... ON CONFLICT (quest_id, user_id) DO NOTHING
     ```

2. **Missing Flame Progress records**:
   - Check that both `flame_progress` and message records are created
   - Verify `getOrCreateFirstFlameProgress` is called properly

3. **Schema validation errors**:
   - Frontend Zod schema must match actual response format
   - Ensure `src/lib/api/quests.ts` has the correct `zFlameStatusServerResponse` schema

### Integration Test

To verify the entire system works correctly, run the integration test:

```bash
pnpm test:integration
```

This test:
1. Calls `list-quests` to ensure the First Flame quest exists
2. Polls `get-flame-status` until it returns `processing: false`
3. Verifies that the response contains the correct data structure

### Common Issues

1. **Worker Not Connected**: Make sure the Temporal worker is running and connected to the Temporal server.
2. **Mismatched Constants**: Check that `FIRST_FLAME_SLUG` is consistent across the codebase.
3. **Database Issues**: Verify that the Temporal PostgreSQL database is running and accessible.

## Integration Test

You can run the integration test to verify that the First Flame system is working correctly:

```bash
pnpm test:integration
```

This test performs the following checks:
1. Calls `list-quests` to ensure the First Flame quest exists
2. Polls `get-flame-status` until it returns `processing: false`
3. Verifies that the response contains the correct data structure

## Development Tips

- **Development Scripts**:
  - `pnpm dev:temporal` - Starts just the Temporal stack
  - `pnpm dev:worker` - Starts just the worker
  - `pnpm supa:serve` - Starts just the Supabase Edge Functions
  - `pnpm dev:stack` - Starts Temporal first, then other services concurrently
  - `pnpm dev:all` - Starts all services concurrently (may have timing issues)
  - `pnpm test:integration` - Runs the integration test

- **Temporal Web UI**:
  - Access at http://localhost:8233
  - Monitor workflow executions in real time
  - Verify worker connection status

- **Important Files**:
  - `docker/docker-compose.temporal.yml` - Temporal server configuration
  - `temporal-worker/src/worker.ts` - Worker configuration
  - `supabase/functions/get-flame-status/index.ts` - Status endpoint
  - `supabase/functions/list-quests/index.ts` - Creates First Flame quest
  - `src/lib/shared/firstFlame.ts` - Shared constants and types
  - `src/lib/api/quests.ts` - API integration and schema validation

- **Manual Workflow Trigger**:
  - The workflow can be manually triggered using `pnpm workflow:trigger`

- **Critical Checklist**:
  1. Temporal database driver is `postgres12` (not `postgresql`)
  2. Worker connects to `localhost:7233`
  3. All code uses `FIRST_FLAME_SLUG` (not any hardcoded UUIDs)
  4. Edge functions have proper error handling and idempotency
  5. Zod schema matches the actual response structure