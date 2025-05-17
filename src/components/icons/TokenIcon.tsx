// === File: src/components/icons/TokenIcon.tsx ===

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed

// Define props interface to accept className and standard SVG attributes
interface TokenIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Asraya OS Token Icon component (stylized star/crystal).
 * Takes standard SVG props and className.
 * Size and color are typically controlled by parent via className (e.g., "w-4 h-4 text-[var(--color-value-accent)]").
 */
export const TokenIcon = ({ className, ...props }: TokenIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" // Standard viewBox
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
    {/* SVG paths provided in the prompt */}
    <path d="M12 2l3.09 6.31L22 9.35l-5 4.88 1.18 6.88L12 17.77l-6.18 3.25L7 14.23l-5-4.88 6.91-1.04L12 2z"/>
    <path d="M12 2v5.69l-3 1.4L12 11l3-1.91V2z"/>
    <path d="M12 17.77v4.23l-6.18-3.25L7 14.23l5 3.54z"/>
    <path d="M19 14.23l1.18 6.88L12 17.77v-4.23l5-3.54z"/>
    <path d="M7 14.23l-5 4.88 6.91 1.04L12 22l3.09-1.73L7 14.23z"/>
  </svg>
);

TokenIcon.displayName = "TokenIcon"; // For better debugging in React DevTools

// Optional: Export as default if it's the only export
// export default TokenIcon;