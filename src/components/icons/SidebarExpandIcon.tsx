// === File: src/components/icons/SidebarExpandIcon.tsx ===

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed

// Define props interface to accept className and standard SVG attributes
interface SidebarExpandIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Icon representing the action to expand a minimized sidebar (usually arrows pointing right).
 * Takes standard SVG props and className.
 * Size and color are typically controlled by parent via className (e.g., "w-5 h-5").
 */
export const SidebarExpandIcon = ({ className, ...props }: SidebarExpandIconProps) => (
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
    {/* Represents a minimized bar on the left and arrow pointing right */}
    <path d="M3 3h7v18H3z M14 12H3 M14 3l6 9-6 9" />
  </svg>
);

SidebarExpandIcon.displayName = "SidebarExpandIcon"; // For better debugging

// Optional: Export as default if it's the only export
// export default SidebarExpandIcon;