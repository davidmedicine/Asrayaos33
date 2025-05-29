// supabase/tests/get-flame-status.local.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std/assert/mod.ts';

// Configuration 
const BASE_URL = Deno.env.get('SUPABASE_FUNCTIONS_URL') || 'http://localhost:54321/functions/v1';
const TEST_USER_ID = 'test-user-id'; // For local testing only
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;
const TIMEOUT_MS = 10000; // 10 seconds timeout for polling

interface QuestResponse {
  data: Array<{
    id: string;
    slug: string;
    isFirstFlameRitual: boolean;
  }>;
}

interface FlameStatusResponse {
  processing: boolean;
  dataVersion: number | null;
  overallProgress?: {
    current_day_target: number;
  };
  dayDefinition?: unknown;
}

// Helper to create service role headers
function getServiceRoleHeaders() {
  const anon_key = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  const service_key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${service_key}`,
    'apikey': anon_key
  };
}

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch quests
async function fetchQuests(): Promise<QuestResponse> {
  const response = await fetch(`${BASE_URL}/list-quests`, {
    method: 'GET',
    headers: getServiceRoleHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch quests: ${response.statusText}`);
  }

  return await response.json();
}

// Poll flame status until processing is false or timeout
async function pollFlameStatus(): Promise<FlameStatusResponse> {
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    // Check if we've exceeded the timeout
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error('Timed out waiting for flame status to be ready');
    }
    
    const response = await fetch(`${BASE_URL}/get-flame-status?userId=${TEST_USER_ID}&allowPublic=1`, {
      method: 'GET',
      headers: getServiceRoleHeaders(),
    });

    if (!response.ok) {
      console.error(`Failed to fetch flame status: ${response.statusText}`);
      await delay(RETRY_DELAY_MS);
      continue;
    }

    const data: FlameStatusResponse = await response.json();
    
    // If processing is false, we have data
    if (data.processing === false) {
      return data;
    }
    
    console.log(`Flame status still processing, retrying in ${RETRY_DELAY_MS}ms...`);
    await delay(RETRY_DELAY_MS);
  }
  
  throw new Error(`Failed to get flame status after ${MAX_RETRY_ATTEMPTS} attempts`);
}

// Main test
Deno.test("First Flame integration test", async () => {
  try {
    // 1. First fetch quests to ensure First Flame quest exists
    console.log("Fetching quests...");
    const questsResponse = await fetchQuests();
    
    // Check that we have at least one quest
    assertEquals(questsResponse.data.length > 0, true, "No quests returned");
    
    // Find the First Flame quest
    const firstFlameQuest = questsResponse.data.find(q => q.isFirstFlameRitual);
    assertExists(firstFlameQuest, "First Flame quest not found");
    
    console.log("First Flame quest found:", firstFlameQuest.id);
    
    // 2. Poll get-flame-status until processing is false
    console.log("Polling flame status...");
    const flameStatus = await pollFlameStatus();
    
    // 3. Verify the flame status response structure
    assertEquals(flameStatus.processing, false, "Flame status should not be processing");
    assertExists(flameStatus.dataVersion, "dataVersion should exist");
    assertExists(flameStatus.overallProgress, "overallProgress should exist");
    assertEquals(flameStatus.overallProgress?.current_day_target, 1, "Should be on day 1");
    assertExists(flameStatus.dayDefinition, "dayDefinition should exist");
    
    console.log("First Flame integration test passed!");
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
});