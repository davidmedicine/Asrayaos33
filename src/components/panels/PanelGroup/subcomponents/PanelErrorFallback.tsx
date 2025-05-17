'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

export interface PanelErrorFallbackProps {
  error: Error;
  panelId?: string;
  panelComponent?: string;
}

export const PanelErrorFallback = memo(({ error, panelId, panelComponent }: PanelErrorFallbackProps) => (
  <div
    className={cn(
      "flex h-full flex-col items-center justify-center gap-2 overflow-auto p-4 text-center",
      "rounded-md border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 text-[var(--color-error)]"
    )}
    role="alert"
  >
    <p className="font-semibold">Panel Error</p>
    {panelId && <p className="text-xs opacity-80">ID: <code>{panelId}</code></p>}
    {panelComponent && <p className="text-xs opacity-80">Component: <code>{panelComponent}</code></p>}
    <p className="mt-1 rounded bg-[var(--color-error)]/20 p-2 text-xs font-medium">
      {/* Ensure error message is displayed, preventing swallowed errors */}
      {error?.message || 'An unknown error occurred'}
    </p>
    {process.env.NODE_ENV === 'development' && error?.stack && (
      <pre className="mt-2 max-h-40 w-full overflow-auto rounded bg-black/20 p-2 text-left text-[10px] text-[var(--color-error)]/80">
        {error.stack}
      </pre>
    )}
  </div>
));

PanelErrorFallback.displayName = 'PanelErrorFallback';
export default PanelErrorFallback;