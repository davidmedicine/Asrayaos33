'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

/**
 * Root landing page.
 * Immediately redirects to “/hub” and shows a short
 * branded loading state during client-side navigation.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the Hub on mount
    router.push('/hub');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-6 bg-bg-body">
      {/* Loading state while redirect happens */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-[var(--agent-color-primary,theme(colors.indigo.500))] opacity-80 flex items-center justify-center mb-8 animate-pulse">
          <Image
            src="/orb-logo.svg"
            alt="Asraya OS"
            width={60}
            height={60}
            className="opacity-70"
            priority
          />
        </div>
        <h1 className="text-3xl font-light text-text-default mb-2">
          Asraya OS
        </h1>
        <p className="text-text-muted">Redirecting to Hub…</p>
      </div>
    </div>
  );
}
