// src/components/ui/Badge.tsx
// Enhanced badge component with improved variants, animation support, and accessibility

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
// Import usePrefersReducedMotion hook (ensure this path is correct)
import { usePrefersReducedMotion } from '@/lib/utils/animationUtils'; 
// Icon import removed as per feedback: Consumers pass the icon node directly.
// import { Icon } from './Icon'; 

// Define badge variants using cva
// Note: Colors are now expected to be defined via CSS variables in global styles
//       (e.g., --badge-default-bg, --badge-default-text, --badge-semantic-positive-bg)
//       to support theming, fallbacks (like for color-mix()), and reduce CSS bundle size.
//       The `color-mix()` examples below are replaced with variable placeholders.
//       Ensure these variables are defined in your global CSS / theme setup.
//       Semantic variants (success, warning, info) are kept distinct for API clarity,
//       but could be refactored using compound variants and a 'status' prop if preferred.
const badgeVariants = cva(
  // Base styles applied to all badges
  [
    "inline-flex items-center justify-center gap-1 rounded-full",
    "text-xs font-medium leading-none",
    // Use design system tokens for transitions
    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]", 
    "border",
    "overflow-hidden", // For animation clipping
  ].join(' '),
  {
    variants: {
      variant: {
        // Default variant using primary agent colors
        default: "badge--variant-default", // Example class, define in CSS: bg-[var(--badge-default-bg)] text-[var(--badge-default-text)] border-[var(--badge-default-border)] hover:bg-[var(--badge-default-hover-bg)]
        // Secondary variant using muted background/text
        secondary: "badge--variant-secondary", // Example class: bg-[var(--badge-secondary-bg)] text-[var(--badge-secondary-text)] border-[var(--badge-secondary-border)] hover:bg-[var(--badge-secondary-hover-bg)]
        // Outline variant using primary agent color for text/border
        outline: "badge--variant-outline", // Example class: bg-transparent text-[var(--badge-outline-text)] border-[var(--badge-outline-border)] hover:bg-[var(--badge-outline-hover-bg)]
        // Destructive variant using danger colors
        destructive: "badge--variant-destructive", // Example class: bg-[var(--badge-destructive-bg)] text-[var(--badge-destructive-text)] border-[var(--badge-destructive-border)] hover:bg-[var(--badge-destructive-hover-bg)]
        // Semantic variants - using placeholder classes assuming CSS definition
        // These classes would set the appropriate --color-{status}-{level} variables internally
        positive: "badge--variant-positive",   // Was 'success'
        warning: "badge--variant-warning",
        info: "badge--variant-info",
      },
      size: {
        xs: "h-4 px-1.5 py-0 text-[10px]",
        sm: "h-5 px-2 py-0.5 text-xs",
        md: "h-6 px-2.5 py-1 text-xs",
        lg: "h-7 px-3 py-1 text-sm",
      },
      interactive: {
        // Add focus-visible styles for keyboard accessibility
        true: [
          "cursor-pointer hover:opacity-90 active:opacity-100",
          // Use design system token for focus ring if available, otherwise fallback
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color,var(--agent-color-primary))] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-color,white)]", 
        ].join(' '),
        false: "",
      },
      removable: {
        // Adjust padding when removable button is present
        true: "pr-1", // Fine-tune padding based on remove button size + desired spacing
        false: "",
      },
      // Internal variant to manage animation state presence safely
      _animated: {
        true: "relative", // Needed for absolute positioning of the shine overlay
        false: "",
      },
      truncate: {
        true: "max-w-[12rem]", // Max width for truncation
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      interactive: false,
      removable: false,
      _animated: false,
      truncate: false, // Default changed from true based on feedback implication
    },
  }
);

// Define component props interface
export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'id'>, // Omit HTML 'id' to manage it internally or via prop
    VariantProps<typeof badgeVariants> {
  /** Content of the badge. */
  children: React.ReactNode;
  /** Optional icon node to display within the badge. */
  icon?: React.ReactNode;
  /** Optional callback function when the remove button is clicked. Requires `removable` to be true. */
  onRemove?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Render as a child component, merging props and styles. */
  asChild?: boolean;
  /** Position of the icon relative to the children. */
  iconPosition?: 'left' | 'right';
  /** 
   * Controls the animation behavior.
   * - `false`: No animation (default).
   * - `'loop'`: A looping shine animation.
   * - `'entry'`: (Future) A one-shot animation on mount. Currently behaves like `false`. 
   */
  animated?: 'entry' | 'loop' | false;
  /** 
   * If true, truncates the badge text content if it exceeds `max-w-[12rem]`. 
   * Provides a `title` attribute automatically for truncated string children.
   * Defaults to `true`. 
   */
  truncate?: boolean;
  /**
   * If true, indicates the badge content represents dynamic information
   * and applies `role="status"` and `aria-live="polite"` for screen readers.
   * Use for things like unread counts or status updates.
   * @default false
   */
  isLive?: boolean;
  /** Optional ID for the badge element, useful for `aria-describedby`. If not provided, a unique ID is generated. */
  id?: string;
}

/**
 * A versatile Badge component implementing design system tokens, accessibility best practices,
 * and optional features like icons, removal, truncation, and animations.
 *
 * Assumes CSS variables for colors and animations are defined globally to support
 * theming, fallbacks, and reduce CSS bundle size.
 */
export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      interactive,
      removable,
      truncate = true, // Default to true as per original code and feedback on title attribute
      icon,
      iconPosition = 'left',
      onRemove,
      children,
      asChild = false,
      animated = false, // Default animation state
      isLive = false, // Default live region state
      id: providedId, // Capture provided ID
      ...props // Pass remaining HTMLDivElement props
    },
    ref
  ) => {
    // Generate a unique ID if none is provided, needed for aria-describedby
    const generatedId = React.useId();
    const badgeId = providedId ?? generatedId;

    // Hook to respect user's motion preference
    const prefersReducedMotion = usePrefersReducedMotion();
    
    // Determine if the looping animation should be enabled
    // TODO: Implement 'entry' animation logic if required in the future.
    const enableLoopAnimation = animated === 'loop' && !prefersReducedMotion;
    
    // Determine the component to render (div or Slot)
    const Comp = asChild ? Slot : 'div';

    // Handle remove button click, stopping propagation
    const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation(); // Prevent badge click if interactive
      onRemove?.(e);
    };

    // Determine accessibility attributes for live regions
    const liveRegionProps = isLive
      ? { role: 'status', 'aria-live': 'polite' }
      : {};

    // Determine title and aria-label for accessibility, especially when truncated
    const accessibilityLabel = typeof children === 'string' ? children : undefined;

    return (
      <Comp
        ref={ref}
        id={badgeId} // Apply the ID to the main element
        className={cn(
          // Apply base and variant styles
          badgeVariants({ 
            variant, 
            size, 
            interactive, 
            removable,
            // Use internal _animated variant based on calculated state
            _animated: enableLoopAnimation, 
            truncate,
            // Merge with consumer-provided class names
            className 
          })
        )}
        // Add title attribute for tooltip, helpful for truncated text
        title={accessibilityLabel} 
        // Add aria-label for screen readers, especially for truncated text
        aria-label={accessibilityLabel} 
        // Apply live region attributes if needed
        {...liveRegionProps}
        // Spread remaining props
        {...props}
      >
        {/* Left-positioned icon */}
        {iconPosition === 'left' && icon && (
          // Use span for inline display, shrink-0 prevents icon squishing
          <span className="shrink-0 inline-flex">{icon}</span> 
        )}

        {/* Badge content area */}
        <span 
          // Apply truncation class directly to the content span
          className={cn(truncate && "truncate")} 
          // Potentially add aria-hidden="true" if content is complex and aria-label is sufficient? Review needed.
        >
          {children}
        </span>

        {/* Right-positioned icon */}
        {iconPosition === 'right' && icon && (
          <span className="shrink-0 inline-flex">{icon}</span>
        )}

        {/* Remove button - rendered only if 'removable' is true */}
        {removable && (
          <button
            type="button" // Essential for accessibility and correct form behavior
            // Use title attribute for mouse users (tooltip)
            title="Remove" 
            // Link button action to the badge content for screen readers
            aria-describedby={badgeId} 
            // Provide a clear label for screen readers
            aria-label="Remove" 
            className={cn(
              // Styling for the remove button
              "ml-0.5 size-3.5 rounded-full flex items-center justify-center shrink-0",
              // Use CSS variables for colors for consistency
              "border-none bg-[var(--badge-remove-button-bg,var(--bg-muted))] hover:bg-[var(--badge-remove-button-hover-bg,var(--bg-subtle))]", 
              "text-[var(--badge-remove-button-text,var(--text-muted))] hover:text-[var(--badge-remove-button-hover-text,var(--text-default))]",
              // Focus styles matching interactive badge wrapper
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color,var(--agent-color-primary))] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-color,white)]",
              // Use design system tokens for transition
              "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]" 
            )}
            onClick={handleRemoveClick}
          >
            {/* Inline SVG for the close icon */}
            <svg 
              width="8" 
              height="8" 
              viewBox="0 0 10 10" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              // Hide decorative icon from screen readers
              aria-hidden="true" 
            >
              <path
                d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5"
                stroke="currentColor" // Inherit color from parent button's text color
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Shine animation overlay - rendered only if loop animation is enabled */}
        {enableLoopAnimation && (
          <span 
            className={cn(
              // Position overlay absolutely within the relative parent
              "absolute inset-0",
              // Use CSS variable for shine color (e.g., defined as rgba(255,255,255,0.2) or color-mix with fallbacks)
              "bg-[var(--badge-shine-color)]", 
              // Apply animation using design system tokens for duration/easing
              // Assumes 'animate-badge-shine' class is defined globally using these tokens
              // and includes '@media (prefers-reduced-motion: reduce) { animation: none; }'
              "animate-badge-shine" 
              // Fallback if 'animate-badge-shine' class is not defined:
              // `animate-[shine_var(--duration-slow)_var(--ease-in-out)]` 
              // Ensure 'shine' keyframes are defined globally.
            )}
            // Hide decorative element from screen readers
            aria-hidden="true" 
          />
        )}
      </Comp>
    );
  }
);

Badge.displayName = 'Badge';

// Export the component and variants type (if needed elsewhere)
export { badgeVariants };

/*
  CSS / Tailwind Configuration Notes (Required external changes):

  1. Define CSS Variables for Colors:
     - In your global CSS (e.g., styles/globals.css), define variables for all badge color aspects:
       --badge-default-bg: var(--agent-color-primary);
       --badge-default-text: white;
       --badge-default-border: transparent;
       --badge-default-hover-bg: color-mix(in oklch, var(--agent-color-primary) 95%, white); // Use appropriate fallback

       --badge-secondary-bg: var(--bg-muted);
       --badge-secondary-text: var(--text-default);
       // ... and so on for secondary, outline, destructive, positive, warning, info variants (bg, text, border, hover-bg)

     - Provide fallbacks for `color-mix()` if needed (e.g., in a separate firefox-fallbacks.css).

  2. Define Variant Classes:
     - Create the classes referenced in `badgeVariants` (e.g., .badge--variant-default) in your global CSS:
       .badge--variant-default {
         background-color: var(--badge-default-bg);
         color: var(--badge-default-text);
         border-color: var(--badge-default-border);
       }
       .badge--variant-default:hover {
         background-color: var(--badge-default-hover-bg);
       }
       // ... define classes for all variants (secondary, outline, destructive, positive, etc.)

  3. Define Animation and Tokens:
     - Define the `--badge-shine-color` variable (e.g., `rgba(255, 255, 255, 0.2)` or safer alternative).
     - Ensure `--duration-slow` and `--ease-in-out` variables exist.
     - Define the `shine` keyframes animation.
     - Define the `animate-badge-shine` utility class in Tailwind config or global CSS:
       @layer utilities {
         .animate-badge-shine {
           animation: shine var(--duration-slow) var(--ease-in-out) infinite; // Adjust 'infinite' if loop isn't desired always
         }
         // Add WCAG recommended media query for prefers-reduced-motion
         @media (prefers-reduced-motion: reduce) {
           .animate-badge-shine {
             animation: none;
           }
         }
       }
       // Or define directly in tailwind.config.js animations theme extension.

  4. Define Focus Ring Variable:
     - Ensure `--focus-ring-color` (or `--agent-color-primary` as fallback) and `--surface-color` (for offset) are defined.

  5. Define Remove Button Colors:
     - Define `--badge-remove-button-*` variables as needed.
*/