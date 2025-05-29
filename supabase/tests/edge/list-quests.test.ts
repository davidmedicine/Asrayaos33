/**
 * list-quests.test.ts - Basic smoke tests for the list-quests edge function
 * Run with: deno test --allow-net --allow-env --allow-read
 */

import { assertEquals, assertNotEquals } from 'https://deno.land/std/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// You'll need to provide these environment variables when running the test
const SB_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SB_USER_JWT = Deno.env.get('TEST_USER_JWT') || '';

// Test cases
Deno.test('list-quests: No auth header returns 401', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/list-quests`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.error, 'MISSING_AUTH_HEADER');
});

Deno.test('list-quests: Invalid JWT returns 401', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/list-quests`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token',
      'apikey': SB_ANON
    }
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.error, 'AUTH');
});

Deno.test('list-quests: Anon key as JWT returns 401', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/list-quests`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SB_ANON}`,
      'apikey': SB_ANON
    }
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.error, 'AUTH');
});

// Skip this test if no user JWT is provided
Deno.test({
  name: 'list-quests: Valid user JWT returns 200',
  ignore: !SB_USER_JWT,
  fn: async () => {
    const response = await fetch(`${SB_URL}/functions/v1/list-quests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SB_USER_JWT}`,
        'apikey': SB_USER_JWT // Use the JWT for both headers
      }
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    
    // Validate response structure
    assertEquals(typeof data, 'object');
    assertEquals(Array.isArray(data.data), true);
    assertNotEquals(data.serverTimestamp, undefined);
    assertEquals(data.error, undefined, "Error field should be undefined on success");
  }
});

// Test X-Authorization fallback
Deno.test({
  name: 'list-quests: X-Authorization fallback works',
  ignore: !SB_USER_JWT,
  fn: async () => {
    const response = await fetch(`${SB_URL}/functions/v1/list-quests`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${SB_USER_JWT}`,
        'apikey': SB_USER_JWT
      }
    });

    assertEquals(response.status, 200);
    const data = await response.json();
    
    // Validate response structure
    assertEquals(typeof data, 'object');
    assertEquals(Array.isArray(data.data), true);
    assertEquals(data.error, undefined, "Error field should be undefined on success");
  }
});