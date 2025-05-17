// src/app/(main)/hub/page.tsx
// ------------------------------------------------------------
// IMPORTANT -- this file is intentionally *tiny*.  All of the
// interactive UI for the Hub lives inside the `(main)/hub`
// layout (which mounts <PanelGroup />).  Keeping this file a
// Server Component avoids shipping an extra client bundle.
//
// If you later need client-side logic *inside* this page shell,
// add `"use client"` back at the very top – but only then.
//
// ------------------------------------------------------------

import type { Metadata } from 'next';
import React from 'react';

/* ------------------------------------------------------------------
 * <metadata> – helps with SEO / social previews.  Completely optional.
 * ------------------------------------------------------------------ */
export const metadata: Metadata = {
  title: 'Oracle Hub – Asraya OS',
  description:
    'Central workspace for interacting with the Oracle AI and other Asraya OS features.',
};

/* ------------------------------------------------------------------
 * HubPage – renders *below* the dynamic PanelGroup injected by the
 * surrounding layout.  Keep this fragment simple to avoid layout
 * clashes or hydration problems.
 * ------------------------------------------------------------------ */
export default function HubPage() {
  return (
    <div className="p-6">
      {/* Appears beneath the dynamic PanelGroup */}
      <h1 className="mb-4 text-2xl font-medium text-[var(--text-heading)]">
        Oracle Hub
      </h1>

      <p className="mb-6 max-w-prose text-[var(--text-muted)]">
        Welcome!  Use the panels above to chat with your AI&nbsp;assistant,
        review prophecies, or launch quick actions – everything in one place.
      </p>

      {/* Optional: message for users with JS disabled */}
      <noscript>
        <p className="mt-4 rounded bg-yellow-200/30 p-3 text-sm text-yellow-900">
          JavaScript is disabled. Interactive panels will not load.
        </p>
      </noscript>
    </div>
  );
}
