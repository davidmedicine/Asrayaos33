// src/components/ui/PanelErrorFallback.tsx
'use client';
import React from 'react';

interface Props {
  error: Error;
  panelId?: string;
  panelComponent?: string;
}
const PanelErrorFallback: React.FC<Props> = ({ error, panelId, panelComponent }) => (
  <div
    role="alert"
    className="flex h-full flex-col items-center justify-center gap-2 overflow-auto
               rounded-md border border-red-500/30 bg-red-500/10 p-4 text-center text-red-600"
  >
    <p className="font-semibold">Panel Error</p>
    {panelId && <p className="text-xs opacity-80">ID: <code>{panelId}</code></p>}
    {panelComponent && <p className="text-xs opacity-80">Component: <code>{panelComponent}</code></p>}
    <pre className="mt-2 max-h-40 w-full overflow-auto rounded bg-black/20 p-2 text-left text-xs text-red-200">
      {error.message}
    </pre>
  </div>
);
export default PanelErrorFallback;
