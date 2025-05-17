// === File: src/lib/supabase/server.ts ===
// Description: Utilities for creating Supabase clients for SERVER-SIDE usage.
// v1.102 - Implements the createClient pattern using getAll/setAll based on user-provided snippet.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase'; // Your generated DB types
import type { Session, User } from '@supabase/supabase-js'; // Import Session/User types

// --- Helper to CREATE Supabase client configured for Server Components/Actions ---
// Implements the pattern provided in the user's documentation snippet.
// Uses Anon Key and relies on RLS + cookie handling via getAll/setAll.
export async function createClient() {
    // Await cookies() *before* creating the client instance, as per user request and Next.js 15+.
    const cookieStore = await cookies();

    // --- Environment Variable Check ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use ANON key

    if (!supabaseUrl) throw new Error("Server config error: NEXT_PUBLIC_SUPABASE_URL missing.");
    if (!supabaseAnonKey) throw new Error("Server config error: NEXT_PUBLIC_SUPABASE_ANON_KEY missing.");
    if (!supabaseUrl.startsWith('http')) throw new Error("Server config error: Invalid Supabase URL.");
    // --- End Environment Variable Check ---

    // Create client using Anonymous Key
    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                // Use getAll and setAll as per the provided documentation pattern
                getAll() {
                    // The getAll method on the resolved cookieStore is synchronous
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    try {
                        // The set method on the resolved cookieStore is synchronous
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch (error) {
                        // The `setAll` method might be called from a Server Component.
                        // This can be ignored if middleware is refreshing sessions.
                        // Log warning for potential debugging.
                        console.warn(`[Supabase Server Client - setAll] Cookie set error (expected in SC w/o middleware refresh):`, error);
                    }
                },
                // Note: The provided snippet didn't include 'remove' or 'get(name)'.
                // createServerClient might implicitly use 'setAll' with options for removal.
                // If specific 'get' or 'remove' errors occur later, this config might need adjustment
                // based on the exact requirements of the specific @supabase/ssr version being used.
            },
        }
    );
}

// --- Helper to get User Session (Server-Side) ---
// Uses the rewritten async createClient helper.
export async function getUserSession(): Promise<{ session: Session | null; user: User | null; error: Error | null }> {
    try {
        const supabase = await createClient(); // Await the async client creation
        // getSession itself is async and relies on the cookie methods provided to createClient
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) return { session: null, user: null, error: null }; // No active session

        // If session exists, try getUser for active validation (recommended)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        // Return validated user and session (user might be null if token is invalid but session technically exists)
        return { session, user, error: null };

    } catch (error) {
         console.error("Error fetching user/session in getUserSession:", error);
         return { session: null, user: null, error: error instanceof Error ? error : new Error("Unknown session error") };
    }
}


/**
 * Helper function to get the authenticated user ID, throwing an error if not found.
 * @returns The user ID string.
 * @throws Error if user is not authenticated or session cannot be verified.
 */
export async function getAuthenticatedUserId(): Promise<string> {
    // Note: This calls createClient again. If called frequently after client creation,
    // consider passing the client instance as an argument like before to avoid redundant creation.
    const { user, error } = await getUserSession(); // Use the session helper

    if (error) {
        // Forward the specific error from getUserSession
        throw new Error(`Authentication failed: ${error.message}`);
    }
    if (!user?.id) {
        // Throw if no user object or user ID is found after successful session check
        throw new Error('User is not authenticated');
    }

    return user.id;
}

// Re-export Supabase types if needed centrally
export type { Session, User } from '@supabase/supabase-js';

// Ensure file ends with a newline