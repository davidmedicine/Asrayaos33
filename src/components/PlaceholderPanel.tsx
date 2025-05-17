// File path: src/components/PlaceholderPanel.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils'; // Import cn utility

interface PlaceholderPanelProps {
  panelId: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  panelTitleId?: string; // Add optional panelTitleId for accessibility/linking
}

const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  panelId,
  panelTitleId, // Receive panelTitleId
  title = 'Placeholder Panel', // More generic default title
  description = 'This panel is a placeholder for future functionality.', // Default description
  icon
}) => {
  // Default icons based on panel ID (Keep logic as is, but ensure stroke is currentColor)
  const getDefaultIcon = () => {
    // Common attributes for icons
    const iconProps = {
        width: "40",
        height: "40",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor", // Use currentColor to inherit from parent div
        strokeWidth: "1", // Keep thin stroke weight
        strokeLinecap: "round" as const, // Use 'as const' for literal types
        strokeLinejoin: "round" as const,
    };

    if (panelId?.includes('world')) {
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    }

    if (panelId?.includes('memory')) {
      return (
        <svg {...iconProps}>
          <path d="M22 8.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5.5" />
          <path d="M2 12a5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0 5 5 5 5 0 0 0 5-5" />
          <path d="M2 8.5a5 5 0 0 1 5 5 5 5 0 0 1 5-5 5 5 0 0 1 5 5 5 5 0 0 1 5-5" />
        </svg>
      );
    }

    // Default fallback icon
    return (
      <svg {...iconProps}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    );
  };

  return (
    // Use theme variables for background, remove global opacity
    <div className={cn(
        "h-full w-full flex flex-col items-center justify-center p-4 md:p-6",
        "bg-[var(--bg-surface)]" // Use theme background variable
    )}>
      <div className="text-center max-w-md">
        {/* Icon using muted text color and some opacity */}
        <div className="text-[var(--text-muted)] mb-4 opacity-60">
          {icon || getDefaultIcon()}
        </div>

        {/* Heading using theme heading color */}
        <h3
          id={panelTitleId} // Link title ID for accessibility
          className="text-xl font-medium mb-2 text-[var(--text-heading)]" // Use heading color
        >
          {title}
        </h3>

        {/* Description using muted text color */}
        <p className="text-[var(--text-muted)] mb-4 text-sm"> {/* Adjusted text size */}
          {description}
        </p>

        {/* Panel ID display using subtle theme colors */}
        <div className={cn(
            "text-xs p-2 rounded-[var(--radius-md)] border", // Use theme radius
            "text-[var(--text-muted)] border-[var(--border-subtle)]", // Use subtle border
            "bg-[var(--bg-subtle)]" // Use subtle background
         )}>
          Panel ID: <code className="font-mono">{panelId}</code> {/* Use code tag for ID */}
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPanel;