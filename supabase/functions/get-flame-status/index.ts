import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { corsHeaders } from "../_shared/cors.ts";

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const headersLog = Object.fromEntries(req.headers.entries());
  const bodyText = await req.text();
  console.log("[get-flame-status] incoming", { headers: headersLog, bodyText });

  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  try {
    const payload = bodyText ? JSON.parse(bodyText) : {};
    const flameSpirit = payload.flameSpirit;

    if (!flameSpirit) return json({ error: "Missing flameSpirit" }, 400);

    console.log("[get-flame-status] Resolved OK");
    return json({ flameStatus: "blazing" });
  } catch (err) {
    console.error("[get-flame-status] parse error", err);
    return json({ error: "Invalid JSON" }, 400);
  }
});
