// src/components/ui/PanelLoader.tsx
'use client';
import { Loader2 } from 'lucide-react';

export const PanelLoader = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex h-full w-full items-center justify-center gap-2 p-4 text-sm text-[var(--text-muted)]"
  >
    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
    <span>Loading…</span>
  </div>
);

export default PanelLoader;
