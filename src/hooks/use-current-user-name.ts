import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase_client/client';
import type { User } from '@supabase/supabase-js';

/**
 * Returns the current user’s **display name** (or null if anonymous / not set).
 *
 * Mirrors `useCurrentUserImage` for consistent behaviour.
 */
export function useCurrentUserName(): string | null {
  const supabase = createClient();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const extract = (u: User | null): string | null =>
      (u?.user_metadata?.full_name as string | undefined) ??
      (u?.user_metadata?.name as string | undefined) ??
      u?.email ?? null; // reasonable fallback

    supabase.auth.getUser().then(({ data }) => setName(extract(data.user)));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setName(extract(session?.user ?? null))
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return name;
}
