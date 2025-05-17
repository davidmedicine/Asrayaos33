import { supabase } from './client';

/**
 * Resolves with a Supabase session (may be null) only AFTER
 * the client finishes its initial localStorage → memory sync.
 */
export async function waitForInitialSession() {
  // first attempt
  const { data: { session } } = await supabase.auth.getSession();
  if (session !== null) return session;

  // still null ⇒ wait for the first auth-state callback
  return new Promise<NonNullable<typeof session>>((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      sub.subscription.unsubscribe();
      resolve(s);
    });
  });
}
