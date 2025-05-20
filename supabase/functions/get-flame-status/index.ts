// supabase/functions/get-flame-status/index.ts

import { corsHeaders, ENV_IS_LOCAL } from '../_shared/cors.ts';
import { getSupabaseAdmin, getSupabaseUser } from '../_shared/supabase.ts';
import { decodeStorage } from '../_shared/utils.ts';
import {
  DAYDEF_BUCKET,
  DAY_1_PATH,
  FLAME_IMPRINT_STATUS,
} from '../_shared/consts.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    status,
  });

// MAIN LOGIC //
Deno.serve(
  async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
      const sbUser = getSupabaseUser(req);
      const sbAdmin = getSupabaseAdmin();

      // 1. Check if `flame_data_state` exists and what its status is.
      const { data: flameDataState, error: fdsError } = await sbUser
        .from('flame_data_state')
        .select('status, progress')
        .maybeSingle();

      if (fdsError) {
        console.error('[get-flame-status] flame_data_state select error', fdsError);
        return json({ error: 'DB_READ_ERROR' }, 500);
      }

      // If no `flame_data_state` row exists, this implies user has never run Flame.
      // This is the "STALE PATH" - we trigger the generation and tell client to expect updates.
      if (!flameDataState) {
        console.warn('[get-flame-status] No flame_data_state found for user.');
        // (STALE PATH logic continues below)
      } else {
        // `flame_data_state` row exists. Check its status.
        const { status, progress } = flameDataState;

        /* ───── PROCESSING PATH ───── */
        // If status is PENDING or PROCESSING, it means data is being generated.
        if (
          status === FLAME_IMPRINT_STATUS.PENDING ||
          status === FLAME_IMPRINT_STATUS.PROCESSING
        ) {
          console.log(
            `[get-flame-status] Flame data is ${status}. Progress: ${progress}%`,
          );
          // Client should continue polling or listen to realtime updates.
          return json({
            processing: true,
            dataVersion: Date.now(), // To help client differentiate responses
            progress,
          }, 202); // Accepted
        }

        /* ───── ERROR PATH ───── */
        // If status is ERROR, something went wrong during generation.
        if (status === FLAME_IMPRINT_STATUS.ERROR) {
          console.error(
            '[get-flame-status] Flame data state is ERROR. Triggering regeneration.',
          );
          // For now, we'll treat this like the STALE PATH to retry.
          // A more sophisticated approach might involve specific error handling.
          // (STALE PATH logic continues below)
        }

        /* ───── READY PATH ───── */
        // If status is READY, data is available.
        else if (status === FLAME_IMPRINT_STATUS.READY) {
          console.log('[get-flame-status] Flame data is READY. Fetching details.');

          // Fetch `flame_imprints` and `day-1.json`
          // Note: We only fetch day-1.json for now. If more day definitions are needed,
          // this will need to be expanded.
          const [
            { data: imprints, error: ie },
            { data: dayBlob, error: se },
          ] = await Promise.all([
            sbUser
              .from('flame_imprints')
              .select('day, payload_text, created_at')
              .order('day'),
            sbUser.storage.from(DAYDEF_BUCKET).download(DAY_1_PATH),
          ]);

          if (ie) {
            console.error('[get-flame-status] flame_imprints error', ie);
            return json({ error: 'DB' }, 500);
          }
          if (se || !dayBlob) {
            console.error('[get-flame-status] download day-1 error', se);
            return json({ error: 'STORAGE' }, 500);
          }

          const dayJson = JSON.parse(await decodeStorage(dayBlob));

          return json({
            processing  : false,
            dataVersion : Date.now(),
            progress,
            imprints,
            dayDefinition: dayJson,
          }, 200);
        }
      }

      /* ───── STALE PATH / RECOVERY FROM ERROR ───── */
      // This path is reached if:
      // 1. `flame_data_state` doesn't exist (new user or never run).
      // 2. `flame_data_state.status` was ERROR.
      //
      // We need to trigger the `flame-graph-generation` function.
      // But first, let's get the user ID because the broadcast needs it.
      const { data: { user }, error: userErr } = await sbUser.auth.getUser();
      if (userErr) console.error('[get-flame-status] auth.getUser error', userErr);

      // Send a realtime message to indicate data is missing and generation will start.
      // The client can use this to update UI immediately.
      try {
        const { error: invokeErr } =
          await sbAdmin.functions.invoke('realtime-broadcast', {
            body: {
              channel: 'flame_status',
              event  : 'missing', // Client interprets this as "generation starting"
              payload: { user_id: user?.id }, // Include user_id for targeted client updates
            },
          });
        if (invokeErr) {
          console.error('[get-flame-status] realtime-broadcast error', invokeErr);
        }
      } catch (err) {
        console.error('[get-flame-status] realtime-broadcast invoke failed', err);
      }

      // Now, invoke the `flame-graph-generation` function.
      // This is done asynchronously; we don't wait for its completion here.
      // The `flame-graph-generation` function itself will update `flame_data_state`
      // and broadcast progress.
      if (ENV_IS_LOCAL) {
        // For local development, directly invoke if needed or simulate trigger
        console.log('[get-flame-status] LOCAL: Simulating flame-graph-generation trigger.');
        // sbAdmin.functions.invoke('flame-graph-generation', { body: {} }); // Optional: direct invoke
      } else {
        // In production/staging, rely on the trigger or an event that calls it.
        // For now, we assume an external mechanism (e.g., a cron job or event listener)
        // might pick up on the 'missing' state or that this 'get-flame-status' endpoint
        // being hit with no data is a signal.
        // If we want direct invocation from here:
        // sbAdmin.functions.invoke('flame-graph-generation', { body: {} });
        console.log('[get-flame-status] STAGING/PROD: `flame-graph-generation` should be triggered by other means or listening for "missing" state.');
      }

      // Respond to the client that processing has been initiated.
      // Client should then listen for realtime updates or poll.
      return json({ processing: true }, 202); // Accepted
    } catch (err) {
      console.error('[get-flame-status] unhandled error', err);
      return json({ error: 'SERVER_ERROR' }, 500);
    }
  },
);
