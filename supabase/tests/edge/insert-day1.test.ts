/**
 * insert-day1.test.ts - Basic smoke tests for the insert-day1 edge function
 * Run with: deno test --allow-net --allow-env --allow-read
 */

import { assertEquals, assertNotEquals } from 'https://deno.land/std/testing/asserts.ts';

// You'll need to provide these environment variables when running the test
const SB_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SB_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const TEST_USER_ID = Deno.env.get('TEST_USER_ID') || 'demo-user';
const TEST_QUEST_ID = Deno.env.get('TEST_QUEST_ID') || 'ff-demo-test';

// Test cases
Deno.test('insert-day1: No auth header returns 401', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/insert-day1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: TEST_USER_ID, quest_id: TEST_QUEST_ID })
  });

  assertEquals(response.status, 401);
});

Deno.test('insert-day1: Anon key returns 401', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/insert-day1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SB_ANON}`,
      'apikey': SB_ANON
    },
    body: JSON.stringify({ user_id: TEST_USER_ID, quest_id: TEST_QUEST_ID })
  });

  assertEquals(response.status, 401);
});

// Skip this test if no service role key is provided
Deno.test({
  name: 'insert-day1: Service role key succeeds',
  ignore: !SB_SERVICE_ROLE,
  fn: async () => {
    const response = await fetch(`${SB_URL}/functions/v1/insert-day1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SB_SERVICE_ROLE}`,
        'apikey': SB_SERVICE_ROLE
      },
      body: JSON.stringify({ user_id: TEST_USER_ID, quest_id: TEST_QUEST_ID })
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    
    // Should have either note:"INSERTED" or note:"DUPLICATE"
    const hasValidNote = data.note === 'INSERTED' || data.note === 'DUPLICATE';
    assertEquals(hasValidNote, true);
    
    // If inserted, should have rows property
    if (data.note === 'INSERTED') {
      assertNotEquals(data.rows, undefined);
    }
  }
});