import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { gsap } from '@/lib/gsapSetup';
import { createClient } from '@/lib/supabase_client/client';
import { FLAME_STATUS_QUERY_KEY, QUESTS_QUERY_KEY } from '@/lib/api/quests';

/**
 * Subscribes to the `flame_status` realtime channel and reacts to
 * `ready` events by invalidating cached queries and triggering a
 * visual pulse on the OracleOrb.
 */
export function useFlameBroadcast(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('flame_status');

    const handleReady = () => {
      queryClient.invalidateQueries({ queryKey: FLAME_STATUS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: QUESTS_QUERY_KEY });

      const orb = document.querySelector<HTMLElement>('[data-testid="oracle-orb"]');
      if (orb) {
        gsap.fromTo(
          orb,
          { boxShadow: '0 0 30px rgba(168, 85, 247, 0.6)' },
          {
            boxShadow: '0 0 60px rgba(168, 85, 247, 1)',
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: 'power2.out',
          }
        );
      }
    };

    channel.on('broadcast', { event: 'ready' }, handleReady);
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [queryClient]);
}
