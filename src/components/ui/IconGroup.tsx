import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

// Define icon group variants
const iconGroupVariants = cva(
  "inline-flex items-center",
  {
    variants: {
      spacing: {
        tight: "gap-1",
        default: "gap-2",
        loose: "gap-3",
        extraLoose: "gap-4",
      },
      alignment: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end", 
        between: "justify-between",
        around: "justify-around",
        evenly: "justify-evenly",
      },
      orientation: {
        horizontal: "flex-row", 
        vertical: "flex-col",
      },
    },
    defaultVariants: {
      spacing: "default",
      alignment: "center",
      orientation: "horizontal",
    },
  }
);

// Props interface for the IconGroup component
export interface IconGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconGroupVariants> {
  asChild?: boolean;
  children: React.ReactNode;
}

// IconGroup component implementation
export function IconGroup({
  className,
  spacing,
  alignment,
  orientation,
  asChild = false,
  children,
  ...props
}: IconGroupProps) {
  const Comp = asChild ? 'slot' : 'div';
  
  return (
    <Comp
      className={cn(
        iconGroupVariants({ spacing, alignment, orientation }),
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

// Set display name for debugging
IconGroup.displayName = "IconGroup";