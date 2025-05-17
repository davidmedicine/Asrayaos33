// Example: src/app/providers.tsx or similar
'use client'; // If using App Router

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional dev tools

// Create a client
// Use useState to ensure client is only created once per render cycle
const [queryClient] = React.useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      // Configure default staleTime/cacheTime if desired
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (gcTime replaces cacheTime)
    },
  },
}));

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Optional Devtools for debugging cache */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// Then wrap your layout/page with <AppProviders>