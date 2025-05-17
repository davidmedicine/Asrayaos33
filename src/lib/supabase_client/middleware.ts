// === File: src/lib/supabase/middleware.ts ===
/**
 * Middleware helper for Supabase authentication
 * Handles session refreshing and redirection of unauthenticated users
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

/**
 * Refreshes the user's session if necessary and handles redirection
 * @param request The Next.js request object
 * @returns NextResponse with cookies for Supabase session
 */
export async function updateSession(request: NextRequest) {
  // Create a response object that we'll modify and return
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client configured for middleware
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Update the request cookies
          request.cookies.set({
            name,
            value,
            ...options,
          })
          
          // Update the response cookies
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          // Update request cookies
          request.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
          
          // Update response cookies
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )

  // IMPORTANT: Don't run code between createServerClient and auth.getUser()
  // to avoid timing issues with cookie updates.
  
  // Refresh the session
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if no user and not on auth pages
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const redirectUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}