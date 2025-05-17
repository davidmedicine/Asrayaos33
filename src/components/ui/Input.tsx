// src/components/ui/Input.tsx
// Enhanced input component with improved styling, validation, and accessibility

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Define input variants using cva
const inputVariants = cva(
  [
    "w-full px-3 py-2 border rounded-md",
    "bg-[var(--bg-surface)] text-[var(--text-default)]",
    "placeholder:text-[var(--text-muted)] placeholder:opacity-70",
    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "shadow-[var(--shadow-inset-sm)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--agent-color-primary)] focus:border-[var(--agent-color-primary)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "file:text-[var(--agent-color-primary)] file:cursor-pointer",
  ].join(' '),
  {
    variants: {
      variant: {
        default: "border-[var(--border-muted)]",
        agent: "border-[var(--agent-color-border)]",
        faded: "border-[var(--border-muted)] bg-[color-mix(in_oklch,var(--bg-surface)_80%,black)]",
      },
      size: {
        sm: "h-8 text-xs rounded px-2 py-1",
        md: "h-10 text-sm rounded-md px-3 py-2",
        lg: "h-12 text-base rounded-lg px-4 py-2.5",
      },
      state: {
        default: "",
        error: "border-[var(--color-danger-red-500)] focus:ring-[var(--color-danger-red-500)] focus:border-[var(--color-danger-red-500)]",
        success: "border-[var(--color-success-green-500)] focus:ring-[var(--color-success-green-500)] focus:border-[var(--color-success-green-500)]",
      },
      withIcon: {
        left: "pl-9",
        right: "pr-9",
        both: "pl-9 pr-9",
        none: "",
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      state: "default",
      withIcon: "none",
      fullWidth: true,
    },
  }
);

export interface InputProps 
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  /** Text label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Success message displayed below the input */
  success?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Icon displayed inside the input on the left */
  leftIcon?: React.ReactNode;
  /** Icon displayed inside the input on the right */
  rightIcon?: React.ReactNode;
  /** Used to associate the input with other elements */
  inputId?: string;
  /** Wrapper class for the entire input component */
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    label,
    error,
    success,
    helperText,
    leftIcon,
    rightIcon,
    inputId,
    wrapperClassName,
    variant,
    size,
    state: externalState,
    withIcon: externalWithIcon,
    fullWidth,
    placeholder,
    id,
    ...props 
  }, ref) => {
    // Determine input ID for accessibility
    const uniqueId = React.useId();
    const resolvedId = inputId || id || uniqueId;
    
    // Determine state (error takes precedence over success)
    const state = error ? "error" : success ? "success" : externalState;
    
    // Determine withIcon based on provided icons
    const withIcon = externalWithIcon || (
      leftIcon && rightIcon ? "both" : 
      leftIcon ? "left" : 
      rightIcon ? "right" : 
      "none"
    );

    // Feedback ID for accessibility
    const feedbackId = error || success || helperText 
      ? `${resolvedId}-feedback`
      : undefined;

    return (
      <div className={cn("w-full", wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={resolvedId}
            className="block mb-1.5 text-sm font-medium text-[var(--text-default)]"
          >
            {label}
          </label>
        )}

        {/* Input wrapper with icons */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            id={resolvedId}
            ref={ref}
            className={cn(inputVariants({ variant, size, state, withIcon, fullWidth, className }))}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={feedbackId}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Feedback text - error, success, or helper */}
        {(error || success || helperText) && (
          <p 
            id={feedbackId}
            className={cn(
              "mt-1.5 text-sm",
              error ? "text-[var(--color-danger-red-500)]" : 
              success ? "text-[var(--color-success-green-500)]" : 
              "text-[var(--text-muted)]"
            )}
          >
            {error || success || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { inputVariants };