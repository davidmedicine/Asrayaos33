import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

/**
 * Attempt to start the Supabase Edge runtime and test the list-quests
 * function. This assumes the `supabase` CLI is available and that the
 * local project has been initialised. The test issues two requests with
 * the same token and expects the quest id to remain stable.
 */
async function startRuntime() {
  const proc = new Deno.Command("supabase", {
    args: ["functions", "serve", "list-quests", "--no-verify-jwt", "--port", "54321"],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  // Wait briefly for the server to come up
  await new Promise((r) => setTimeout(r, 1000));
  return proc;
}

async function stopRuntime(proc: Deno.ChildProcess) {
  proc.kill("SIGTERM");
  await proc.status;
}

async function call(path: string, method: "GET" | "POST", token: string) {
  const res = await fetch(`http://localhost:54321${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return { status: res.status, body };
}

for (const method of ["GET", "POST"] as const) {
  Deno.test({ name: `list-quests ${method} is idempotent` , ignore: false, sanitizeResources: false, sanitizeOps: false }, async () => {
    const proc = await startRuntime();
    try {
      const token = "test-token";
      const first = await call("/list-quests", method, token);
      const second = await call("/list-quests", method, token);
      assertEquals(first.status < 400, true);
      assertEquals(second.status < 400, true);
      assertEquals(first.body.data[0].id, second.body.data[0].id);
    } finally {
      await stopRuntime(proc);
    }
  });
}
