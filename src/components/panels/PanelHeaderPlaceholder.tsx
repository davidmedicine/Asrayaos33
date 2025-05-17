// === File: src/components/panels/PanelHeaderPlaceholder.tsx ===
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getThemeClass } from '@/lib/utils/themeUtils';

interface PanelHeaderPlaceholderProps {
  /** Title to display in the header */
  title: string;
  /** Panel ID for unique identification */
  panelId: string;
  /** Optional icon name to display */
  iconName?: string;
  /** Agent ID for theming */
  agentId?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A placeholder component for panel headers during initial development
 * Provides consistent styling and optional icon support
 */
const PanelHeaderPlaceholder = ({
  title,
  panelId,
  iconName,
  agentId,
  className,
}: PanelHeaderPlaceholderProps) => {
  const headerId = `panel-header-${panelId}`;
  
  return (
    <div 
      className={cn(
        "panel-header flex h-14 flex-shrink-0 items-center justify-between",
        "border-b border-[var(--border-default)] bg-[var(--bg-surface)]",
        "px-[var(--spacing-4)]",
        agentId ? getThemeClass(agentId) : '',
        className
      )}
    >
      <h3 
        id={headerId} 
        className="truncate text-sm font-medium text-[var(--text-heading)]"
      >
        {iconName && (
          <span className="mr-2 inline-block h-4 w-4 align-text-bottom opacity-70">
            {/* Icon would be rendered here based on iconName */}
            □
          </span>
        )}
        {title}
      </h3>
      <div className="flex items-center gap-1">
        {/* Placeholder for actions */}
        <span className="h-8 w-8 rounded-md bg-[var(--bg-muted)] opacity-30"></span>
      </div>
    </div>
  );
};

export { PanelHeaderPlaceholder };