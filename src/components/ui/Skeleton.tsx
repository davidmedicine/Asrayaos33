// src/components/ui/Skeleton.tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Assuming standard path for cn utility

interface SkeletonLineProps extends React.HTMLAttributes<HTMLDivElement> {
  // Consumers will provide height, width, rounding, margins, etc., via the className prop.
}

/**
 * A skeleton line component used to indicate loading states.
 * It relies on global CSS for the shimmer animation via the `animate-shimmer` class
 * and for the base background color via Tailwind's `bg-muted` utility class (which typically
 * maps to `hsl(var(--muted))`).
 *
 * Example Usage:
 * <SkeletonLine className="h-4 w-3/4 rounded-md" />
 * <SkeletonLine className="h-8 w-1/2 my-2" />
 *
 * Required Global CSS (example, actual implementation might vary):
 *
 * // In your main CSS file (e.g., global.css or app.css)
 * // Ensure your Tailwind/CSS variables for 'muted' are defined.
 * // For Tailwind, `bg-muted` class will apply `background-color: hsl(var(--muted));`
 *
 * @keyframes shimmer {
 *   0% {
 *     background-position: -200% 0;
 *   }
 *   100% {
 *     background-position: 200% 0;
 *   }
 * }
 *
 * .animate-shimmer {
 *   position: relative; // If using pseudo-elements for shimmer highlight
 *   overflow: hidden;   // If using pseudo-elements for shimmer highlight
 *   // The base color is applied by `bg-muted` (e.g., background-color: hsl(var(--muted));)
 * }
 *
 * .animate-shimmer::after { // Example of a pseudo-element shimmer
 *   content: '';
 *   position: absolute;
 *   top: 0;
 *   left: 0;
 *   width: 100%;
 *   height: 100%;
 *   transform: translateX(-100%); // Start off-screen
 *   background-image: linear-gradient(
 *     90deg,
 *     transparent 0%,
 *     hsla(0, 0%, 100%, 0.08) 20%, // Light highlight for dark mode
 *     hsla(0, 0%, 100%, 0.15) 60%,
 *     transparent 100%
 *   );
 *   // For light mode, you might use hsla(0, 0%, 0%, 0.05) etc.
 *   // This often requires theme-aware CSS variables for the gradient.
 *   animation: shimmer-pseudo-element 1.5s infinite linear;
 * }
 *
 * @keyframes shimmer-pseudo-element {
 *   100% {
 *     transform: translateX(100%); // Move across the element
 *   }
 * }
 *
 * // If not using pseudo-elements, .animate-shimmer itself might have the gradient:
 * // .animate-shimmer {
 * //   animation: shimmer 1.5s infinite linear;
 * //   background-image: linear-gradient(to right,
 * //     hsl(var(--muted)) 0%,
 * //     hsl(var(--muted-foreground)) 20%, // Adjust colors for shimmer effect
 * //     hsl(var(--muted)) 40%,
 * //     hsl(var(--muted)) 100%
 * //   );
 * //   background-size: 200% 100%;
 * //   background-repeat: no-repeat;
 * // }
 */
export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-shimmer bg-muted', // Core classes: shimmer animation and base background color.
        // `animate-shimmer` is expected to be defined in global CSS.
        // `bg-muted` is a Tailwind utility (resolves to `hsl(var(--muted))`).
        className // Allows consumer to specify dimensions, rounding, margins, etc.
      )}
      aria-hidden="true" // Skeletons are presentational and should be hidden from screen readers.
      {...props}
    />
  );
};

SkeletonLine.displayName = 'SkeletonLine';