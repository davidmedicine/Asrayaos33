// === File: src/features/auth/components/login-form.tsx ===
// Description: Client component for handling user email/password login.

'use client'; // Essential for using hooks and event handlers

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase_client/client'; // Use client-side helper
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button'; // Use project's Button component
import { Input } from '@/components/ui/Input';   // Use project's Input component
import { Label } from '@/components/ui/label';   // Use project's Label component
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'; // Use project's Card component

// Define props for the component
interface LoginFormProps extends React.HTMLAttributes<HTMLDivElement> {
  // Add any specific props needed in the future
}

export const LoginForm = React.memo(({ className, ...props }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // Explicitly type error state
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient(); // Initialize client-side Supabase client

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Throw the error to be caught below
        throw signInError;
      }

      // --- SUCCESS: Redirect to Dashboard ---
      console.log("Login successful, redirecting to /dashboard");
      router.push('/dashboard'); // CORRECTED Redirect destination
      router.refresh(); // IMPORTANT: Refresh server state after login

      // No need to manually clear fields on success due to redirect

    } catch (catchError: unknown) { // Catch potential errors
      console.error("Login Error:", catchError);
      // Provide a user-friendly error message
      let errorMessage = 'An unexpected error occurred during login. Please try again.';
      if (catchError instanceof Error) {
          // Use Supabase error message directly if available and seems safe
          // Common Supabase Auth errors are generally safe to display
          errorMessage = catchError.message;
      }
      setError(errorMessage);
      // Optional: Clear password field on error for slightly better security hygiene
      // setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col', className)} {...props}> {/* Removed gap-6, handled by Card */}
      <Card className="w-full max-w-sm"> {/* Control width here */}
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your Asraya OS account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4"> {/* Use grid gap for spacing */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email" // Accessibility/Security hint
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    tabIndex={isLoading ? -1 : 0} // Prevent tabbing when form is busy
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password" // Accessibility/Security hint
                />
              </div>
              {error && (
                  <p className="text-sm text-[var(--color-error)]" role="alert"> {/* Use CSS variable and role="alert" */}
                      {error}
                  </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                isLoading={isLoading} // Pass isLoading to Button for spinner
                aria-label={isLoading ? "Logging in, please wait" : "Login"}
              >
                {/* Button component should handle showing text or spinner */}
                Login
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/auth/sign-up" className="underline underline-offset-4">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
});

LoginForm.displayName = 'LoginForm';

// Ensure file ends with a newline