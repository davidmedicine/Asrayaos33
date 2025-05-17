/**
 * File: src/components/panels/PanelGroup/subcomponents/FloatingPad.tsx
 * Description: Renders a visually distinct container with a translucent "glass" effect,
 * depth shadows, and optional active state highlighting. Designed to wrap
 * panel content, leveraging CSS variables for theming.
 *
 * Version: 2.0.0
 * Date: 2025-05-04
 * Engineer: Gemini AI (as World Class Engineer)
 * Changes:
 * - Refactored `cn` call for improved readability and maintainability.
 * - Enhanced comments for clarity on styling intent.
 * - Ensured adherence to best practices (forwardRef, displayName).
 */
'use client';

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// --- Component Props Interface ---

export interface FloatingPadProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * If true, applies a distinct highlight style (typically an accent border/shadow)
   * to indicate this pad is the primary focus among its siblings.
   * @default false
   */
  isActive?: boolean;

  /**
   * Optional data attribute useful for targeting specific pads in testing
   * or diagnostics. Typically corresponds to the panel's ID.
   */
  ['data-panel-id']?: string;

  /**
   * The content to be rendered within the padded area of the component.
   */
  children: ReactNode;
}

// --- Component Implementation ---

export const FloatingPad = forwardRef<HTMLDivElement, FloatingPadProps>(
  (
    {
      className, // Allow consumers to add custom classes
      children,
      isActive = false, // Default isActive to false
      ...rest // Pass through any other standard HTML attributes
    },
    ref,
  ) => {
    // Define class groups for better readability and management
    const baseClasses = [
      'relative flex flex-col h-full w-full', // Core layout: relative container, full size, column flex
      'overflow-hidden', // Ensure content clipping respects rounded corners
      'rounded-[var(--panel-radius)]', // Apply panel rounding via CSS variable
      'bg-[var(--bg-surface)]/[0.45]', // Translucent background color (adjust opacity as needed)
      'backdrop-blur-[var(--panel-blur)]', // Apply background blur effect
      'shadow-[var(--shadow-l1)]', // Base shadow for depth (Level 1)
      // Apply a subtle inner border/stroke using a pseudo-element to avoid extra divs
      'before:absolute before:inset-0 before:pointer-events-none', // Position pseudo-element
      'before:rounded-[inherit]', // Match parent rounding
      'before:shadow-[var(--panel-inner-stroke)]', // Define the inner stroke style via shadow
    ];

    const interactiveClasses = [
      'transition-shadow duration-200 ease-out', // Smoothly transition shadow changes (hover, focus, active)
      // Hover state: Apply a subtle accent shadow combined with the base shadow
      'hover:shadow-[0_0_0_1px_var(--agent-color-primary)/40,var(--shadow-l1)]',
      // Focus-visible state: Apply a clear accent shadow for accessibility
      'focus-visible:shadow-[0_0_0_1.5px_var(--agent-color-primary),var(--shadow-l1)]',
    ];

    // Active state: Apply a prominent accent shadow when the panel is active
    // Note: CSS specificity should ensure this overrides hover/focus if defined similarly
    const activeClasses = isActive
      ? 'shadow-[0_0_0_1.5px_var(--agent-color-primary),var(--shadow-l1)]'
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          interactiveClasses,
          activeClasses,
          className, // Append any user-provided classes
        )}
        {...rest} // Spread remaining props onto the outer div
      >
        {/* Inner container responsible for padding the content */}
        <div className="flex-1 min-h-0 overflow-hidden p-3 md:p-4">
          {children}
        </div>
      </div>
    );
  },
);

// Assign a display name for easier debugging in React DevTools
FloatingPad.displayName = 'FloatingPad';

// Provide a default export for convenience
export default FloatingPad;