// src/hooks/useFlameBroadcast.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { gsap } from '@/lib/gsapSetup'; // Using existing GSAP setup
import { supabase } from '@/lib/supabase_client/client'; // Tweak 1: Use shared Supabase client
import { FLAME_STATUS_QUERY_KEY, QUESTS_QUERY_KEY } from '@/lib/api/quests';

// Constant for throttling the pulse effect, as per feedback.
const PULSE_THROTTLE_MS = 1500;

/**
 * Subscribes to the `flame_status` realtime channel and reacts to
 * `ready` events by invalidating cached queries and triggering a
 * visual pulse on the OracleOrb.
 */
export function useFlameBroadcast(): void {
  const queryClient = useQueryClient();
  // Ref to store the timestamp of the last pulse, to implement throttling.
  const lastPulseAt = useRef<number>(0);
  // Ref to store the GSAP context for proper animation cleanup.
  const gsapContextRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    // Initialize GSAP context.
    // This ensures that any GSAP animations added to this context are properly cleaned up
    // when the component unmounts or dependencies change, preventing animation leaks.
    const ctx = gsap.context(() => {});
    gsapContextRef.current = ctx;

    // Use the imported singleton 'supabase' client.
    const channel = supabase.channel('flame_status');

    const handleReady = () => {
      // Invalidate queries to force a refetch when the backend signals readiness
      queryClient.invalidateQueries({ queryKey: FLAME_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: QUESTS_QUERY_KEY });

      // Throttle the glow animation: ignore pulses arriving < PULSE_THROTTLE_MS apart.
      if (Date.now() - lastPulseAt.current > PULSE_THROTTLE_MS) {
        // Store Date.now() in the ref after a pulse.
        lastPulseAt.current = Date.now();

        // Add GSAP animation to the context for proper management and cleanup.
        gsapContextRef.current?.add(() => {
          // Prefer getElementById for performance if an ID is available.
          // Assumes the target element has id="oracle-orb".
          const orb = document.getElementById('oracle-orb');
          if (orb) {
            gsap.fromTo(
              orb,
              { boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)' },
              {
                boxShadow: '0 0 60px rgba(168, 85, 247, 1)',
                duration: 0.5,
                yoyo: true,
                repeat: 1,
                ease: 'power2.out',
              }
            );
          }
        });
      }
    };

    // Attach the event listener for 'broadcast' events with type 'ready'
    channel.on('broadcast', { event: 'ready' }, handleReady);

    // Subscribe to the channel and check the subscription status.
    // The callback is invoked with the status of the subscription attempt.
    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        // console.log('Successfully subscribed to flame_status channel.'); // Optional: for debugging
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Flame channel subscription error:', err);
      } else if (status === 'TIMED_OUT') {
        console.warn('Flame channel subscription timed out.');
      }
      // Logging specific error states (CHANNEL_ERROR, TIMED_OUT) is generally more informative
      // than a broad `if (status !== 'SUBSCRIBED')` check.
    });

    // Cleanup function for when the component unmounts or dependencies change
    return () => {
      // Use channel.unsubscribe() for normal teardown.
      // Catching potential errors during unsubscribe is good practice.
      channel.unsubscribe().catch(error => console.warn('Error unsubscribing from flame channel:', error));
      
      // Revert the GSAP context to clean up all animations associated with it.
      gsapContextRef.current?.revert();
    };
  }, [queryClient]); // queryClient is a stable dependency from useQueryClient
}
