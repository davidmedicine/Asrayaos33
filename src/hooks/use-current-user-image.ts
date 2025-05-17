import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase_client/client';          // Supabase singleton
import type { User } from '@supabase/supabase-js';

/**
 * Returns the current user’s avatar URL (or null if anonymous / none set).
 *
 * Caches the value in state and refreshes whenever the Supabase
 * `auth` state changes. 100 % client‑side – safe to call in ‘use client’ files.
 */
export function useCurrentUserImage(): string | null {
  const supabase = createClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    // helper: extracts avatar URL from a Supabase User object or returns null
    const extract = (u: User | null): string | null =>
      (u?.user_metadata?.avatar_url as string | undefined) ?? null;

    // seed from the current session
    supabase.auth.getUser().then(({ data }) => setAvatarUrl(extract(data.user)));

    // subscribe to future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setAvatarUrl(extract(session?.user ?? null))
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return avatarUrl;
}
