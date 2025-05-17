// src/components/icons/BellIcon.tsx

import React, { forwardRef } from 'react';

/**
 * Extends standard SVG props to allow className, etc.
 */
export interface IconProps extends React.SVGProps<SVGSVGElement> {}

/**
 * BellIcon Component: Renders a standard notification bell icon.
 * - Uses stroke="currentColor" for CSS color inheritance.
 * - Forwards refs to the underlying SVG element.
 * - Assumes decorative use (aria-hidden="true"). For semantic use,
 * consider adding title prop and related ARIA attributes.
 */
export const BellIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref} // Forward the ref to the SVG element
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5} // Hardcoded value, comment removed
      aria-hidden="true" // Defaulting to decorative
      className={className} // Apply passed className
      {...props} // Spread other SVG props
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        // SVG path data for bell icon
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  )
);

// Assigning displayName for better debugging experience
BellIcon.displayName = 'BellIcon';

// Optional: Export as default if that's your project convention
// export default BellIcon;