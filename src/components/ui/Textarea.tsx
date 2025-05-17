// === File: asrayaos3.4/src/components/ui/Textarea.tsx ===

'use client';

/**
 * Textarea.tsx
 * A reusable, accessible textarea component with label, error handling,
 * flexible styling, and support for standard HTML attributes.
 * Uses theme variables for styling.
 * (v10.8 - Final Polish)
 */

import React, { useId } from 'react';
import { cn } from '@/lib/utils'; // Class utility for merging styles

// --- Component Props ---
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Optional label text displayed above the textarea. */
  label?: string;
  /** Optional class name to apply specifically to the label element. */
  labelClassName?: string; // (#2 - Label Styling Flexibility)
  /** If provided (string or true), displays an error message below and applies error styling. */
  error?: string | boolean;
  /** Optional custom class name to apply to the textarea element itself. */
  className?: string;
  /** Optional wrapper class name for the entire component (label + textarea + error). */
  wrapperClassName?: string;
  /** Explicit ID, auto-generated if not provided. */
  id?: string;
}

// Default error message when error prop is true
const DEFAULT_ERROR_MESSAGE = "This field has an error."; // Or "Input required."

// --- Textarea Component ---

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
        className,
        label,
        labelClassName, // Destructure new prop
        error,
        id: propId,
        wrapperClassName,
        placeholder,
        ...props // Spread remaining standard textarea attributes (required, maxLength, rows etc.)
    },
    ref
  ) => {
    // Auto-generate ID for accessibility linking if not provided
    const internalId = useId();
    const id = propId || internalId;
    // Generate ID for error message linking
    const errorId = error ? `${id}-error` : undefined;
    // Determine error message content (#1 - Error Message Handling)
    const errorMessage = typeof error === 'string' ? error : (error === true ? DEFAULT_ERROR_MESSAGE : undefined);

    // Use provided placeholder or auto-generate from label if needed (#4 - Placeholder Text)
    // Explicit placeholder takes precedence
    const actualPlaceholder = placeholder ?? (label ? `Enter ${label.toLowerCase()}...` : "");

    return (
      <div className={cn("w-full", wrapperClassName)}>
        {/* Label - linked to textarea via htmlFor */}
        {label && (
          <label
            htmlFor={id}
            // Added labelClassName prop (#2)
            className={cn(
                "block text-sm font-medium text-text-default mb-1.5",
                // Example: Optional heavier weight: 'font-semibold',
                labelClassName
            )}
          >
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          className={cn(
            // Base styles
            "w-full px-3 py-2 rounded-md border shadow-sm transition-colors duration-150 ease-out",
            // Sizing & Resize Behavior (#3 - Responsive Height)
            "min-h-[100px] max-h-[300px] resize-y", // Added max-height
            "text-sm",
            // Theme colors using CSS Variables
            "bg-[var(--bg-surface)]",
            "text-[var(--text-default)]",
            "placeholder:text-text-muted",
            // Focus styles (using focus-visible for accessibility)
            "focus:outline-none focus-visible:outline-none focus-visible:ring-2",
            // Error vs Normal state styling
            error
              ? "border-[var(--color-error)] focus-visible:ring-[var(--color-error)]" // Error state
              : "border-[var(--border-default)] focus-visible:border-[var(--agent-color-primary)] focus-visible:ring-[var(--agent-color-primary)]", // Normal state
            // Disabled styles
             "disabled:cursor-not-allowed disabled:opacity-60",
            // Merge external classes last
            className
          )}
          placeholder={actualPlaceholder}
          // --- Accessibility Attributes ---
          aria-invalid={!!error} // True if error is present (string or boolean true)
          aria-describedby={errorId} // Link to error message ID if error exists
          // Spread other props like required, maxLength, rows, name, etc.
          {...props}
        />
        {/* Error Message - Conditionally rendered with ARIA attributes */}
        {errorMessage && (
            <p
                id={errorId} // Linked by aria-describedby
                className="mt-1.5 text-xs text-[var(--color-error)]"
                role="alert" // Implicitly assertive for errors
                aria-live="assertive" // Ensure announcement on appearance
            >
                {errorMessage}
            </p>
        )}
        {/* Component Documentation Comments (#5):
            - `id` and `htmlFor` ensure label association.
            - `aria-invalid` signals error state to assistive tech.
            - `aria-describedby` links input to specific error message.
            - `aria-live` makes error messages announce immediately.
            - Error styling relies on --color-error CSS variable.
            - Base component styling uses theme variables (--bg-surface, --border-default, etc.).
            - Optional Enhancements: Consider label animations or more resize options if needed.
        */}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Ensure file ends with a newline