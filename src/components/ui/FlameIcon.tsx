// File: src/components/icons/FlameIcon.tsx

import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a cn utility for classnames

interface FlameIconProps extends React.SVGProps<SVGSVGElement> {
  // You can add specific props here if needed, e.g., active state for animation
  className?: string;
}

export const FlameIcon: React.FC<FlameIconProps> = ({ className, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24" // Standard 24x24 viewBox for consistency
      fill="none" // Default to no fill, controlled by CSS
      stroke="currentColor" // Default to current text color for stroke
      strokeWidth="1.5" // A slightly thinner stroke can look more elegant
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-flame', className)} // Base classes + custom
      aria-hidden="true" // Decorative icon
      focusable="false" // Not focusable
      {...props}
    >
      {/*
        Path Explanation:
        - M (Move to): Start point
        - C (Cubic Bézier Curve): x1 y1, x2 y2, x y (control points, end point)
        - A (Elliptical Arc): rx ry x-axis-rotation large-arc-flag sweep-flag x y
        - Z (Close Path)

        This flame shape is constructed from two main Bézier curves forming the
        outer body and a smaller inner curve for a bit of detail/hollowness.
        The points are chosen to create a dynamic, upward-flickering flame.
      */}
      <path d="M12 22C12 22 8 18 8 14C8 10 12 2 12 2C12 2 16 10 16 14C16 18 12 22 12 22Z" />
      {/* Optional inner flame detail for more depth - can be styled differently */}
      {/* <path d="M12 18C12 18 10 16 10 14C10 12 11 10 12 10C13 10 14 12 14 14C14 16 12 18 12 18Z" /> */}
    </svg>
  );
};

FlameIcon.displayName = 'FlameIcon';

// Example Usage (conceptual):
// import { FlameIcon } from '@/components/icons/FlameIcon';
//
// const MyComponent = () => {
//   return (
//     <div>
//       <FlameIcon className="w-6 h-6 text-orange-500" /> {/* Basic usage */}
//       <FlameIcon className="w-8 h-8 text-red-600 fill-yellow-400" strokeWidth="1" /> {/* More styled */}
//       <FlameIcon
//         className="w-10 h-10 animate-pulse" // Example with animation class
//         style={{ color: 'var(--color-accent-fire)' }} // Using CSS variable
//       />
//     </div>
//   );
// };