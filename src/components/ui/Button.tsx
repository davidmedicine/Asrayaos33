// src/components/ui/Button.tsx
// Enhanced button component with variants, loading states, icon support, and accessibility features.

import React, { forwardRef, useEffect, cloneElement } from 'react'; // Keep useEffect for dev warning
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
// Assuming Icon component is updated and available
import { Icon, IconProps } from './Icon';
// Import the canonical hook for runtime checks (needed for tests/consistency)
import { usePrefersReducedMotion } from '@/lib/utils/animationUtils';

// --- Configuration & Mappings ---

// Defines the mapping from button size prop to the size prop of the child Icon component.
// Rationale: Provides default icon sizes relative to button sizes for consistency.
const iconComponentSizeMap: Record<NonNullable<ButtonProps['size']>, IconProps['size']> = {
  xs: 'xs',
  sm: 'sm',
  default: 'sm', // Default buttons use small icons
  lg: 'md',     // Large buttons use medium icons
  xl: 'md',      // Extra-large buttons also use medium icons
};

// Defines the specific Tailwind size/padding classes for icon-only buttons.
// Moved near the mapping for easier maintenance.
// Ensure these classes are in Tailwind's safelist if not statically detectable.
const iconOnlySizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: "size-8 p-1.5 rounded-md",
  sm: "size-9 p-2 rounded-md",
  default: "size-10 p-2.5 rounded-md",
  lg: "size-11 p-3 rounded-md",
  xl: "size-12 p-3.5 rounded-lg",
};

// --- CVA Variants ---

const buttonVariants = cva(
  // Base styles: Using arrays for better JIT compatibility.
  // Reverted to standard Tailwind focus-visible classes until focus-ring-agent is globally available.
  [
    "inline-flex items-center justify-center relative whitespace-nowrap rounded-md font-medium",
    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    // Standard focus ring using CSS variables - ensure these vars are defined!
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agent-color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-body)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-px", // Subtle press effect
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--agent-color-primary)] text-white",
          "hover:bg-[color-mix(in_oklch,var(--agent-color-primary)_95%,white)]",
          "shadow-sm hover:shadow-[var(--glow-primary-xs)]",
          "disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-disabled)] disabled:shadow-none",
        ],
        destructive: [
          "bg-[var(--color-danger-red-500)] text-white",
          "hover:bg-[color-mix(in_oklch,var(--color-danger-red-500),black_10%)]",
          "shadow-sm",
          "disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-disabled)] disabled:shadow-none",
        ],
        outline: [ // Removed focus-visible from here, handled by base
          "border border-[var(--border-default)] bg-transparent text-[var(--text-default)]",
          "hover:bg-[var(--agent-color-surface)] hover:text-[var(--agent-color-text-accent)]",
          "hover:border-[var(--agent-color-border,var(--border-default))]",
          "disabled:text-[var(--text-disabled)] disabled:border-[var(--border-muted)]",
        ],
        secondary: [
          "bg-[var(--bg-muted)] text-[var(--text-default)]",
          "hover:bg-[var(--bg-subtle)]",
          "border border-[var(--border-default)]",
          "disabled:text-[var(--text-disabled)] disabled:border-[var(--border-muted)]",
        ],
        ghost: [
          "bg-transparent text-[var(--text-default)]",
          "hover:bg-[var(--agent-color-surface)] hover:text-[var(--agent-color-text-accent)]",
          "disabled:text-[var(--text-disabled)]",
        ],
        link: [
          "text-[var(--agent-color-primary)] underline-offset-4",
          "hover:underline",
          "disabled:text-[var(--text-disabled)]",
        ],
      },
      size: {
        xs: "h-8 px-2.5 text-xs rounded",
        sm: "h-9 px-3 text-sm rounded-md",
        default: "h-10 px-4 text-sm rounded-md",
        lg: "h-11 px-5 text-base rounded-md",
        xl: "h-12 px-6 text-base rounded-lg",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
);

// --- Component Props ---

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, 'iconOnly'> { // Omit internal-only variants if any
  asChild?: boolean;
  isLoading?: boolean;
  startIcon?: React.ReactElement<IconProps>;
  endIcon?: React.ReactElement<IconProps>;
  iconOnly?: boolean;
}

// --- Button Component ---

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size = 'default', // Establish default for lookups
      fullWidth,
      asChild = false,
      isLoading = false,
      disabled,
      startIcon,
      endIcon,
      iconOnly = false,
      children,
      // Extract a11y props safely
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      // Capture remaining props
      ...restProps
    },
    ref
  ) => {
    // Hook to respect user's motion preference at runtime
    const prefersReducedMotion = usePrefersReducedMotion();

    // Dev-time accessibility check for iconOnly buttons
    useEffect(() => {
      // Guard against SSR environments where process might be undefined
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        // Use the destructured variables in the check
        if (iconOnly && !ariaLabel && !children && !ariaLabelledby) {
          console.warn(
            'Warning: Button rendered with `iconOnly` requires accessible text. Provide `children` (visually hidden) or an `aria-label` or `aria-labelledby` prop.'
          );
        }
      }
      // Use stable destructured variables in dependency array
    }, [iconOnly, ariaLabel, children, ariaLabelledby]);

    // Determine the base classes from CVA (no type casts needed)
    const baseClasses = buttonVariants({
      variant,
      size,
      fullWidth,
    });

    // Determine icon-specific size classes if iconOnly is true
    const iconOnlyClasses = iconOnly ? iconOnlySizeClasses[size] : '';

    // Determine the size prop value for internal Icon components, with fallback
    const effectiveIconSize = iconComponentSizeMap[size] || 'sm';

    // Choose the component type (button or Slot)
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(
          baseClasses,
          iconOnly && iconOnlyClasses,
          className // Apply consumer className last for overrides
        )}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? true : undefined}
        aria-label={ariaLabel} // Pass aria-label down
        aria-labelledby={ariaLabelledby} // Pass aria-labelledby down
        {...restProps} // Spread the rest of the props
      >
        {/* Loading Spinner (CSS-based) */}
        {isLoading && (
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              className={cn(
                "size-4 rounded-full border-2 border-current",
                "border-t-transparent border-r-transparent",
                // Apply animation conditionally based on the hook
                !prefersReducedMotion && "animate-spin"
              )}
            />
          </span>
        )}

        {/* Content Wrapper: Hides content visually when loading */}
        <span
          className={cn(
            'inline-flex items-center justify-center gap-2',
            isLoading && 'invisible' // Hide content but keep layout space
          )}
        >
          {/* Start Icon: Clone element, preserving existing className */}
          {startIcon && React.isValidElement(startIcon) && (
            cloneElement(startIcon, {
              size: startIcon.props.size || effectiveIconSize,
              'aria-hidden': true,
              // Preserve original className from the passed icon
              className: cn(startIcon.props.className),
            } as IconProps) // Type assertion needed for cloneElement's generic nature
          )}

          {/* Button Text (Visually Hidden if iconOnly, wrapped for aria-live) */}
          {children && (
            // Apply aria-live only to the text container
            <span
              className={cn(iconOnly && 'sr-only')}
              aria-live={isLoading ? undefined : "polite"} // Announce when text appears (loading finishes)
            >
              {children}
            </span>
          )}

          {/* End Icon: Clone element, preserving existing className */}
          {endIcon && React.isValidElement(endIcon) && (
            cloneElement(endIcon, {
              size: endIcon.props.size || effectiveIconSize,
              'aria-hidden': true,
              // Preserve original className from the passed icon
              className: cn(endIcon.props.className),
            } as IconProps) // Type assertion needed for cloneElement's generic nature
          )}
        </span>
      </Comp>
    );
  }
);

// Place displayName right after the component definition
Button.displayName = 'Button';

// --- Exports ---
// Named exports first for predictable tree-shaking
export { Button, buttonVariants };
export type { ButtonProps };

// --- TODOs ---
// TODO: Define standard focus ring variables (`--agent-color-primary`, `--bg-body`) globally.
// TODO: (Optional) Re-introduce `focus-ring-agent` utility in global CSS and safelist if desired later.
// TODO: Confirm global CSS rule for `.animate-spin` reduced motion is implemented OR rely solely on the component's runtime check.
// TODO: Ensure icon-only size classes (`size-8`, `p-1.5`, etc.) are in Tailwind's safelist if needed.
// TODO: Add Vitest suite (`Button.test.tsx`) using a `renderButton` helper:
//       - Test variants/sizes generate correct classes.
//       - Test `isLoading` sets `disabled`, `aria-busy`, and hides content visually.
//       - Test `disabled` prop sets `disabled` attribute.
//       - Test `iconOnly` applies size classes and `sr-only` to children / requires label.
//       - Test `startIcon`/`endIcon` render and preserve className.
//       - Test `asChild` renders child with correct props/classes.
//       - Mock `usePrefersReducedMotion` to test conditional `animate-spin`.
// TODO: Create/Update Storybook stories (`Button.stories.tsx`):
//       - Add controls for `variant`, `size`, `isLoading`, `disabled`, `fullWidth`, `iconOnly`, `asChild`.
//       - Provide `startIcon`/`endIcon` controls, demonstrating usage with imported Lucide icons (e.g., `<Icon><Zap /></Icon>`).
//       - Include an example `<Button asChild><a href="...">Link</a></Button>` in stories/docs.
// TODO: Add documentation examples for `asChild` usage (e.g., with React Router `<Link>`).