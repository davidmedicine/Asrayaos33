'use client';

import React, { memo } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export interface PanelLoaderProps {
  panelId?: string;
}

export const PanelLoader = memo(({ panelId }: PanelLoaderProps) => (
  <div
    className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-sm text-[var(--text-muted)]"
    data-loading-panel-id={panelId}
    role="status"
  >
    <LoadingSpinner size="md" className="text-[var(--agent-color-primary)]" />
    <span>Loading Panel...</span>
  </div>
));

PanelLoader.displayName = 'PanelLoader';
export default PanelLoader;