// -----------------------------------------------------------------------------
// File: src/lib/react-query/ReactQueryProvider.tsx
// Lightweight client-side provider for TanStack React-Query v5
// Replaces deprecated <Hydrate> with <HydrationBoundary> (2025-05-11)
// -----------------------------------------------------------------------------

'use client';

import React, { PropsWithChildren, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  QueryErrorResetBoundary,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * Wrap the entire app (see `src/app/layout.tsx`) so that any component can call
 * `useQuery`, `useMutation`, or `useQueryClient` without the
 * “No QueryClient set” runtime error.
 */
export function ReactQueryProvider({ children }: PropsWithChildren<{}>) {
  // Ensure the QueryClient instance is created only once per browser session.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000, // 5 min stale
            retry: 2,
          },
          mutations: {
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <QueryClientProvider client={queryClient}>
          {/* If you later add SSR/SSG, dehydrate() the cache on the server and
             pass it here as the `state` prop. */}
          <HydrationBoundary state={null}>
            {children}
          </HydrationBoundary>

          {/* DevTools are automatically tree-shaken from production builds */}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      )}
    </QueryErrorResetBoundary>
  );
}
