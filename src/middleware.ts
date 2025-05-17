// === File: src/middleware.ts ===
// Description: Next.js middleware using the Supabase helper to refresh user sessions.

import { type NextRequest, NextResponse } from 'next/server';
// Import the Supabase session update helper
import { updateSession } from '@/lib/supabase_client/middleware'; // Ensure this path is correct

/**
 * Middleware function that intercepts requests to update the Supabase session.
 * @param request The incoming NextRequest object.
 * @returns The NextResponse object, potentially with updated cookies.
 */
export async function middleware(request: NextRequest) {
    // Call the Supabase helper function to handle session updates and potential redirects.
    // The helper creates its own Supabase client and handles cookies.
    try {
        return await updateSession(request);
    } catch (error) {
         // Catch potential errors during middleware execution (e.g., env var issues in helper)
         console.error("Error executing Supabase middleware:", error);
         // Allow request to proceed without session update in case of helper error
         return NextResponse.next({
             request: {
                 headers: request.headers,
             },
         });
    }
}

// Configuration for the middleware matcher.
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/ (API routes - session handled differently or not needed for refresh)
         * - auth/ (Auth API routes like callback, callback handling resets session)
         * - Specific file extensions for public assets (svg, png, jpg, etc.)
         * Adjust this pattern based on your project's specific needs.
         */
        '/((?!_next/static|_next/image|favicon.ico|api/|auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

// Ensure file ends with a newline