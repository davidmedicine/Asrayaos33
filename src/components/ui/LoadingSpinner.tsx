// === File: src/components/ui/LoadingSpinner.tsx ===
// (Adjust path as needed, e.g., components/common)

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed

interface LoadingSpinnerProps extends React.SVGProps<SVGSVGElement> {
  /**
   * The size of the spinner.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Optional additional class names.
   */
  className?: string;
  /**
   * Accessible label for screen readers.
   * @default 'Loading...'
   */
  'aria-label'?: string;
}

/**
 * A simple themed loading spinner component.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Loading...', // Default accessible label
  ...props // Pass other SVG props like data-testid
}) => {
  // Map size prop to Tailwind width/height classes
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5', // Default icon size
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <svg
      className={cn(
        'animate-spin text-[var(--text-muted)]', // Base animation and color (uses muted text color)
        sizeClasses[size] || sizeClasses.md, // Apply size class, fallback to md
        className // Allow overriding/extending classes
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status" // Accessibility: Indicate it's a status element
      aria-live="polite" // Announce changes politely if content updates dynamically related to loading
      {...props}
    >
      {/* Use <title> for accessible name, often better than aria-label on SVG */}
      <title>{ariaLabel}</title>
      {/* Spinner graphic: circle background + path segment */}
      <circle
        className="opacity-25" // Base circle is less opaque
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor" // Inherits text color
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75" // Spinning part is more opaque
        fill="currentColor" // Inherits text color
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

LoadingSpinner.displayName = 'LoadingSpinner'; // For better debugging