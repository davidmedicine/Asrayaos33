// === File: src/components/icons/ChevronDownIcon.tsx ===

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed

// Define props interface to accept className and standard SVG attributes
interface ChevronDownIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Simple Chevron Down Icon component (used for dropdown triggers etc.).
 * Takes standard SVG props and className.
 * Size and color are typically controlled by parent via className (e.g., "w-3 h-3").
 */
export const ChevronDownIcon = ({ className, ...props }: ChevronDownIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" // Standard viewBox
    fill="none"
    stroke="currentColor" // Inherits color from parent text color
    strokeWidth={3} // Use slightly thicker stroke as per example
    strokeLinecap="round"
    strokeLinejoin="round"
    // Apply className passed from parent for sizing, color, transitions etc.
    className={cn(className)}
    // Spread other SVG props like aria-hidden, data-testid, etc.
    {...props}
  >
    {/* Chevron down path data */}
    <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

ChevronDownIcon.displayName = "ChevronDownIcon"; // For better debugging

// Optional: Export as default if it's the only export
// export default ChevronDownIcon;