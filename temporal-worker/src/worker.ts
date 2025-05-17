// src/worker.ts
// ─────────────────────────────────────────────────────────────
// Temporal Worker entry-point
//   • Loads .env (dev) via dotenv
//   • Discovers all Workflows re-exported from src/workflows/index.ts
//   • Registers every Activity re-exported from src/activities/index.ts
//   • Gracefully shuts down on SIGINT / SIGTERM
// ─────────────────────────────────────────────────────────────
import 'dotenv/config';                       // no-op in prod
import path from 'node:path';
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';   // barrel file  (src/activities/index.ts)

/* ─── 1 · Environment ---------------------------------------------------- */
const {
  TEMPORAL_ADDRESS,              // optional – defaults to 127.0.0.1:7233
  TEMPORAL_NAMESPACE = 'default',
  TEMPORAL_TASK_QUEUE = 'first-flame',
} = process.env;

/* ─── 2 · Derived paths -------------------------------------------------- */
const workflowsPath = path.join(__dirname, 'workflows'); // index.ts re-exports

/* ─── 3 · Boot worker ---------------------------------------------------- */
async function main(): Promise<void> {
  // Establish gRPC connection only when a non-default address is supplied
  const connection = TEMPORAL_ADDRESS
    ? await NativeConnection.connect({ address: TEMPORAL_ADDRESS })
    : undefined;                                                   // SDK uses localhost if undefined :contentReference[oaicite:0]{index=0}

  const worker = await Worker.create({
    workflowsPath,                         // folder discoverable by bundler
    activities,                            // ensure broadcastReady is exported
    taskQueue: TEMPORAL_TASK_QUEUE,
    namespace: TEMPORAL_NAMESPACE,
    connection,                            // may be undefined (local dev) :contentReference[oaicite:1]{index=1}
  });

  /* Graceful shutdown — Ctrl-C / docker stop */
  const shutdown = async () => {
    console.log('[Worker] shutting down …');
    await worker.shutdown();
    process.exit(0);
  };
  process.once('SIGINT',  shutdown);
  process.once('SIGTERM', shutdown);

  console.log(
    `[Worker] RUNNING  ns="${TEMPORAL_NAMESPACE}"  queue="${TEMPORAL_TASK_QUEUE}"`,
  );
  await worker.run();                      // blocks until shutdown
}

/* ─── 4 · Fire ----------------------------------------------------------- */
main().catch((err) => {
  console.error('[Worker] fatal error:', err);
  process.exit(1);
});
