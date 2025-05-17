import React, { forwardRef, cloneElement, isValidElement, Children } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/lib/utils/animationUtils'; // Assuming this hook exists and works
import { cva, type VariantProps } from 'class-variance-authority';

// --- Constants ---

// Map size variants to pixel dimensions for direct SVG sizing
const sizeMap: Record<NonNullable<IconProps['size']>, number> = {
  xs: 12, // e.g., size-3 tailwind maps roughly to 12px
  sm: 16, // e.g., size-4 tailwind maps roughly to 16px
  md: 20, // e.g., size-5 tailwind maps roughly to 20px
  lg: 24, // e.g., size-6 tailwind maps roughly to 24px
  xl: 32, // e.g., size-8 tailwind maps roughly to 32px
};

// --- CVA Variants ---

const iconVariants = cva(
  // Base styles for the wrapper span
  'inline-flex shrink-0 items-center justify-center align-middle leading-none', // Added align/leading for consistency
  {
    variants: {
      // Wrapper span sizes (controls the container)
      size: {
        xs: 'size-3',
        sm: 'size-4',
        md: 'size-5',
        lg: 'size-6',
        xl: 'size-8',
      },
      // Emphasis styles for the wrapper span
      emphasis: {
        low: 'opacity-50',
        medium: 'opacity-70',
        high: 'opacity-100', // Or remove if default is opacity 1
      },
      // Animation variants (applied conditionally to the span)
      animation: {
        none: '',
        pulse: 'animate-pulse',
        spin: 'animate-spin',
        bounce: 'animate-bounce',
      },
    },
    defaultVariants: {
      size: 'md',
      emphasis: 'high',
      animation: 'none',
    },
  }
);

// --- Component Props ---

// Extend base HTML span props, include CVA variants, and specific Icon props
// Use React.ComponentPropsWithoutRef<'span'> for better ref compatibility
export interface IconProps
  extends Omit<React.ComponentPropsWithoutRef<'span'>, 'children' | 'className'>, // Omit handled props
    VariantProps<typeof iconVariants> {
  /**
   * The SVG icon element or other content to display.
   * It's recommended to directly pass an imported SVG component:
   * e.g., import { Zap } from 'lucide-react'; <Icon><Zap /></Icon>
   * This ensures better tree-shaking.
   */
  children: React.ReactNode;
  /** Optional className to apply to the wrapper span element */
  className?: string;
  /**
   * Direct control over the SVG's stroke color, passed down to the child SVG.
   * Defaults to 'currentColor'.
   */
  stroke?: string; // Keep string only for consistency with SVG attributes
  /**
   * Direct control over the SVG's fill color, passed down to the child SVG.
   * Use 'none' for no fill.
   */
  fill?: string;
  /**
   * Direct control over the SVG's stroke-width, passed down to the child SVG.
   */
  strokeWidth?: string | number;

  // Note: `asChild` prop is removed as the logic now focuses on cloning SVG children.
  // If needed for other use cases, it could be added back with careful consideration.
}

// --- Icon Component Implementation ---

/**
 * Renders an Icon component, applying styling variants and accessibility attributes.
 * It wraps the provided children (ideally a single SVG element) in a styled span.
 *
 * @example Tree-shaking friendly usage with lucide-react
 * import { ArrowRight } from 'lucide-react';
 * <Icon size="sm" aria-label="Go forward"><ArrowRight /></Icon>
 *
 * @performance Note: Animations are applied via Tailwind CSS classes (`animate-*`).
 * This component itself does not introduce animation libraries like GSAP,
 * keeping the base component lightweight.
 */
export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  (
    {
      className,
      size = 'md', // Ensure default for sizeMap lookup
      emphasis,
      animation = 'none',
      children,
      // Extract SVG-specific props to pass down
      stroke = 'currentColor', // Default stroke to currentColor
      fill = 'none', // Default fill to none
      strokeWidth,
      // Extract a11y props to check their presence
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      // Gather remaining props for the span wrapper
      ...restProps
    },
    ref
  ) => {
    // Check user's motion preferences
    const prefersReducedMotion = usePrefersReducedMotion();

    // Determine animation class based on props and motion preference
    const animationClass =
      !prefersReducedMotion && animation !== 'none'
        ? iconVariants({ animation }) // Get the class from CVA definition
        : '';

    // Determine a11y attributes for the wrapper span
    const accessibilityProps = {
      role: 'img',
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      // Hide from screen readers if not explicitly labelled
      'aria-hidden': !ariaLabel && !ariaLabelledby ? true : undefined,
    };

    // Attempt to get the single child element
    const child = Children.only(children);
    let renderedChildren = children; // Default to passing children through

    // If the single child is a valid React element (likely an SVG), clone it with props
    if (isValidElement(child)) {
      const computedSize = sizeMap[size]; // Get pixel size from map

      renderedChildren = cloneElement(
        child as React.ReactElement<any>, // Type assertion needed for cloneElement
        {
          // Apply explicit width/height for stable rendering (replaces size-full)
          width: computedSize,
          height: computedSize,
          // Apply SVG-specific props passed to Icon
          stroke: stroke,
          fill: fill,
          strokeWidth: strokeWidth,
          // Ensure SVG is not focusable in older browsers
          focusable: false,
          // Preserve the child's original className if any
          className: cn(
            // Add any *necessary* base classes for the SVG itself here, if applicable
            // e.g., 'stroke-current' could be a default if not overridden by props
            (child as React.ReactElement).props.className
          ),
          // Important: Avoid spreading ...restProps here, those are for the span
        }
      );
    }

    return (
      <span
        ref={ref}
        className={cn(
          // Apply base, size, and emphasis variants directly
          iconVariants({ size, emphasis, animation: 'none' }), // Use 'none' here, animationClass is separate
          // Apply conditional animation class
          animationClass,
          // Apply user-provided className
          className
        )}
        {...accessibilityProps} // Apply computed accessibility attributes
        {...restProps} // Spread remaining props onto the span
      >
        {renderedChildren}
      </span>
    );
  }
);

Icon.displayName = 'Icon'; // Set display name for React DevTools