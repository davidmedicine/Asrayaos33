// deno-lint-ignore-file
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// TODO: handle CORS headers and respond to OPTIONS preflight
Deno.serve(async (req) => {
  const { channel: channelName, event, payload } = await req.json();

  const channel = sb.channel(channelName);
  const sendPromise = channel.send({ type: 'broadcast', event, payload });
  const result = (await Promise.race([sendPromise, delay(5000)])) as
    | { error: { message: string } | null }
    | undefined;

  if (!result) {
    console.error('Realtime broadcast timed out');
    return new Response('timeout', { status: 500 });
  }

  const { error } = result;
  if (error) {
    console.error(error);
    return new Response(error.message, { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
