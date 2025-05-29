// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertObjectMatch } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Test that a duplicate call to get-flame-status never throws a 500 error
Deno.test({
  name: "duplicate flame progress calls should be idempotent",
  async fn() {
    // Use environment variables with fallback for CI
    const sbUrl = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
    const sbAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
    
    // Use a random test user ID
    const testUserId = crypto.randomUUID();
    const endpoint = `${sbUrl}/functions/v1/get-flame-status?userId=${testUserId}`;
    
    // Make the first request - should create the row
    const firstResponse = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": sbAnonKey,
      },
    });
    
    // Status should be 200 or 202 (processing) but never 500
    const firstStatus = firstResponse.status;
    console.log(`First request status: ${firstStatus}`);
    assertEquals(
      [200, 202].includes(firstStatus), 
      true, 
      `First request failed with status ${firstStatus}`
    );
    
    // Make a second identical request immediately - should not throw 500
    const secondResponse = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": sbAnonKey,
      },
    });
    
    // Status should be 200 or 202 (processing) but never 500
    const secondStatus = secondResponse.status;
    console.log(`Second request status: ${secondStatus}`);
    assertEquals(
      [200, 202].includes(secondStatus), 
      true, 
      `Second request failed with status ${secondStatus}`
    );
    
    // Verify that exactly one flame_progress row was created
    const sbAdmin = createClient(
      sbUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
      { 
        auth: { persistSession: false },
        db: { schema: "ritual" }
      }
    );
    
    // Get all flame_progress rows for this test user
    const { data: progressRows, error } = await sbAdmin
      .from("flame_progress")
      .select("*")
      .eq("user_id", testUserId);
      
    if (error) {
      console.error("Error querying flame_progress:", error);
      throw error;
    }
    
    // Verify exactly one row exists
    assertEquals(
      progressRows.length, 
      1, 
      `Expected exactly 1 flame_progress row, found ${progressRows.length}`
    );
    
    // Cleanup - delete test data
    try {
      const { error: deleteError } = await sbAdmin
        .from("flame_progress")
        .delete()
        .eq("user_id", testUserId);
        
      if (deleteError) {
        console.warn("Cleanup error (non-fatal):", deleteError);
      }
    } catch (e) {
      console.warn("Cleanup failed (non-fatal):", e);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});