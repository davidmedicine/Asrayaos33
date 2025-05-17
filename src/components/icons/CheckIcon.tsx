// === File: src/components/icons/CheckIcon.tsx ===

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed

// Define props interface to accept className and standard SVG attributes
interface CheckIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Simple Checkmark Icon component.
 * Takes standard SVG props and className.
 * Size and color are typically controlled by parent via className (e.g., "w-4 h-4").
 */
export const CheckIcon = ({ className, ...props }: CheckIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" // Standard viewBox
    fill="none"
    stroke="currentColor" // Inherits color from parent text color
    strokeWidth={3} // Use slightly thicker stroke as per example
    strokeLinecap="round"
    strokeLinejoin="round"
    // Apply className passed from parent for sizing, color, etc.
    className={cn(className)}
    // Spread other SVG props like aria-hidden, data-testid, etc.
    {...props}
  >
    {/* Checkmark path data */}
    <path d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

CheckIcon.displayName = "CheckIcon"; // For better debugging

// Optional: Export as default if it's the only export
// export default CheckIcon;