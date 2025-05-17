// === File: src/components/icons/SearchIcon.tsx ===

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed

// Define props interface to accept className and standard SVG attributes
interface SearchIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Simple Search (Magnifying Glass) Icon component.
 * Takes standard SVG props and className.
 * Size is typically controlled by parent via className (e.g., "w-4 h-4").
 */
export const SearchIcon = ({ className, ...props }: SearchIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    // Use a standard 24x24 viewBox for consistency
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor" // Inherits color from parent text color
    strokeWidth="2" // Stroke width from original snippet
    strokeLinecap="round"
    strokeLinejoin="round"
    // Apply className passed from parent for sizing, color, etc.
    className={cn(className)}
    // Spread other SVG props like aria-hidden, data-testid, etc.
    {...props}
  >
    {/* Magnifying glass shape */}
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

SearchIcon.displayName = "SearchIcon"; // For better debugging in React DevTools

// Optional: Export as default if it's the only export
// export default SearchIcon;