/**
 * realtime-broadcast.test.ts - Basic smoke tests for the realtime-broadcast edge function
 * Run with: deno test --allow-net --allow-env --allow-read
 */

import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

// You'll need to provide these environment variables when running the test
const SB_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SB_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TEST_USER_ID = Deno.env.get('TEST_USER_ID') || 'demo-user';

// Test cases
Deno.test('realtime-broadcast: No auth header returns 401', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/realtime-broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      channel: 'test_channel',
      event: 'test_event', 
      payload: { user_id: TEST_USER_ID }
    })
  });

  assertEquals(response.status, 401);
});

Deno.test('realtime-broadcast: Anon key returns 401', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/realtime-broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SB_ANON}`,
      'apikey': SB_ANON
    },
    body: JSON.stringify({ 
      channel: 'test_channel',
      event: 'test_event', 
      payload: { user_id: TEST_USER_ID }
    })
  });

  assertEquals(response.status, 401);
});

// Skip this test if no service role key is provided
Deno.test({
  name: 'realtime-broadcast: Service role key succeeds',
  ignore: !SB_SERVICE_ROLE,
  fn: async () => {
    const response = await fetch(`${SB_URL}/functions/v1/realtime-broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SB_SERVICE_ROLE}`,
        'apikey': SB_SERVICE_ROLE
      },
      body: JSON.stringify({ 
        channel: 'test_channel',
        event: 'test_event', 
        payload: { user_id: TEST_USER_ID }
      })
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    assertEquals(data.ok, true);
  }
});