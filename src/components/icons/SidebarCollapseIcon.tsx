// === File: src/components/icons/SidebarCollapseIcon.tsx ===

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed

// Define props interface to accept className and standard SVG attributes
interface SidebarCollapseIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Icon representing the action to collapse or hide a sidebar (usually arrows pointing left).
 * Takes standard SVG props and className.
 * Size and color are typically controlled by parent via className (e.g., "w-5 h-5").
 */
export const SidebarCollapseIcon = ({ className, ...props }: SidebarCollapseIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" // Standard viewBox
    fill="none"
    stroke="currentColor" // Inherits color from parent text color
    strokeWidth="1.5" // Stroke width from original snippet
    strokeLinecap="round"
    strokeLinejoin="round"
    // Apply className passed from parent for sizing, color, etc.
    className={cn(className)}
    // Spread other SVG props like aria-hidden, data-testid, etc.
    {...props}
  >
    {/* SVG paths provided in the previous prompt */}
    <path d="M9 3l-6 9 6 9 M3 12h11M14 3h7v18h-7z" />
  </svg>
);

SidebarCollapseIcon.displayName = "SidebarCollapseIcon"; // For better debugging

// Optional: Export as default if it's the only export
// export default SidebarCollapseIcon;