// src/components/ui/Card.tsx
// Card component with header, content, and footer sections
// Refactored based on feedback (Accessibility, Styling, Props)

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// --- Card Variants ---

// Note: Ensure CSS variables like --shadow-depth, --border-muted, --bg-surface,
// --agent-color-border, --agent-color-surface, --shadow-medium, --shadow-subtle
// are defined in your global styles/theme.

// Note: The use of duration-[var(--duration-fast)] requires safelisting in
// tailwind.config.js if using Tailwind CSS v3 or earlier.
// e.g., safelist: [{ pattern: /duration-\[var\(--duration-fast\)\]/ }]
const cardVariants = cva(
  `rounded-lg overflow-hidden
   border border-[var(--border-muted)]
   bg-[var(--bg-surface)]
   shadow-[var(--shadow-medium)]
   transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]`,
  {
    variants: {
      variant: {
        default: "",
        agent: "border-[var(--agent-color-border)] bg-[var(--agent-color-surface)]",
        elevated: "shadow-[var(--shadow-depth)]",
        // Note: color-mix() with OKLCH has limited support in older browsers (Safari <=17, Firefox <=113).
        // Ensure fallbacks are provided in CSS (e.g., firefox-fallbacks.css).
        subtle: "bg-[color-mix(in_oklch,var(--bg-surface)_90%,black)] shadow-[var(--shadow-subtle)]",
        // Glassmorphic: Requires careful handling for reduced transparency.
        // Ideally, gate backdrop-blur and translucent bg in CSS:
        // @supports (backdrop-filter: blur(10px)) and (prefers-reduced-transparency: no-preference) {
        //   .card-glassmorphic { ... apply blur and translucent bg ... }
        // }
        // Add 'card-glassmorphic' class here instead of inline styles for better fallback.
        glassmorphic: `
          border border-[var(--border-muted)] backdrop-blur-[10px]
          bg-[color-mix(in_oklch,var(--bg-surface)_75%,transparent)]
          shadow-[var(--shadow-subtle)]
        `,
        // Interactive variant implies hover/active states and requires it to be a button or handle key events.
        interactive: `
          cursor-pointer hover:shadow-[var(--shadow-depth)]
          hover:border-[var(--agent-color-border)]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] // Added focus style
          active:translate-y-[1px] active:shadow-[var(--shadow-subtle)]
        `,
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
      // 'withHoverEffect' was removed and folded into 'interactive' variant
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
    // Example of compound variant if needed later:
    // compoundVariants: [
    //   { variant: "interactive", className: "..." }, // Define base interactive styles
    //   { variant: ["interactive", "elevated"], className: "..." } // Override/combine if needed
    // ],
  }
);

// --- Card Header Variants ---
const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      padding: {
        none: "",
        sm: "px-3 pt-3",
        md: "px-4 pt-4",
        lg: "px-6 pt-6",
      },
      withBorder: {
        true: "pb-3 border-b border-[var(--border-muted)]",
        false: "",
      },
    },
    defaultVariants: {
      padding: "md",
      withBorder: false,
    },
  }
);

// --- Card Content Variants ---
const cardContentVariants = cva(
  "", // Base styles for content if any
  {
    variants: {
      padding: {
        none: "",
        sm: "px-3 py-2",
        md: "px-4 py-3",
        lg: "px-6 py-4",
      },
    },
    defaultVariants: {
      padding: "md",
    },
  }
);

// --- Card Footer Variants ---
const cardFooterVariants = cva(
  "flex flex-row items-center",
  {
    variants: {
      padding: {
        none: "",
        sm: "px-3 pb-3",
        md: "px-4 pb-4",
        lg: "px-6 pb-6",
      },
      withBorder: {
        true: "pt-3 border-t border-[var(--border-muted)]",
        false: "",
      },
      alignment: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
      },
    },
    defaultVariants: {
      padding: "md",
      withBorder: false,
      alignment: "between",
    },
  }
);


// --- Card Component ---

export interface CardProps
  extends React.HTMLAttributes<HTMLElement>, // Use HTMLElement for button/div flexibility
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
  /**
   * If true, renders the card with role="region" and requires aria-labelledby.
   * Use this for cards that represent a distinct section of content.
   */
  semantic?: boolean;
  /**
   * Required when semantic={true}. Provides the ID of the element (usually CardTitle)
   * that labels this card region.
   */
  'aria-labelledby'?: string; // Use React's convention for ARIA props
}

export const Card = React.forwardRef<HTMLElement, CardProps>( // Use HTMLElement
  (
    {
      className,
      variant,
      padding,
      asChild = false,
      semantic = false,
      // Removed withHoverEffect, now handled by variant='interactive'
      // Removed innerCardRef, use standard ref for the root element
      children,
      ...props
    },
    ref // This ref now correctly targets the root element (Comp)
  ) => {
    // Render as button if interactive and not using asChild, otherwise div
    const isInteractive = variant === 'interactive';
    const Comp = asChild ? Slot : isInteractive ? 'button' : 'div';

    // Validate semantic props
    if (semantic && !props['aria-labelledby']) {
      console.warn(
        'Card: semantic={true} requires the `aria-labelledby` prop to be set.'
      );
    }
    if (isInteractive && Comp === 'button' && props.onClick === undefined) {
        console.warn(
          'Card: variant="interactive" is rendered as a <button>, but no onClick handler was provided.'
        )
    }
     if (isInteractive && asChild) {
        console.warn(
          'Card: variant="interactive" with asChild={true}. Ensure the child element is inherently interactive (like a button or link) or manually handles focus and keyboard events (Enter/Space).'
        )
    }


    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, padding, className }))}
        // Add role="region" and aria-labelledby if semantic
        role={semantic ? 'region' : (isInteractive && Comp === 'button' ? 'button' : undefined)}
        aria-labelledby={semantic ? props['aria-labelledby'] : undefined}
        // Add type="button" if it's a button to prevent form submission
        type={isInteractive && Comp === 'button' ? 'button' : undefined}
        // Spread remaining props
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Card.displayName = 'Card';


// --- Card Header Component ---

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding, withBorder, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardHeaderVariants({ padding, withBorder, className }))}
        {...props}
      />
    );
  }
);
CardHeader.displayName = 'CardHeader';


// --- Card Title Component ---

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  return (
    // Add tabIndex={-1} to allow programmatic focus (e.g., for skip links)
    // Ensure you provide an `id` to this component if used with Card's `semantic` prop.
    <h3
      ref={ref}
      tabIndex={-1}
      className={cn("text-lg font-semibold text-[var(--text-heading)]", className)}
      {...props}
    >
      {children}
    </h3>
  );
});
CardTitle.displayName = 'CardTitle';


// --- Card Description Component ---

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-[var(--text-muted)]", className)}
      {...props}
    />
  );
});
CardDescription.displayName = 'CardDescription';


// --- Card Content Component ---

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardContentVariants({ padding, className }))}
        {...props}
      />
    );
  }
);
CardContent.displayName = 'CardContent';


// --- Card Footer Component ---

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding, withBorder, alignment, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardFooterVariants({ padding, withBorder, alignment, className }))}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';


// --- Exports ---

// Export sub-components first for easier top-level Card import discoverability
export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

// Export variants last
export {
  cardVariants,
  cardHeaderVariants,
  cardContentVariants,
  cardFooterVariants
};