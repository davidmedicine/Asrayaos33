/**
 * get-flame-status.test.ts - Basic smoke tests for the get-flame-status edge function
 * Run with: deno test --allow-net --allow-env --allow-read
 */

import { assertEquals, assertNotEquals } from 'https://deno.land/std/testing/asserts.ts';

// You'll need to provide these environment variables when running the test
const SB_URL = Deno.env.get('SUPABASE_URL') || 'http://localhost:54321';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SB_USER_JWT = Deno.env.get('TEST_USER_JWT') || '';

// Test cases
Deno.test('get-flame-status: Demo user returns 202 with processing flag', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/get-flame-status?userId=demo-user`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_ANON
    }
  });

  assertEquals(response.status, 202);
  const data = await response.json();
  assertEquals(data.processing, true);
  assertEquals(data.dataVersion, null);
});

Deno.test('get-flame-status: No auth header still works (only needs anon key)', async () => {
  const response = await fetch(`${SB_URL}/functions/v1/get-flame-status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SB_ANON
    }
  });

  // This should return either 202 or 200, but not an error
  const status = response.status;
  assertNotEquals(status, 401);
  assertNotEquals(status, 403);
  assertNotEquals(status, 500);
  
  const data = await response.json();
  // Should either have processing:true or processing:false
  assertEquals(typeof data.processing, 'boolean');
});

// Skip this test if no user JWT is provided
Deno.test({
  name: 'get-flame-status: Valid user JWT returns valid response',
  ignore: !SB_USER_JWT,
  fn: async () => {
    const response = await fetch(`${SB_URL}/functions/v1/get-flame-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SB_USER_JWT}`,
        'apikey': SB_ANON
      }
    });

    // This should return either 202 or 200, but not an error
    const status = response.status;
    assertNotEquals(status, 401);
    assertNotEquals(status, 403);
    assertNotEquals(status, 500);
    
    const data = await response.json();
    
    // If processing is false, we should have all the expected fields
    if (data.processing === false) {
      assertNotEquals(data.dataVersion, null);
      assertNotEquals(data.overallProgress, null);
      assertNotEquals(data.dayDefinition, null);
    }
  }
});