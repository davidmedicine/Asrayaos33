/* --------------------------------------------------------------------------
 *  src/lib/auth/AuthProvider.tsx               (← feel free to adjust path)
 *  Fully-typed React context for Supabase auth.
 *  Improvements
 *    • Eliminated “undefined” branch for `userId` – it is now always string | null
 *    • Added defensive AbortController so the initial session fetch can’t set
 *      state on an un-mounted component (helps with React Fast Refresh)
 *    • Stored the *latest* access-token hash in a ref; we now bail early from
 *      onAuthStateChange if nothing really changed (micro-perf)
 *    • Consolidated the HMR listener-guard logic
 * ------------------------------------------------------------------------*/

'use client';

import React, {
  createContext, useState, useEffect, useRef,
  useMemo, useContext, type ReactNode,
} from 'react';
import type {
  Session, AuthChangeEvent, User,
} from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase_client/client';

/* ────────────────────────────────────────────────────────────────────────── */
/* 1 · Context shape                                                         */
/* ────────────────────────────────────────────────────────────────────────── */
interface AuthCtx {
  session        : Session | null;
  user           : User   | null;
  userId         : string | null;
  isLoadingAuth  : boolean;
  authError      : Error  | null;
  authEvent      : 'NO_SESSION' | 'INITIAL_SESSION' | AuthChangeEvent | null;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

/* ────────────────────────────────────────────────────────────────────────── */
/* 2 · Dev-only Hot-Module-Reload guard                                      */
/* ────────────────────────────────────────────────────────────────────────── */
declare global { // eslint-disable-line
  var __SUPABASE_AUTH_LSN_ACTIVE: boolean | undefined;
}
if (typeof globalThis.__SUPABASE_AUTH_LSN_ACTIVE === 'undefined') {
  globalThis.__SUPABASE_AUTH_LSN_ACTIVE = false;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 3 · Provider component                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  /* ---------- state ---------- */
  const [session,       setSession] = useState<Session | null>(null);
  const [user,          setUser]    = useState<User   | null>(null);
  const [userId,        setUserId]  = useState<string | null>(null);
  const [isLoadingAuth, setLoading] = useState(true);
  const [authError,     setError]   = useState<Error | null>(null);
  const [authEvent,     setEvent]   = useState<AuthCtx['authEvent']>(null);

  /* ---------- refs ---------- */
  const isMounted          = useRef(true);
  const initialFetchDone   = useRef(false);
  const lastAccessTokenRef = useRef<string | null>(null);

  /* ---------- unmount guard ---------- */
  useEffect(() => () => { isMounted.current = false; }, []);

  /* ---------- initial session fetch ---------- */
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (ac.signal.aborted || !isMounted.current) return;

        if (error) {
          setError(new Error(error.message));
          setEvent('NO_SESSION');
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setUserId(data.session?.user?.id ?? null);
          lastAccessTokenRef.current = data.session?.access_token ?? null;
          setEvent(data.session?.user ? 'INITIAL_SESSION' : 'NO_SESSION');
        }
      } catch (err) {
        if (isMounted.current) setError(err as Error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          initialFetchDone.current = true;
        }
      }
    })();

    return () => ac.abort();
  }, []);

  /* ---------- realtime auth-state listener ---------- */
  useEffect(() => {
    if (globalThis.__SUPABASE_AUTH_LSN_ACTIVE) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[AuthProvider] duplicate Supabase listener skipped (HMR).');
      }
      return;
    }
    globalThis.__SUPABASE_AUTH_LSN_ACTIVE = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evt, newSession) => {
      if (!isMounted.current) return;

      const newToken = newSession?.access_token ?? null;
      if (!initialFetchDone.current || newToken !== lastAccessTokenRef.current) {
        lastAccessTokenRef.current = newToken;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setUserId(newSession?.user?.id ?? null);
        setEvent(evt);
        setError(null);
        setLoading(false);
        initialFetchDone.current = true;
      }
    });

    return () => {
      subscription.unsubscribe();
      globalThis.__SUPABASE_AUTH_LSN_ACTIVE = false;
    };
  }, []);

  /* ---------- memoised context ---------- */
  const value = useMemo<AuthCtx>(
    () => ({
      session, user, userId, isLoadingAuth, authError, authEvent,
    }),
    [session, user, userId, isLoadingAuth, authError, authEvent],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* 4 · Convenience hook                                                      */
/* ────────────────────────────────────────────────────────────────────────── */
export const useAuth = (): AuthCtx => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
};
