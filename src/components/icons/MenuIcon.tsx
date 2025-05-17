// === File: src/components/icons/MenuIcon.tsx ===

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed

// Define props interface to accept className and standard SVG attributes
interface MenuIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Simple Hamburger Menu Icon component.
 * Takes standard SVG props and className.
 * Size is typically controlled by parent via className (e.g., "w-5 h-5").
 */
export const MenuIcon = ({ className, ...props }: MenuIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    // Use a standard 24x24 viewBox for consistency
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor" // Inherits color from parent text color
    strokeWidth="1.5" // Use a slightly thinner stroke for cleaner look
    strokeLinecap="round"
    strokeLinejoin="round"
    // Apply className passed from parent for sizing, color, etc.
    className={cn(className)}
    // Spread other SVG props like aria-hidden, data-testid, etc.
    {...props}
  >
    {/* Standard 3-line hamburger menu */}
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

MenuIcon.displayName = "MenuIcon"; // For better debugging in React DevTools

// Optional: Export as default if it's the only export
// export default MenuIcon;