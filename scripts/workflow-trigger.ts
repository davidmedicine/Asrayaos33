#!/usr/bin/env node
/**
 * End‑to‑end test script for the **First Flame** workflow.
 *
 * Usage:
 *   pnpm workflow:trigger '{"userId":"demo-user","questId":"ff-demo-E2E"}'
 *
 * Steps:
 *   1. Calls the **list-quests** Supabase Edge Function to kick off—or resume—the First Flame workflow
 *   2. Polls **get‑flame‑status** until `processing === false` (or until timeout)
 *   3. Prints the final status and exits with the proper code
 */

const axios = require('axios');
const dotenv = require('dotenv');
const { parseArgs } = require('node:util');

// ─── Environment ────────────────────────────────────────────────────────────────
dotenv.config();

const SUPABASE_URL /* :string */ = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY /* :string */ = process.env.SUPABASE_ANON_KEY || '';
const MAX_RETRY_TIME_MS = 30_000; // 30 s
const POLL_INTERVAL_MS  =  2_000; // 2 s

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌  Missing required env vars:');
  if (!SUPABASE_URL)     console.error('   - SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) console.error('   - SUPABASE_ANON_KEY');
  process.exit(1);
}

// ─── Main ───────────────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

async function main() {
  // Parse CLI input (expects a single JSON positional arg)
  const { positionals } = parseArgs({ args: process.argv.slice(2), allowPositionals: true });
  if (positionals.length !== 1) {
    console.error("Usage: pnpm workflow:trigger '{\"userId\":\"demo-user\",\"questId\":\"ff-demo-E2E\"}'");
    process.exit(1);
  }

  const { userId, questId } = JSON.parse(positionals[0]);
  if (!userId || !questId) {
    console.error('Input JSON must contain both userId and questId');
    process.exit(1);
  }

  console.log(`\n🟣  Starting First Flame E2E for user=${userId} quest=${questId}`);

  // 1) Trigger / resume workflow
  console.log('🔸 Triggering workflow via list-quests function…');
  await triggerWorkflow(userId, questId);

  // 2) Poll status
  console.log('🔸 Polling get‑flame‑status…');
  const result = await pollFlameStatus(userId);

  // 3) Report
  if (result.success) {
    console.log('\n✅  Success! First Flame status:');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.error('\n❌  Failed to get First Flame status:', result.error);
    process.exit(1);
  }
}

// ─── Trigger Workflow (via Supabase Edge Function) ────────────────────────────
async function triggerWorkflow(userId /* :string */, questId /* :string */): Promise<void> {
  try {
    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/list-quests`,
      { userId, questId }, // questId is forwarded so the function can decide what to do
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    console.log('   ↳ Function response:', response.data);
    console.log('   ↳ Workflow trigger reported ⬆️  above');
  } catch (error) {
    console.error('Failed to trigger workflow:', error);
    throw error;
  }
}

// ─── Poll Status ────────────────────────────────────────────────────────────────
async function pollFlameStatus(userId /* :string */) {
  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < MAX_RETRY_TIME_MS) {
    attempt += 1;
    try {
      console.log(`   • Attempt ${attempt}`);
      const res = await axios.get(`${SUPABASE_URL}/functions/v1/get-flame-status`, {
        params: { userId },
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (res.status === 200 && res.data && res.data.processing === false) {
        return { success: true, data: res.data };
      }

      if (res.status === 202 && res.data && res.data.processing === true) {
        console.log('     ↳ Still processing…');
        const delay = res.data.estimatedRetryMs || POLL_INTERVAL_MS;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Unexpected
      console.log(`     ↳ Unexpected response (${res.status}):`, res.data);
    } catch (err) {
      console.error('     ↳ Error polling:', err.message);
      if (err.response) {
        console.error('       Status:', err.response.status, 'Data:', err.response.data);
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  return {
    success: false,
    error: `Timed out after ${MAX_RETRY_TIME_MS / 1000}s`,
  };
}
