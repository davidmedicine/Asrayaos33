// === File: src/server/actions/authActions.ts ===
// Description: Server Actions related to user authentication using Supabase.

'use server'; // MUST be the very first line

// Import the CORRECTED client creation helper from the central file
import { createClient as createSupabaseServerClient } from '@/lib/supabase_client/server';
import { revalidatePath } from 'next/cache'; // For clearing cache after auth changes
import { redirect } from 'next/navigation'; // For redirecting user

// --- Helper Function for Standardized Error Handling (Optional - Copied for self-containment) ---
function handleAuthError(error: unknown, actionName: string): Error {
    let originalMessage = 'Unknown authentication error';
    let originalCode = 'AUTH_UNKNOWN'; // Custom code prefix for auth errors

    if (error instanceof Error) {
        originalMessage = error.message;
        // Supabase Auth errors often have a specific structure
        const potentialAuthError = error as any;
        if (potentialAuthError?.code) originalCode = `AUTH_${potentialAuthError.code}`;
        if (potentialAuthError?.__isAuthError) originalCode = `SUPABASE_AUTH_${potentialAuthError.status || 'ERROR'}`; // Use status if available
    } else if (typeof error === 'string') {
        originalMessage = error;
    }

    console.error(`SA Error ${actionName}:`, error); // Log detailed error

    // Create user-friendly error message
    const clientError = new Error(`Authentication action '${actionName}' failed. Reason: ${originalMessage}`);
    (clientError as any).code = originalCode; // Attach code
    return clientError;
}


// --- Sign Out Action ---
export async function signOutAction(): Promise<void> {
    const actionName = 'signOutAction';
    try {
        // Create the Supabase client instance configured for Server Actions
        // Uses the async helper which awaits cookies() internally
        const supabase = await createSupabaseServerClient();

        console.log("Server Action: Attempting sign out...");
        // Call Supabase sign out method
        const { error } = await supabase.auth.signOut();

        if (error) {
            // Throw the specific Supabase error to be caught below
            throw error;
        }

        console.log("Server Action: Sign out successful.");
        // Revalidate all paths to ensure logged-out state is reflected everywhere
        revalidatePath('/', 'layout');

    } catch (error) {
        // Handle potential errors during sign out
        const handledError = handleAuthError(error, actionName);
        console.error("Server Action Sign Out Failure:", handledError.message);
        // Even if server-side signout fails, redirecting is usually the best UX
        // throw handledError; // Optionally re-throw if needed, but redirect is primary goal
    }

    // Redirect the user to the login page regardless of server-side errors (client session will clear)
    redirect('/login'); // Adjust path to your login page
}

// --- Placeholder for Sign In Action (Email/Password) ---
export async function signInWithPasswordAction(formData: FormData): Promise<{ error: string | null }> {
    const actionName = 'signInWithPasswordAction';
    try {
        const supabase = await createSupabaseServerClient();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        // TODO: Add robust input validation (e.g., using Zod)
        if (!email || !password) {
            return { error: 'Email and password are required.' };
        }

        console.log(`SA: Attempting password sign in for ${email}`);

        // TODO: Implement REAL Supabase sign in
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
             // Don't throw the full error, return a user-friendly message
             console.error(`SA Error ${actionName}:`, error);
             return { error: error.message || "Invalid login credentials." };
        }

        console.log(`SA: Sign in successful for ${email}`);
        revalidatePath('/', 'layout'); // Revalidate after login
        // Redirect is usually handled client-side after successful action return
        return { error: null };

    } catch (error) {
        const handledError = handleAuthError(error, actionName);
        return { error: handledError.message }; // Return error message to the client form
    }
}

// --- Placeholder for Sign Up Action (Email/Password) ---
export async function signUpAction(formData: FormData): Promise<{ error: string | null; needsConfirmation?: boolean }> {
    const actionName = 'signUpAction';
    try {
        const supabase = await createSupabaseServerClient();
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        // TODO: Extract other potential fields (username, fullName, etc.)

        // TODO: Add robust input validation (e.g., password strength)
        if (!email || !password) {
            return { error: 'Email and password are required.' };
        }
        // Add password complexity check example
        if (password.length < 8) {
            return { error: 'Password must be at least 8 characters long.' };
        }

        console.log(`SA: Attempting sign up for ${email}`);

        // TODO: Implement REAL Supabase sign up
        // Include redirect URL for email confirmation link
        const origin = headers().get('origin'); // Need headers from next/headers for this
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // emailRedirectTo: `${origin}/auth/callback`, // Example redirect URL
                // Add user metadata if needed
                // data: { full_name: formData.get('fullName'), username: formData.get('username') }
            },
        });

        if (error) {
            console.error(`SA Error ${actionName}:`, error);
            return { error: error.message || "Sign up failed." };
        }

        // Check if email confirmation is required
        const needsConfirmation = data.user?.identities?.length === 0 || !!data.user?.confirmed_at === false;

        console.log(`SA: Sign up successful for ${email}. Needs Confirmation: ${needsConfirmation}`);
        revalidatePath('/', 'layout');
        // Redirect usually handled client-side based on response
        return { error: null, needsConfirmation };

    } catch (error) {
        const handledError = handleAuthError(error, actionName);
        return { error: handledError.message };
    }
}


// TODO: Implement actions for OAuth sign-in (signInWithOAuth), password reset, etc. if needed.
// Example OAuth (Initiation is client-side, callback handled by API route)
// export async function signInWithOAuth(provider: 'google' | 'github' | ...) {
//    const supabase = await createSupabaseServerClient();
//    const origin = headers().get('origin');
//    const { data, error } = await supabase.auth.signInWithOAuth({
//        provider,
//        options: { redirectTo: `${origin}/auth/callback` }
//    });
//    if (error) throw handleServerError(error, 'signInWithOAuth');
//    if (data.url) redirect(data.url); // Redirect to provider
//    else throw new Error("OAuth provider did not return a URL.");
// }

// Ensure file ends with a newline